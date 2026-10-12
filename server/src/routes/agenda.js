import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { google } from 'googleapis';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();
const prisma = new PrismaClient();

const PLAN_LIMITS = { start: 1, performance: 3 };
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'estefygregory@gmail.com';

const DAY_FULL_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Identify weeks by a YYYY-MM-DD string (timezone-independent).
// Client sends the local Monday's date string; we store it as UTC midnight.
function weekKeyToDate(key) {
  // key = "YYYY-MM-DD"
  return new Date(key + 'T00:00:00.000Z');
}

function getServerWeekKey() {
  // Fallback if client doesn't send weekKey (UTC Monday)
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) return null;
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

async function createMeetLink(username, slot, weekKey) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return null;
  const calendar = getCalendarClient();
  if (!calendar) return null;

  try {
    const weekMonday = new Date(`${weekKey}T00:00:00.000Z`);
    const slotDate = new Date(weekMonday);
    const offset = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1;
    slotDate.setUTCDate(slotDate.getUTCDate() + offset);

    const [h, m] = slot.time.split(':').map(Number);
    const startDate = new Date(slotDate);
    startDate.setUTCHours(h, m, 0, 0);
    const endDate = new Date(startDate);
    endDate.setUTCMinutes(endDate.getUTCMinutes() + 60);

    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Llamada Tryhard — ${username}`,
        description: `Llamada de seguimiento con ${username}`,
        start: { dateTime: startDate.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
        end:   { dateTime: endDate.toISOString(),   timeZone: 'America/Argentina/Buenos_Aires' },
        conferenceData: {
          createRequest: {
            requestId: `tryhard-${username}-${weekKey}-${slot.id}`,
          },
        },
      },
    });

    const meetLink = response.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri ?? null;
    console.log('Google Meet creado:', meetLink, '| conferenceData:', JSON.stringify(response.data.conferenceData));
    return meetLink;
  } catch (err) {
    console.error('Error creando Google Meet:', err.message, err.response?.data);
    return null;
  }
}

async function sendBookingEmail(username, slot, weekKey, meetUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // silently skip if not configured

  try {
    const resend = new Resend(apiKey);
    const dayName = DAY_FULL_ES[slot.dayOfWeek];
    const [y, m, d] = weekKey.split('-');
    // Compute actual date for that day-of-week within the week
    const weekMonday = new Date(`${weekKey}T00:00:00.000Z`);
    const slotDate = new Date(weekMonday);
    slotDate.setUTCDate(slotDate.getUTCDate() + (slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1));
    const dateStr = `${slotDate.getUTCDate()}/${slotDate.getUTCMonth() + 1}/${slotDate.getUTCFullYear()}`;

    await resend.emails.send({
      from: 'Tryhard Training <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: `Nueva reserva — ${username} · ${dayName} ${slot.time}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#e01020">Nueva reserva de llamada</h2>
          <p><strong>Alumno:</strong> ${username}</p>
          <p><strong>Día:</strong> ${dayName} ${dateStr}</p>
          <p><strong>Hora:</strong> ${slot.time} hs</p>
          ${meetUrl ? `<p><strong>Meet:</strong> <a href="${meetUrl}">${meetUrl}</a></p>` : ''}
          <hr style="border:none;border-top:1px solid #333;margin:20px 0">
          <p style="color:#888;font-size:12px">Tryhard Training · agenda automática</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Error enviando email:', err.message);
  }
}

// ── Student routes ────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  const weekKey = req.query.weekKey || getServerWeekKey();
  const weekStart = weekKeyToDate(weekKey);

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

  res.json({ slots, myBookings, plan, maxCalls, weekKey });
});

router.post('/book/:slotId', requireAuth, async (req, res) => {
  const weekKey = req.body.weekKey || getServerWeekKey();
  const weekStart = weekKeyToDate(weekKey);

  const [user, slot] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id }, select: { plan: true, username: true } }),
    prisma.agendaSlot.findUnique({ where: { id: req.params.slotId } })
  ]);

  if (!slot || !slot.isActive) return res.status(404).json({ error: 'Horario no disponible' });

  const plan = user?.plan || 'start';
  const maxCalls = PLAN_LIMITS[plan] ?? 1;

  const usedThisWeek = await prisma.agendaBooking.count({
    where: { userId: req.user.id, weekStart }
  });

  if (usedThisWeek >= maxCalls) {
    return res.status(400).json({
      error: `Tu plan ${plan === 'performance' ? 'Performance' : 'Start'} permite máximo ${maxCalls} llamada${maxCalls > 1 ? 's' : ''} por semana`
    });
  }

  try {
    // Generate Meet link before creating booking (fails gracefully)
    const meetUrl = await createMeetLink(user.username, slot, weekKey);

    const booking = await prisma.agendaBooking.create({
      data: { userId: req.user.id, slotId: req.params.slotId, weekStart, meetUrl: meetUrl || null },
      include: { slot: true }
    });

    // Fire-and-forget email
    sendBookingEmail(user.username, slot, weekKey, meetUrl);

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

router.post('/admin/slots/range', requireAdmin, async (req, res) => {
  const { dayOfWeek, startTime, endTime, intervalMinutes = 40 } = req.body;
  if (dayOfWeek === undefined || !startTime || !endTime)
    return res.status(400).json({ error: 'Día, hora inicio y hora fin requeridos' });

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin   = eh * 60 + em;
  const interval = Math.max(5, Math.min(240, Number(intervalMinutes)));

  if (startMin >= endMin) return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la de fin' });

  const times = [];
  for (let t = startMin; t <= endMin; t += interval) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  const created = await Promise.all(
    times.map(time =>
      prisma.agendaSlot.upsert({
        where: { dayOfWeek_time: { dayOfWeek: Number(dayOfWeek), time } },
        update: { isActive: true },
        create: { dayOfWeek: Number(dayOfWeek), time }
      })
    )
  );

  res.json({ created: created.length, times });
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
  const weekKey = req.query.weekKey || getServerWeekKey();
  const weekStart = weekKeyToDate(weekKey);
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
