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

function parseWeight(str) {
  if (!str) return null;
  const m = str.match(/(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}

function parseReps(str) {
  if (!str) return null;
  const m = str.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// Completar sesión / rutina
router.post('/:sessionId/complete', requireAuth, async (req, res) => {
  const session = await prisma.workoutSession.findUnique({
    where: { id: req.params.sessionId },
    include: {
      routine: {
        include: {
          sections: {
            include: { exercises: true }
          }
        }
      }
    }
  });
  if (!session || (session.userId !== req.user.id && !req.user.isAdmin))
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

  // Log each exercise for performance tracking
  const exercises = session.routine.sections.flatMap(s => s.exercises);
  if (exercises.length > 0) {
    await prisma.exerciseLog.createMany({
      data: exercises.map(ex => ({
        userId: session.userId,
        exerciseId: ex.id,
        sessionId: req.params.sessionId,
        exerciseName: ex.name,
        weight: parseWeight(ex.weight),
        reps: parseReps(ex.repetitions),
        series: ex.series,
        loggedAt: now,
      })),
      skipDuplicates: true,
    });
  }

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
