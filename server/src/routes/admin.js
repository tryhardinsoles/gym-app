import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/admin.js';
import { google } from 'googleapis';

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
    select: { id: true, username: true, password: true, plan: true, createdAt: true }
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
  const { username, password, plan } = req.body;
  const data = {};
  if (username) data.username = username;
  if (password) data.password = password;
  if (plan && ['start', 'performance', 'b2b'].includes(plan)) data.plan = plan;
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ id: user.id, username: user.username, plan: user.plan });
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

  const currentRoutine = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!currentRoutine) return res.status(404).json({ error: 'Rutina no encontrada' });

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

  // Propagar cambios elegidos por el admin a los días PENDIENTES del mismo alumno
  // propagate: [{ oldName, changes: { name?, youtubeUrl?, repetitions?, weight? } }]
  const { propagate } = req.body;
  if (Array.isArray(propagate) && propagate.length > 0) {
    const pending = await findPendingExercises(currentRoutine.userId, req.params.id);
    for (const p of propagate) {
      const data = {};
      for (const f of ['name', 'youtubeUrl', 'repetitions', 'weight']) {
        if (p.changes && f in p.changes) data[f] = p.changes[f] || (f === 'name' || f === 'repetitions' ? undefined : null);
      }
      if (Object.keys(data).length === 0) continue;
      const ids = pending.filter(e => normName(e.name) === normName(p.oldName)).map(e => e.id);
      if (ids.length) await prisma.exercise.updateMany({ where: { id: { in: ids } }, data });
    }
  }

  res.json(routine);
});

const normName = (s) => (s || '').trim().toLowerCase();

// Ejercicios de las rutinas pendientes del alumno (excepto la rutina indicada)
async function findPendingExercises(userId, excludeRoutineId) {
  const routines = await prisma.routine.findMany({
    where: { userId, completedAt: null, id: { not: excludeRoutineId } },
    orderBy: [{ mes: 'asc' }, { order: 'asc' }],
    include: { sections: { include: { exercises: true } } }
  });
  return routines.flatMap(r => r.sections.flatMap(s =>
    s.exercises.map(e => ({ ...e, routineName: r.name, mes: r.mes }))
  ));
}

// Vista previa: en qué días pendientes aparece cada ejercicio
router.post('/routines/:id/propagation-preview', requireAdmin, async (req, res) => {
  const { names } = req.body;
  const routine = await prisma.routine.findUnique({ where: { id: req.params.id } });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });
  const pending = await findPendingExercises(routine.userId, routine.id);
  const result = {};
  for (const n of names || []) {
    const days = pending.filter(e => normName(e.name) === normName(n))
      .map(e => `Mes ${e.mes} · ${e.routineName}`);
    result[n] = [...new Set(days)];
  }
  res.json(result);
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

// Borrar todas las rutinas de un alumno
router.delete('/users/:id/routines', requireAdmin, async (req, res) => {
  await prisma.routine.deleteMany({ where: { userId: req.params.id } });
  res.json({ ok: true });
});

// Importar rutinas de un alumno desde Google Sheets
router.post('/users/:id/import-from-sheet', requireAdmin, async (req, res) => {
  const { sheetUrl } = req.body;
  if (!sheetUrl) return res.status(400).json({ error: 'Falta la URL de la hoja' });
  try {
    const csvText = await fetchSheetCsv(sheetUrl);
    const { created, mes } = await importCsvForUser(req.params.id, csvText);
    res.json({ created, mes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bloquear / desbloquear una rutina (plan B2B)
router.patch('/routines/:id/lock', requireAdmin, async (req, res) => {
  const { isLocked } = req.body;
  const routine = await prisma.routine.update({
    where: { id: req.params.id },
    data: { isLocked: Boolean(isLocked) }
  });
  res.json(routine);
});

// Bloquear / desbloquear todas las rutinas de un alumno (plan B2B)
router.patch('/users/:userId/routines/lock-all', requireAdmin, async (req, res) => {
  const { isLocked } = req.body;
  await prisma.routine.updateMany({
    where: { userId: req.params.userId },
    data: { isLocked: Boolean(isLocked) }
  });
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

// Actualizar peso o repeticiones de un ejercicio
router.patch('/exercises/:id', requireAdmin, async (req, res) => {
  const { weight, repetitions } = req.body;
  const data = {};
  if (weight !== undefined) data.weight = weight || null;
  if (repetitions !== undefined && repetitions !== '') data.repetitions = repetitions;
  await prisma.exercise.update({ where: { id: req.params.id }, data });
  res.json({ ok: true });
});

// Guardar bienestar del alumno desde admin
router.post('/routines/:id/wellbeing', requireAdmin, async (req, res) => {
  const { score } = req.body;
  const routine = await prisma.routine.findUnique({
    where: { id: req.params.id },
    select: { userId: true }
  });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });
  await prisma.wellbeingLog.create({
    data: { userId: routine.userId, score: Number(score) }
  });
  res.json({ ok: true });
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

// Generar 12 rutinas automáticamente a partir de un CSV de ejercicios
router.post('/users/:id/generate-routines', requireAdmin, async (req, res) => {
  const { exercisesCSV, studentLevel, canDoImpact, routineType, dayPatterns } = req.body;
  if (!exercisesCSV) return res.status(400).json({ error: 'Falta el CSV de ejercicios' });

  const lvl = Number(studentLevel) || 2;

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

  const rawLines = exercisesCSV.trim().replace(/\r/g, '').split('\n');
  const headers = parseCSVLine(rawLines[0]).map(h => h.toLowerCase());
  const colOf = (...names) => {
    for (const name of names) {
      const i = headers.findIndex(h => h.includes(name));
      if (i >= 0) return i;
    }
    return -1;
  };
  const nameCol  = colOf('nombre') >= 0 ? colOf('nombre') : 1;
  const urlCol   = colOf('hiperv') >= 0 ? colOf('hiperv') : 2;
  const catCol   = colOf('categ')  >= 0 ? colOf('categ')  : 3;
  const diffCol  = colOf('dific')  >= 0 ? colOf('dific')  : 4;
  const impactCol = colOf('impac') >= 0 ? colOf('impac')  : 6;
  const patCol    = colOf('patron', 'patr');   // 'patr' captura 'Patrón' con tilde
  const hasPatronColumn = patCol >= 0;

  const allExercises = rawLines.slice(1)
    .map(line => parseCSVLine(line))
    .filter(v => v.length > 3 && v[nameCol]?.trim())
    .map(v => ({
      nombre:    v[nameCol].trim(),
      url:       v[urlCol]?.trim() || '',
      categoria: v[catCol]?.trim() || '',
      dificultad: parseInt(v[diffCol]) || 0,
      impacto:   v[impactCol]?.trim().toLowerCase() === 'si',
      patron:    patCol >= 0 ? (v[patCol]?.trim() || '') : '',
    }))
    .filter(ex => ex.nombre && ex.categoria);

  if (allExercises.length === 0)
    return res.status(400).json({ error: 'No se encontraron ejercicios válidos en el CSV' });

  const pool = canDoImpact ? allExercises : allExercises.filter(ex => !ex.impacto);

  const getPhase = (day) => {
    if (day <= 3)  return { exPerSection: 3, series: 3, repMod: 1.0 };
    if (day <= 6)  return { exPerSection: 4, series: 3, repMod: 1.0 };
    if (day <= 9)  return { exPerSection: 4, series: 3, repMod: 1.1 };
    return             { exPerSection: 4, series: 4, repMod: 0.9 };
  };

  const calcReps = (exDiff, mod) => {
    let base;
    const diff = exDiff - lvl;
    if (diff >= 1)             base = 6;   // ejercicio más difícil → menos reps
    else if (lvl >= 3 && diff <= -2) base = 15; // mucho más fácil para alumno avanzado
    else                       base = 10;  // mismo nivel
    return String(Math.round(base * mod));
  };

  const getAerobicTime = (day) => {
    if (day <= 3) return '6 minutos';
    if (day <= 6) return '7 minutos';
    if (day <= 9) return '8 minutos';
    return '10 minutos';
  };

  // Selecciona hasta `count` ejercicios de una categoría respetando dificultad y ventana de días
  const pickFrom = (category, count, forbidden, usedToday, patternFilter = null) => {
    const cat = category.toLowerCase();
    const candidates = pool
      .filter(ex =>
        ex.categoria.toLowerCase() === cat &&
        !forbidden.has(ex.nombre) &&
        !usedToday.has(ex.nombre) &&
        (!patternFilter || patternFilter(ex))
      )
      .sort((a, b) => Math.abs(a.dificultad - lvl) - Math.abs(b.dificultad - lvl));

    const selected = [];
    for (const ex of candidates) {
      if (selected.length >= count) break;
      if (lvl <= 3 && (ex.dificultad - lvl) > 2) continue; // máximo +2 niveles de dificultad
      selected.push(ex);
      usedToday.add(ex.nombre);
    }
    return selected;
  };

  const EVEN_POOL = [8, 10, 12];
  const roundToEven = (n) => Math.min(12, Math.max(8, Math.round(n / 2) * 2));
  const makeSection = (name, exercises, series, repMod, expectedCount = 0) => {
    const shuffled = [...EVEN_POOL].sort(() => Math.random() - 0.5);
    const result = exercises.map((ex, i) => ({
      name: ex.nombre,
      youtubeUrl: ex.url || null,
      repetitions: String(roundToEven(shuffled[i % EVEN_POOL.length] * repMod)),
      series,
    }));
    while (result.length < expectedCount) {
      result.push({ name: '', youtubeUrl: null, repetitions: '—', series });
    }
    return { name, exercises: result };
  };

  const SECTION_NAMES = ['Entrada en calor', 'Bloque 1', 'Bloque 2', 'Bloque 3', 'Bloque 4'];
  const CIRCUIT_CATS_3 = ['Tren inferior', 'Tren Superior', 'Zona media'];
  const CIRCUIT_CATS_4 = ['Tren inferior', 'Tren Superior', 'Zona media', 'Aerobico'];

  const makePatternFilter = (pattern) => {
    if (!hasPatronColumn || pattern === 'libre') return null;
    if (pattern === 'empuje') {
      return (ex) => {
        const p = ex.patron.toLowerCase();
        return p.includes('empuje') || p.includes('tricep') || p.includes('pecho') || p.includes('cualquier');
      };
    }
    if (pattern === 'traccion') {
      return (ex) => {
        const p = ex.patron.toLowerCase();
        return p.includes('traccion') || p.includes('tracción') || p.includes('espalda') || p.includes('cualquier');
      };
    }
    return null;
  };

  const history = {};
  const generatedRoutines = [];

  for (let day = 1; day <= 12; day++) {
    const { exPerSection, series, repMod } = getPhase(day);
    const forbidden = new Set([...(history[day - 1] || []), ...(history[day - 2] || [])]);
    const usedToday = new Set();
    const sections = [];
    const dayPattern = Array.isArray(dayPatterns) ? (dayPatterns[day - 1] ?? 'libre') : 'libre';
    const patternFilter = makePatternFilter(dayPattern);

    if (routineType === 'localizada') {
      sections.push(makeSection('Entrada en calor',
        pickFrom('Zona media', exPerSection, forbidden, usedToday), series, repMod, exPerSection));

      sections.push(makeSection('Bloque 1',
        pickFrom('Tren inferior', exPerSection, forbidden, usedToday), series, repMod, exPerSection));

      sections.push(makeSection('Bloque 2',
        pickFrom('Tren Superior', exPerSection, forbidden, usedToday, patternFilter), series, repMod, exPerSection));

      const b3InfCount = exPerSection >= 4 ? 2 : 1;
      const b3SupCount = exPerSection >= 4 ? 2 : 1;
      const b3 = [
        ...pickFrom('Tren inferior', b3InfCount, forbidden, usedToday),
        ...pickFrom('Tren Superior', b3SupCount, forbidden, usedToday, patternFilter),
      ];
      sections.push(makeSection('Bloque 3', b3, series, repMod, b3InfCount + b3SupCount));

      // Bloque 4 se deja vacío para completar manualmente

    } else { // circuito
      const cats = exPerSection >= 4 ? CIRCUIT_CATS_4 : CIRCUIT_CATS_3;
      for (const sName of SECTION_NAMES) {
        const secEx = [];
        for (const cat of cats) {
          secEx.push(...pickFrom(cat, 1, forbidden, usedToday));
        }
        sections.push(makeSection(sName, secEx, series, repMod, cats.length));
      }
    }

    history[day] = usedToday;
    generatedRoutines.push({ day, sections });
  }

  // Guardar en la base de datos
  const userId = req.params.id;
  const [lastMesRow, lastOrderRow] = await Promise.all([
    prisma.routine.findFirst({ where: { userId }, orderBy: { mes: 'desc' }, select: { mes: true } }),
    prisma.routine.findFirst({ where: { userId }, orderBy: { order: 'desc' }, select: { order: true } }),
  ]);
  const nextMes   = (lastMesRow?.mes   ?? 0) + 1;
  let   nextOrder = (lastOrderRow?.order ?? 0) + 1;

  for (const rt of generatedRoutines) {
    const sectionsData = rt.sections
      .filter(s => s.exercises.length > 0)
      .map((sec, si) => ({
        name: sec.name,
        order: si,
        exercises: {
          create: sec.exercises.map((ex, ei) => ({
            name: ex.name,
            repetitions: ex.repetitions,
            weight: null,
            series: ex.series,
            youtubeUrl: ex.youtubeUrl,
            order: ei,
          }))
        }
      }));

    await prisma.routine.create({
      data: {
        userId,
        name: `Dia ${rt.day}`,
        order: nextOrder++,
        mes: nextMes,
        sections: { create: sectionsData },
      }
    });
  }

  res.json({ created: generatedRoutines.length, mes: nextMes });
});

// Resumen de actividad de hoy (sesiones completadas + llamadas programadas)
router.get('/today', requireAdmin, async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const todayDayOfWeek = now.getDay();

  // UTC Monday of current local week
  const diffToMon = todayDayOfWeek === 0 ? -6 : 1 - todayDayOfWeek;
  const weekMonday = new Date(now);
  weekMonday.setDate(weekMonday.getDate() + diffToMon);
  const y = weekMonday.getFullYear();
  const m = String(weekMonday.getMonth() + 1).padStart(2, '0');
  const d = String(weekMonday.getDate()).padStart(2, '0');
  const weekStartUTC = new Date(`${y}-${m}-${d}T00:00:00.000Z`);

  const [completedToday, bookingsToday] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { completedAt: { gte: todayStart, lt: tomorrowStart }, user: { isAdmin: false } },
      include: { user: { select: { username: true } }, routine: { select: { name: true } } },
      orderBy: { completedAt: 'desc' }
    }),
    prisma.agendaBooking.findMany({
      where: { weekStart: weekStartUTC, slot: { dayOfWeek: todayDayOfWeek } },
      include: { user: { select: { username: true } }, slot: true },
      orderBy: { slot: { time: 'asc' } }
    })
  ]);

  res.json({ completedToday, bookingsToday });
});

// Migración retroactiva: crea ExerciseLogs para sesiones completadas que no tienen registros
function _parseWeight(str) {
  if (!str) return null;
  const m = str.match(/(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}
function _parseReps(str) {
  if (!str) return null;
  const m = str.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

router.post('/migrate-exercise-logs', requireAdmin, async (req, res) => {
  const sessions = await prisma.workoutSession.findMany({
    where: { completedAt: { not: null }, exerciseLogs: { none: {} } },
    include: {
      routine: { include: { sections: { include: { exercises: true } } } }
    }
  });

  let created = 0;
  for (const session of sessions) {
    const exercises = session.routine?.sections?.flatMap(s => s.exercises) ?? [];
    if (exercises.length === 0) continue;
    try {
      const result = await prisma.exerciseLog.createMany({
        data: exercises.map(ex => ({
          userId: session.userId,
          exerciseId: ex.id,
          sessionId: session.id,
          exerciseName: ex.name,
          weight: _parseWeight(ex.weight),
          reps: _parseReps(ex.repetitions),
          series: ex.series,
          loggedAt: session.completedAt,
        })),
        skipDuplicates: true,
      });
      created += result.count;
    } catch {}
  }

  res.json({ migratedSessions: sessions.length, logsCreated: created });
});

// ── Google Sheets helpers ─────────────────────────────────────────────────────

async function resolveSheetGid(spreadsheetId, sheetName) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) return null;
  const auth = new google.auth.JWT({
    email, key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const { data } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });
  const found = (data.sheets || []).find(
    s => s.properties.title.toLowerCase() === sheetName.toLowerCase()
  );
  return found?.properties?.sheetId ?? null;
}

async function fetchSheetCsv(sheetUrl) {
  const idMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) throw new Error('URL de Google Sheets inválida');
  const spreadsheetId = idMatch[1];

  const gidMatch = sheetUrl.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch?.[1];

  let csvUrl;
  if (gid && gid !== '0') {
    // gid explícito distinto de 0: usar directo
    csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  } else {
    // Buscar "vista-web" via Sheets API para obtener su gid real
    try {
      const resolvedGid = await resolveSheetGid(spreadsheetId, 'vista-web');
      if (resolvedGid != null) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${resolvedGid}`;
      }
    } catch {}
    // Fallback si la API no está configurada
    if (!csvUrl) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=vista-web`;
    }
  }

  const res = await fetch(csvUrl, { redirect: 'follow' });
  if (!res.ok) throw new Error(`No se pudo acceder a la hoja (HTTP ${res.status})`);
  const text = await res.text();
  if (text.trimStart().startsWith('<'))
    throw new Error('La hoja no es pública — compartila con "Cualquier persona con el enlace"');
  return text;
}

function parseCsvLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

async function importCsvForUser(userId, csvText) {
  const lines = csvText.trim().replace(/\r/g, '').split('\n');
  // Strip UTF-8 BOM if present
  if (lines[0].charCodeAt(0) === 0xFEFF) lines[0] = lines[0].slice(1);
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());

  // Flexible column matching — finds first header that contains the term
  const findCol = (...terms) => {
    for (const term of terms) {
      const i = headers.findIndex(h => h.includes(term));
      if (i >= 0) return i;
    }
    return -1;
  };

  const diaCol  = findCol('dia', 'día', 'day');
  const secCol  = findCol('secci', 'section', 'bloque', 'sec');
  const ejCol   = findCol('ejerc', 'exercise', 'nombre', 'name');
  const repCol  = findCol('rep');
  const serCol  = findCol('ser');
  const pesoCol = findCol('peso', 'weight');
  const youCol  = findCol('youtube', 'video', 'url', 'link');

  if (diaCol === -1 || secCol === -1 || ejCol === -1)
    throw new Error(`Columnas no encontradas. Encabezados detectados: ${headers.join(' | ')}`);

  const rows = lines.slice(1)
    .map(line => parseCsvLine(line))
    .filter(vals => vals.length > 1 && vals[diaCol]?.trim())
    .map(vals => ({
      dia:          parseInt(vals[diaCol]),
      seccion:      vals[secCol]?.trim(),
      ejercicio:    vals[ejCol]?.trim(),
      repeticiones: repCol >= 0 ? (vals[repCol]?.trim() || '10') : '10',
      series:       serCol >= 0 ? (parseInt(vals[serCol]) || 3) : 3,
      peso:         pesoCol >= 0 ? (vals[pesoCol]?.trim() || null) : null,
      youtube:      youCol >= 0 ? (vals[youCol]?.trim() || null) : null,
    }))
    .filter(r => r.dia >= 1 && r.dia <= 12 && r.seccion && r.ejercicio);

  if (rows.length === 0) throw new Error('La hoja no tiene filas válidas');

  const [lastMesRow, lastOrderRow] = await Promise.all([
    prisma.routine.findFirst({ where: { userId }, orderBy: { mes: 'desc' }, select: { mes: true } }),
    prisma.routine.findFirst({ where: { userId }, orderBy: { order: 'desc' }, select: { order: true } }),
  ]);
  const nextMes = (lastMesRow?.mes ?? 0) + 1;
  let nextOrder = (lastOrderRow?.order ?? 0) + 1;

  const byDia = {};
  for (const r of rows) {
    if (!byDia[r.dia]) byDia[r.dia] = {};
    if (!byDia[r.dia][r.seccion]) byDia[r.dia][r.seccion] = [];
    byDia[r.dia][r.seccion].push(r);
  }

  let created = 0;
  for (let dia = 1; dia <= 12; dia++) {
    if (!byDia[dia]) continue;
    const sectionNames = Object.keys(byDia[dia]);
    const sections = sectionNames.map((sName, si) => ({
      name: sName, order: si,
      exercises: {
        create: byDia[dia][sName].map((r, ei) => ({
          name: r.ejercicio, repetitions: r.repeticiones,
          weight: r.peso, series: r.series, youtubeUrl: r.youtube, order: ei,
        }))
      }
    }));
    await prisma.routine.create({
      data: { userId, name: `Dia ${dia}`, order: nextOrder++, mes: nextMes, sections: { create: sections } }
    });
    created++;
  }
  return { created, mes: nextMes };
}

// Importar rutinas desde una Google Sheet maestra (username → link de hoja individual)
router.post('/import-from-sheets', requireAdmin, async (req, res) => {
  const { masterSheetUrl } = req.body;
  if (!masterSheetUrl) return res.status(400).json({ error: 'Falta la URL de la hoja maestra' });

  let masterCsv;
  try {
    masterCsv = await fetchSheetCsv(masterSheetUrl);
  } catch (err) {
    return res.status(400).json({ error: `Hoja maestra: ${err.message}` });
  }

  const lines = masterCsv.trim().replace(/\r/g, '').split('\n');
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const usernameIdx = headers.findIndex(h => h.includes('user') || h.includes('alumno') || h.includes('nombre'));
  const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link') || h.includes('hoja') || h.includes('sheet'));

  if (usernameIdx === -1 || urlIdx === -1)
    return res.status(400).json({ error: 'La hoja maestra debe tener columnas "username" y "sheet_url"' });

  const entries = lines.slice(1)
    .map(line => parseCsvLine(line))
    .filter(vals => vals[usernameIdx]?.trim() && vals[urlIdx]?.trim())
    .map(vals => ({ username: vals[usernameIdx].trim(), sheetUrl: vals[urlIdx].trim() }));

  if (entries.length === 0)
    return res.status(400).json({ error: 'La hoja maestra no tiene filas con datos' });

  const results = [];
  for (const { username, sheetUrl } of entries) {
    try {
      const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (!user) { results.push({ username, error: 'Usuario no encontrado en la app' }); continue; }

      const csvText = await fetchSheetCsv(sheetUrl);
      const { created, mes } = await importCsvForUser(user.id, csvText);
      results.push({ username, created, mes });
    } catch (err) {
      results.push({ username, error: err.message });
    }
  }

  res.json({ results });
});

export default router;

