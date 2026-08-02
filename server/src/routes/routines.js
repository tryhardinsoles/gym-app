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
              where: { name: { in: exerciseNames }, weight: { not: null } },
              select: { name: true, weight: true }
            }
          }
        }
      }
    });

    // Primer resultado por nombre = el más reciente
    const lastWeights = {};
    for (const r of completedRoutines) {
      for (const s of r.sections) {
        for (const ex of s.exercises) {
          if (ex.weight?.trim() && !lastWeights[ex.name]) {
            lastWeights[ex.name] = ex.weight;
          }
        }
      }
    }

    // Actualizar en DB y en memoria los ejercicios que tienen peso histórico
    const toUpdate = routine.sections.flatMap(s => s.exercises).filter(ex => lastWeights[ex.name]);
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map(ex => prisma.exercise.update({ where: { id: ex.id }, data: { weight: lastWeights[ex.name] } }))
      );
      for (const ex of toUpdate) ex.weight = lastWeights[ex.name];
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
  const routine = await prisma.routine.findFirst({
    where: { userId: req.user.id, completedAt: null },
    select: { id: true }
  });
  res.json({ hasPending: !!routine });
});

// Historial de rutinas completadas del alumno
router.get('/history', requireAuth, async (req, res) => {
  const routines = await prisma.routine.findMany({
    where: { userId: req.user.id, completedAt: { not: null } },
    orderBy: [{ mes: 'asc' }, { order: 'asc' }],
    select: { id: true, name: true, mes: true, completedAt: true }
  });
  res.json(routines);
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
