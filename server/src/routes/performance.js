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

router.get('/health-correlation', requireAuth, async (req, res) => {
  const [sessions, wellbeingLogs] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId: req.user.id,
        completedAt: { not: null },
        OR: [{ hrAvg: { not: null } }, { sleepHours: { not: null } }],
      },
      orderBy: { completedAt: 'asc' },
    }),
    prisma.wellbeingLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const pairs = [];
  for (const session of sessions) {
    const completedAt = new Date(session.completedAt);
    const windowStart = new Date(completedAt.getTime() - 12 * 60 * 60 * 1000);

    const candidates = wellbeingLogs.filter(l => {
      const t = new Date(l.createdAt).getTime();
      return t >= windowStart.getTime() && t <= completedAt.getTime();
    });
    if (candidates.length === 0) continue;

    const closest = candidates.reduce((prev, curr) =>
      Math.abs(new Date(curr.createdAt) - completedAt) < Math.abs(new Date(prev.createdAt) - completedAt)
        ? curr : prev
    );

    pairs.push({
      date: formatDate(session.completedAt),
      wellbeing: closest.score,
      hrAvg: session.hrAvg,
      hrMax: session.hrMax,
      hrMin: session.hrMin,
      sleepHours: session.sleepHours,
    });
  }

  res.json(pairs);
});

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
