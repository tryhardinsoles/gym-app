import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();
const prisma = new PrismaClient();

const PLAN_LIMITS = { start: 1, performance: 3 };

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ── Student routes ────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  const weekStart = getWeekStart();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { plan: true }
  });
  const plan = user?.plan || 'start';
  const maxCalls = PLAN_LIMITS[plan] ?? 1;

  const [slots, myBookings] = await Promise.all([
    prisma.agendaSlot.findMany({
      where: { isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }]
    }),
    prisma.agendaBooking.findMany({
      where: { userId: req.user.id, weekStart },
      include: { slot: true }
    })
  ]);

  res.json({ slots, myBookings, plan, maxCalls, weekStart });
});

router.post('/book/:slotId', requireAuth, async (req, res) => {
  const weekStart = getWeekStart();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { plan: true }
  });
  const plan = user?.plan || 'start';
  const maxCalls = PLAN_LIMITS[plan] ?? 1;

  const myBookingsThisWeek = await prisma.agendaBooking.count({
    where: { userId: req.user.id, weekStart }
  });

  if (myBookingsThisWeek >= maxCalls) {
    return res.status(400).json({ error: `Tu plan ${plan} permite máximo ${maxCalls} llamada${maxCalls > 1 ? 's' : ''} por semana` });
  }

  const slot = await prisma.agendaSlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot || !slot.isActive) return res.status(404).json({ error: 'Horario no disponible' });

  try {
    const booking = await prisma.agendaBooking.create({
      data: { userId: req.user.id, slotId: req.params.slotId, weekStart },
      include: { slot: true }
    });
    res.json(booking);
  } catch {
    res.status(400).json({ error: 'Este horario ya está reservado para esta semana' });
  }
});

router.delete('/booking/:id', requireAuth, async (req, res) => {
  const booking = await prisma.agendaBooking.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!booking) return res.status(403).json({ error: 'No autorizado' });
  await prisma.agendaBooking.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get('/admin/slots', requireAdmin, async (_req, res) => {
  const slots = await prisma.agendaSlot.findMany({
    orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
    include: { _count: { select: { bookings: true } } }
  });
  res.json(slots);
});

router.post('/admin/slots', requireAdmin, async (req, res) => {
  const { dayOfWeek, time, googleMeetUrl } = req.body;
  if (dayOfWeek === undefined || !time) return res.status(400).json({ error: 'Día y hora requeridos' });
  const slot = await prisma.agendaSlot.create({
    data: { dayOfWeek: Number(dayOfWeek), time, googleMeetUrl: googleMeetUrl || null }
  });
  res.json(slot);
});

router.patch('/admin/slots/:id', requireAdmin, async (req, res) => {
  const { dayOfWeek, time, googleMeetUrl, isActive } = req.body;
  const data = {};
  if (dayOfWeek !== undefined) data.dayOfWeek = Number(dayOfWeek);
  if (time !== undefined) data.time = time;
  if (googleMeetUrl !== undefined) data.googleMeetUrl = googleMeetUrl || null;
  if (isActive !== undefined) data.isActive = isActive;
  const slot = await prisma.agendaSlot.update({ where: { id: req.params.id }, data });
  res.json(slot);
});

router.delete('/admin/slots/:id', requireAdmin, async (req, res) => {
  await prisma.agendaBooking.deleteMany({ where: { slotId: req.params.id } });
  await prisma.agendaSlot.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get('/admin/bookings', requireAdmin, async (req, res) => {
  const weekStart = req.query.weekStart ? new Date(req.query.weekStart) : getWeekStart();
  const bookings = await prisma.agendaBooking.findMany({
    where: { weekStart },
    include: {
      user: { select: { id: true, username: true, plan: true } },
      slot: true
    },
    orderBy: [{ slot: { dayOfWeek: 'asc' } }, { slot: { time: 'asc' } }]
  });
  res.json(bookings);
});

export default router;
