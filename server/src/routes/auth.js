import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.patch('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 4)
    return res.status(400).json({ error: 'Datos inválidos' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || user.password !== currentPassword)
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });

  await prisma.user.update({ where: { id: req.user.id }, data: { password: newPassword } });
  res.json({ ok: true });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.password !== password)
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
});

export default router;
