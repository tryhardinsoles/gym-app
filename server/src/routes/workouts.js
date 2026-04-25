import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Guardar feedback de un ejercicio
router.post('/:sessionId/feedback', requireAuth, async (req, res) => {
  const { exerciseId, feedback } = req.body;
  const result = await prisma.exerciseFeedback.upsert({
    where: { exerciseId_sessionId: { exerciseId, sessionId: req.params.sessionId } },
    update: { feedback },
    create: { exerciseId, sessionId: req.params.sessionId, feedback }
  });
  res.json(result);
});

// Completar sesión / rutina
router.post('/:sessionId/complete', requireAuth, async (req, res) => {
  const session = await prisma.workoutSession.findUnique({
    where: { id: req.params.sessionId }
  });
  if (!session || session.userId !== req.user.id)
    return res.status(403).json({ error: 'No autorizado' });

  const now = new Date();
  await prisma.workoutSession.update({
    where: { id: req.params.sessionId },
    data: { completedAt: now }
  });
  await prisma.routine.update({
    where: { id: session.routineId },
    data: { completedAt: now }
  });

  res.json({ ok: true, completedAt: now });
});

// Obtener última sesión completada (para saber si pasaron 8 horas)
router.get('/last-completed', requireAuth, async (req, res) => {
  const session = await prisma.workoutSession.findFirst({
    where: { userId: req.user.id, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' }
  });
  res.json(session ? { completedAt: session.completedAt } : null);
});

export default router;
