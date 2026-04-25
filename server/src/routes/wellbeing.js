import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.post('/', requireAuth, async (req, res) => {
  const { score } = req.body;
  if (!score || score < 1 || score > 10)
    return res.status(400).json({ error: 'Puntuación debe ser entre 1 y 10' });

  const log = await prisma.wellbeingLog.create({
    data: { userId: req.user.id, score: Number(score) }
  });
  res.json(log);
});

export default router;
