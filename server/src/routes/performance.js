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
    include: { exercise: { select: { youtubeUrl: true } } },
  });

  const exerciseMap = new Map();
  for (const log of logs) {
    const key = log.exerciseName.toLowerCase().trim();
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, {
        id: key,
        name: log.exerciseName,
        youtubeUrl: log.exercise?.youtubeUrl ?? null,
        logs: [],
      });
    }
    // Keep first non-null youtubeUrl found
    if (!exerciseMap.get(key).youtubeUrl && log.exercise?.youtubeUrl) {
      exerciseMap.get(key).youtubeUrl = log.exercise.youtubeUrl;
    }
    const volume = log.reps != null ? log.reps * log.series : null;
    exerciseMap.get(key).logs.push({
      date: formatDate(log.loggedAt),
      weight: log.weight,
      volume,
    });
  }

  const wellbeingRaw = await prisma.wellbeingLog.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'asc' },
  });

  const wellbeingLogs = wellbeingRaw.map(l => ({
    date: formatDate(l.createdAt),
    score: l.score,
    dayOfWeek: new Date(l.createdAt).getDay(), // 0=Dom
  }));

  res.json({ plan, exercises: Array.from(exerciseMap.values()), wellbeingLogs });
});

export default router;
