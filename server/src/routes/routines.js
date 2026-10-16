import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Obtener rutina actual del alumno (primera no completada, en orden)
router.get('/current', requireAuth, async (req, res) => {
  const routine = await prisma.routine.findFirst({
    where: { userId: req.user.id, completedAt: null },
    orderBy: { order: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { exercises: { orderBy: { order: 'asc' } } }
      }
    }
  });

  if (!routine) return res.json(null);

  // Pre-cargar pesos del último entrenamiento completado donde el ejercicio tenga el mismo nombre
  const exerciseNames = [...new Set(
    routine.sections.flatMap(s => s.exercises.map(e => e.name))
  )];

  if (exerciseNames.length > 0) {
    const completedRoutines = await prisma.routine.findMany({
      where: { userId: req.user.id, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 20,
      select: {
        sections: {
          select: {
            exercises: {
              where: { name: { in: exerciseNames } },
              select: { name: true, weight: true, repetitions: true }
            }
          }
        }
      }
    });

    // Primer resultado por nombre = el más reciente
    const lastWeights = {};
    const lastReps = {};
    for (const r of completedRoutines) {
      for (const s of r.sections) {
        for (const ex of s.exercises) {
          if (ex.weight?.trim() && !lastWeights[ex.name]) {
            lastWeights[ex.name] = ex.weight;
          }
          if (ex.repetitions?.trim() && !lastReps[ex.name]) {
            lastReps[ex.name] = ex.repetitions;
          }
        }
      }
    }

    // Actualizar en DB y en memoria los ejercicios con historial
    const allExercises = routine.sections.flatMap(s => s.exercises);
    const toUpdate = allExercises.filter(ex => lastWeights[ex.name] || lastReps[ex.name]);
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map(ex => {
          const data = {};
          if (lastWeights[ex.name]) data.weight = lastWeights[ex.name];
          if (lastReps[ex.name]) data.repetitions = lastReps[ex.name];
          return prisma.exercise.update({ where: { id: ex.id }, data });
        })
      );
      for (const ex of toUpdate) {
        if (lastWeights[ex.name]) ex.weight = lastWeights[ex.name];
        if (lastReps[ex.name]) ex.repetitions = lastReps[ex.name];
      }
    }

    // Agregar PR histórico (máximo peso/reps registrado en ExerciseLog)
    const prLogs = await prisma.exerciseLog.findMany({
      where: { userId: req.user.id },
      select: { exerciseName: true, weight: true, reps: true }
    });
    const maxW = {}, maxR = {};
    for (const log of prLogs) {
      const k = log.exerciseName.toLowerCase().trim();
      if (log.weight != null && (!maxW[k] || log.weight > maxW[k])) maxW[k] = log.weight;
      if (log.reps   != null && (!maxR[k] || log.reps   > maxR[k])) maxR[k] = log.reps;
    }
    for (const ex of allExercises) {
      const k = ex.name.toLowerCase().trim();
      ex.prWeight = maxW[k] ?? null;
      ex.prReps   = maxR[k] ?? null;
    }
  }

  // Buscar sesión activa o crear una
  let session = await prisma.workoutSession.findFirst({
    where: { userId: req.user.id, routineId: routine.id, completedAt: null },
    include: { feedbacks: true }
  });

  if (!session) {
    session = await prisma.workoutSession.create({
      data: { userId: req.user.id, routineId: routine.id },
      include: { feedbacks: true }
    });
  }

  res.json({ routine, sessionId: session.id, feedbacks: session.feedbacks });
});

// Solo verifica si hay rutina pendiente, sin crear sesión
router.get('/has-pending', requireAuth, async (req, res) => {
  const [routine, pendingCount] = await Promise.all([
    prisma.routine.findFirst({
      where: { userId: req.user.id, completedAt: null },
      orderBy: { order: 'asc' },
      select: { id: true }
    }),
    prisma.routine.count({ where: { userId: req.user.id, completedAt: null } })
  ]);
  res.json({ hasPending: !!routine, pendingCount });
});

// Historial de rutinas completadas del alumno
router.get('/history', requireAuth, async (req, res) => {
  const routines = await prisma.routine.findMany({
    where: { userId: req.user.id, completedAt: { not: null } },
    orderBy: [{ mes: 'asc' }, { order: 'asc' }],
    select: {
      id: true, name: true, mes: true, completedAt: true,
      workoutSessions: {
        where: { completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: { id: true, sleepHours: true, hrMax: true, hrMin: true, hrAvg: true }
      }
    }
  });
  res.json(routines.map(r => {
    const s = r.workoutSessions[0] ?? {};
    return {
      id: r.id, name: r.name, mes: r.mes, completedAt: r.completedAt,
      sessionId: s.id ?? null,
      sleepHours: s.sleepHours ?? null,
      hrMax: s.hrMax ?? null, hrMin: s.hrMin ?? null, hrAvg: s.hrAvg ?? null,
    };
  }));
});

// Actualizar peso o repeticiones de un ejercicio (verifica que pertenezca al alumno)
router.patch('/exercises/:id', requireAuth, async (req, res) => {
  const { weight, repetitions } = req.body;
  const exercise = await prisma.exercise.findFirst({
    where: { id: req.params.id },
    include: { section: { include: { routine: { select: { userId: true } } } } }
  });
  if (!exercise || exercise.section.routine.userId !== req.user.id)
    return res.status(403).json({ error: 'No autorizado' });

  const data = {};
  if (weight !== undefined) data.weight = weight || null;
  if (repetitions !== undefined && repetitions !== '') data.repetitions = repetitions;
  await prisma.exercise.update({ where: { id: req.params.id }, data });
  res.json({ ok: true });
});

export default router;
