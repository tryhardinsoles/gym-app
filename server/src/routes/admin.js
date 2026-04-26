import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();
const prisma = new PrismaClient();

// Busca el primer video de YouTube para un ejercicio
router.get('/youtube-search', requireAdmin, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Falta el parámetro q' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    const fallback = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' ejercicio')}`;
    return res.json({ url: fallback, isSearch: true });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=video&q=${encodeURIComponent(q + ' ejercicio fitness')}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    const videoId = data.items?.[0]?.id?.videoId;
    if (!videoId) {
      const fallback = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' ejercicio')}`;
      return res.json({ url: fallback, isSearch: true });
    }
    res.json({ url: `https://www.youtube.com/watch?v=${videoId}`, isSearch: false });
  } catch {
    const fallback = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' ejercicio')}`;
    res.json({ url: fallback, isSearch: true });
  }
});

// Listar todos los usuarios
router.get('/users', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, password: true, createdAt: true }
  });
  res.json(users);
});

// Crear usuario
router.post('/users', requireAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  try {
    const user = await prisma.user.create({ data: { username, password } });
    res.json({ id: user.id, username: user.username });
  } catch {
    res.status(400).json({ error: 'El usuario ya existe' });
  }
});

// Eliminar usuario
router.delete('/users/:id', requireAdmin, async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Editar usuario
router.put('/users/:id', requireAdmin, async (req, res) => {
  const { username, password } = req.body;
  const data = {};
  if (username) data.username = username;
  if (password) data.password = password;
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ id: user.id, username: user.username });
  } catch {
    res.status(400).json({ error: 'Error al actualizar usuario' });
  }
});

// Listar rutinas de un usuario
router.get('/users/:id/routines', requireAdmin, async (req, res) => {
  const routines = await prisma.routine.findMany({
    where: { userId: req.params.id },
    orderBy: { order: 'asc' },
    include: {
      sections: { orderBy: { order: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } }
    }
  });
  res.json(routines);
});

// Crear rutina
router.post('/users/:id/routines', requireAdmin, async (req, res) => {
  const { name, sections } = req.body;
  const lastRoutine = await prisma.routine.findFirst({
    where: { userId: req.params.id },
    orderBy: { order: 'desc' }
  });
  const nextOrder = (lastRoutine?.order ?? 0) + 1;

  const routine = await prisma.routine.create({
    data: {
      userId: req.params.id,
      name,
      order: nextOrder,
      sections: {
        create: sections.map((sec, si) => ({
          name: sec.name,
          order: si,
          exercises: {
            create: sec.exercises.map((ex, ei) => ({
              name: ex.name,
              repetitions: ex.repetitions,
              weight: ex.weight || null,
              series: Number(ex.series),
              youtubeUrl: ex.youtubeUrl || null,
              order: ei
            }))
          }
        }))
      }
    },
    include: {
      sections: { include: { exercises: true } }
    }
  });
  res.json(routine);
});

// Actualizar rutina completa
router.put('/routines/:id', requireAdmin, async (req, res) => {
  const { name, sections } = req.body;

  await prisma.routineSection.deleteMany({ where: { routineId: req.params.id } });

  const routine = await prisma.routine.update({
    where: { id: req.params.id },
    data: {
      name,
      sections: {
        create: sections.map((sec, si) => ({
          name: sec.name,
          order: si,
          exercises: {
            create: sec.exercises.map((ex, ei) => ({
              name: ex.name,
              repetitions: ex.repetitions,
              weight: ex.weight || null,
              series: Number(ex.series),
              youtubeUrl: ex.youtubeUrl || null,
              order: ei
            }))
          }
        }))
      }
    },
    include: { sections: { include: { exercises: true } } }
  });
  res.json(routine);
});

// Importar CSV de rutinas (12 dias → agrupados en un nuevo mes)
router.post('/users/:id/import-csv', requireAdmin, async (req, res) => {
  const { csvText } = req.body;
  if (!csvText) return res.status(400).json({ error: 'Falta el contenido CSV' });

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  const lines = csvText.trim().replace(/\r/g, '').split('\n');
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const idx = k => headers.indexOf(k);

  const rows = lines.slice(1)
    .map(line => parseCSVLine(line))
    .filter(vals => vals.length > 1 && vals[idx('dia')])
    .map(vals => ({
      dia: parseInt(vals[idx('dia')]),
      seccion: vals[idx('seccion')]?.trim(),
      ejercicio: vals[idx('ejercicio')]?.trim(),
      repeticiones: vals[idx('repeticiones')]?.trim(),
      series: parseInt(vals[idx('series')]) || 1,
      peso: vals[idx('peso')]?.trim() || null,
      youtube: vals[idx('youtube')]?.trim() || null,
    }))
    .filter(r => r.dia >= 1 && r.dia <= 12 && r.seccion && r.ejercicio);

  if (rows.length === 0) return res.status(400).json({ error: 'El CSV no tiene filas válidas' });

  const userId = req.params.id;
  const SECTION_NAMES = ['Entrada en calor', 'Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4'];

  const [lastMesRow, lastOrderRow] = await Promise.all([
    prisma.routine.findFirst({ where: { userId }, orderBy: { mes: 'desc' }, select: { mes: true } }),
    prisma.routine.findFirst({ where: { userId }, orderBy: { order: 'desc' }, select: { order: true } }),
  ]);
  const nextMes = (lastMesRow?.mes ?? 0) + 1;
  let nextOrder = (lastOrderRow?.order ?? 0) + 1;

  const byDia = {};
  rows.forEach(r => {
    if (!byDia[r.dia]) byDia[r.dia] = {};
    if (!byDia[r.dia][r.seccion]) byDia[r.dia][r.seccion] = [];
    byDia[r.dia][r.seccion].push(r);
  });

  let createdCount = 0;
  for (let dia = 1; dia <= 12; dia++) {
    if (!byDia[dia]) continue;
    const sections = SECTION_NAMES
      .filter(sName => byDia[dia][sName]?.length > 0)
      .map((sName, si) => ({
        name: sName,
        order: si,
        exercises: {
          create: byDia[dia][sName].map((r, ei) => ({
            name: r.ejercicio,
            repetitions: r.repeticiones,
            weight: r.peso,
            series: r.series,
            youtubeUrl: r.youtube,
            order: ei,
          }))
        }
      }));

    await prisma.routine.create({
      data: { userId, name: `Dia ${dia}`, order: nextOrder++, mes: nextMes, sections: { create: sections } }
    });
    createdCount++;
  }

  res.json({ created: createdCount, mes: nextMes });
});

// Eliminar rutina
router.delete('/routines/:id', requireAdmin, async (req, res) => {
  await prisma.routine.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Resetear rutina (marcarla como no completada)
router.patch('/routines/:id/reset', requireAdmin, async (req, res) => {
  const routine = await prisma.routine.update({
    where: { id: req.params.id },
    data: { completedAt: null }
  });
  res.json(routine);
});

// Obtener datos de una rutina para el modo "ver como alumno"
router.get('/routines/:id/play-data', requireAdmin, async (req, res) => {
  const routine = await prisma.routine.findUnique({
    where: { id: req.params.id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { exercises: { orderBy: { order: 'asc' } } }
      }
    }
  });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  // Crear sesión temporal de admin para feedback
  let session = await prisma.workoutSession.findFirst({
    where: { userId: routine.userId, routineId: routine.id, completedAt: null },
    include: { feedbacks: true }
  });
  if (!session) {
    session = await prisma.workoutSession.create({
      data: { userId: routine.userId, routineId: routine.id },
      include: { feedbacks: true }
    });
  }

  res.json({ routine, sessionId: session.id, feedbacks: session.feedbacks });
});

// Estadísticas de un usuario
router.get('/users/:userId/stats', requireAdmin, async (req, res) => {
  const { userId } = req.params;

  const [sessions, wellbeingLogs] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, completedAt: { not: null } },
      include: {
        routine: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: { exercises: { orderBy: { order: 'asc' } } }
            }
          }
        },
        feedbacks: true
      },
      orderBy: { completedAt: 'asc' }
    }),
    prisma.wellbeingLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  const result = sessions.map(session => {
    const sessionDate = new Date(session.createdAt).toDateString();
    const wellbeing = wellbeingLogs.find(
      log => new Date(log.createdAt).toDateString() === sessionDate
    );

    const sections = session.routine.sections
      .filter(sec => sec.exercises.length > 0)
      .map(sec => ({
        name: sec.name,
        exercises: sec.exercises.map(ex => {
          const fb = session.feedbacks.find(f => f.exerciseId === ex.id);
          return { name: ex.name, feedback: fb?.feedback ?? null };
        })
      }));

    const feedbackValues = session.feedbacks.map(f => f.feedback);

    return {
      id: session.id,
      routineName: session.routine.name,
      completedAt: session.completedAt,
      wellbeingScore: wellbeing?.score ?? null,
      sections,
      feedbackSummary: {
        green: feedbackValues.filter(f => f === 'green').length,
        yellow: feedbackValues.filter(f => f === 'yellow').length,
        red: feedbackValues.filter(f => f === 'red').length,
        total: feedbackValues.length
      }
    };
  });

  res.json(result);
});

export default router;

