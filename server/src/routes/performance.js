import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

function formatDate(d) {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

router.get('/', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { plan: true }
  });

  const plan = user?.plan || 'start';

  const logs = await prisma.exerciseLog.findMany({
    where: { userId: req.user.id },
    orderBy: { loggedAt: 'asc' },
  });

  const exerciseMap = new Map();
  for (const log of logs) {
    if (!exerciseMap.has(log.exerciseId)) {
      exerciseMap.set(log.exerciseId, {
        id: log.exerciseId,
        name: log.exerciseName,
        logs: [],
      });
    }
    const volume = log.reps != null ? log.reps * log.series : null;
    exerciseMap.get(log.exerciseId).logs.push({
      date: formatDate(log.loggedAt),
      weight: log.weight,
      volume,
    });
  }

  res.json({ plan, exercises: Array.from(exerciseMap.values()) });
});

export default router;
