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
