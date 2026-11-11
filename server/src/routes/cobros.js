import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/admin.js';
import { google } from 'googleapis';

// Asistencia y cobros de alumnos presenciales.
// Modelo: Cuenta (quien paga) 1─N Alumno; cargos = Asistencia.precio + Cargo (abonos);
// saldo de cuenta = cargos − pagos. Los pagos son montos libres, no se atan a semanas.

const router = Router();
const prisma = new PrismaClient();
router.use(requireAdmin);

// ── Helpers de fechas ("YYYY-MM-DD" ⇄ Date medianoche UTC) ────────────────────
const toDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) throw Object.assign(new Error('Fecha inválida'), { status: 400 });
  return new Date(`${s}T00:00:00.000Z`);
};
const toKey = (d) => d.toISOString().slice(0, 10);
const mesKey = (d) => d.toISOString().slice(0, 7);
const mesRange = (mes) => {
  const [y, m] = mes.split('-').map(Number);
  return { desde: new Date(Date.UTC(y, m - 1, 1)), hasta: new Date(Date.UTC(y, m, 1)) };
};
const nextMes = (mes) => mesKey(mesRange(mes).hasta);
const mesActual = () => {
  const ar = new Date(Date.now() - 3 * 3600 * 1000); // hora Argentina
  return ar.toISOString().slice(0, 7);
};
const num = (v) => (v === '' || v == null ? null : Number(v));

const wrap = (fn) => (req, res, next) =>
  fn(req, res, next).catch((e) => (e.status ? res.status(e.status).json({ error: e.message }) : next(e)));

// Precio que corresponde a una clase según tipo y abono vigente ese mes
function precioClase(alumno, tipo, fecha) {
  if (tipo === 'individual') return alumno.precioIndividual ?? alumno.precioGrupal;
  const conAbono = alumno.abonoMensual && alumno.abonoDesde && alumno.abonoDesde <= mesKey(fecha);
  return conAbono ? 0 : alumno.precioGrupal;
}

// Genera (idempotente) los cargos de abono hasta `hastaMes` inclusive (nunca después del mes actual)
async function asegurarAbonos(hastaMes) {
  const tope = hastaMes < mesActual() ? hastaMes : mesActual();
  const alumnos = await prisma.alumno.findMany({
    where: { activo: true, abonoMensual: { gt: 0 }, abonoDesde: { not: null, lte: tope } },
  });
  const data = [];
  for (const a of alumnos) {
    for (let m = a.abonoDesde; m <= tope; m = nextMes(m)) {
      data.push({ cuentaId: a.cuentaId, alumnoId: a.id, mes: m, concepto: 'abono', monto: a.abonoMensual });
    }
  }
  if (data.length) await prisma.cargo.createMany({ data, skipDuplicates: true });
}

// ── Alumnos y cuentas ─────────────────────────────────────────────────────────
router.get('/alumnos', wrap(async (_req, res) => {
  const alumnos = await prisma.alumno.findMany({
    include: { cuenta: { select: { id: true, nombre: true } } },
    orderBy: { nombre: 'asc' },
  });
  res.json(alumnos);
}));

function datosAlumno(b) {
  const d = {};
  if (b.nombre !== undefined) d.nombre = String(b.nombre).trim();
  if (b.precioGrupal !== undefined) d.precioGrupal = num(b.precioGrupal) ?? 0;
  if (b.precioIndividual !== undefined) d.precioIndividual = num(b.precioIndividual);
  if (b.abonoMensual !== undefined) d.abonoMensual = num(b.abonoMensual);
  if (b.abonoDesde !== undefined) d.abonoDesde = b.abonoDesde || null;
  if (b.activo !== undefined) d.activo = !!b.activo;
  return d;
}

router.post('/alumnos', wrap(async (req, res) => {
  const d = datosAlumno(req.body);
  if (!d.nombre) return res.status(400).json({ error: 'Falta el nombre' });
  let cuentaId = req.body.cuentaId;
  if (!cuentaId) cuentaId = (await prisma.cuenta.create({ data: { nombre: d.nombre } })).id;
  const alumno = await prisma.alumno.create({ data: { ...d, cuentaId } });
  res.json(alumno);
}));

// Borra una cuenta si quedó vacía (sin alumnos, pagos ni cargos)
async function limpiarCuenta(id) {
  const c = await prisma.cuenta.findUnique({
    where: { id },
    include: { _count: { select: { alumnos: true, pagos: true, cargos: true } } },
  });
  if (c && !c._count.alumnos && !c._count.pagos && !c._count.cargos) await prisma.cuenta.delete({ where: { id } });
}

router.put('/alumnos/:id', wrap(async (req, res) => {
  const prev = await prisma.alumno.findUnique({ where: { id: req.params.id } });
  if (!prev) return res.status(404).json({ error: 'Alumno no encontrado' });
  const d = datosAlumno(req.body);
  if (req.body.cuentaId === 'nueva') {
    d.cuentaId = (await prisma.cuenta.create({ data: { nombre: d.nombre || prev.nombre } })).id;
  } else if (req.body.cuentaId) d.cuentaId = req.body.cuentaId;
  const alumno = await prisma.alumno.update({ where: { id: prev.id }, data: d });
  if (d.cuentaId && d.cuentaId !== prev.cuentaId) {
    // la deuda ya generada se mueve con el alumno
    await prisma.cargo.updateMany({ where: { alumnoId: prev.id }, data: { cuentaId: d.cuentaId } });
    // si la cuenta vieja quedó sin alumnos, sus pagos y cargos sueltos pasan a la nueva
    const quedan = await prisma.alumno.count({ where: { cuentaId: prev.cuentaId } });
    if (!quedan) {
      await prisma.pago.updateMany({ where: { cuentaId: prev.cuentaId }, data: { cuentaId: d.cuentaId } });
      await prisma.cargo.updateMany({ where: { cuentaId: prev.cuentaId }, data: { cuentaId: d.cuentaId } });
    }
    await limpiarCuenta(prev.cuentaId);
  }
  res.json(alumno);
}));

router.get('/cuentas', wrap(async (_req, res) => {
  const cuentas = await prisma.cuenta.findMany({
    include: { alumnos: { select: { id: true, nombre: true, activo: true }, orderBy: { nombre: 'asc' } } },
    orderBy: { nombre: 'asc' },
  });
  res.json(cuentas);
}));

router.post('/cuentas', wrap(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  if (!nombre) return res.status(400).json({ error: 'Falta el nombre' });
  res.json(await prisma.cuenta.create({ data: { nombre, notas: req.body.notas || null } }));
}));

router.put('/cuentas/:id', wrap(async (req, res) => {
  const data = {};
  if (req.body.nombre !== undefined) data.nombre = String(req.body.nombre).trim();
  if (req.body.notas !== undefined) data.notas = req.body.notas || null;
  res.json(await prisma.cuenta.update({ where: { id: req.params.id }, data }));
}));

// ── Asistencia semanal ────────────────────────────────────────────────────────
router.get('/semana', wrap(async (req, res) => {
  const lunes = toDate(req.query.weekKey);
  const fin = new Date(lunes.getTime() + 7 * 864e5);
  const [alumnos, asistencias] = await Promise.all([
    prisma.alumno.findMany({
      where: { OR: [{ activo: true }, { asistencias: { some: { fecha: { gte: lunes, lt: fin } } } }] },
      select: { id: true, nombre: true, precioGrupal: true, precioIndividual: true, abonoMensual: true, abonoDesde: true, activo: true, cuentaId: true },
      orderBy: { nombre: 'asc' },
    }),
    prisma.asistencia.findMany({ where: { fecha: { gte: lunes, lt: fin } } }),
  ]);
  res.json({
    weekKey: toKey(lunes),
    alumnos,
    asistencias: asistencias.map((a) => ({ id: a.id, alumnoId: a.alumnoId, fecha: toKey(a.fecha), tipo: a.tipo, precio: a.precio })),
  });
}));

// Marca/desmarca una clase. body: {alumnoId, fecha:"YYYY-MM-DD", tipo}
router.post('/asistencia/toggle', wrap(async (req, res) => {
  const { alumnoId, tipo = 'grupal' } = req.body;
  if (!['grupal', 'individual'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
  const fecha = toDate(req.body.fecha);
  const where = { alumnoId_fecha_tipo: { alumnoId, fecha, tipo } };
  const existe = await prisma.asistencia.findUnique({ where });
  if (existe) {
    await prisma.asistencia.delete({ where });
    return res.json({ presente: false });
  }
  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId } });
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });
  const a = await prisma.asistencia.create({ data: { alumnoId, fecha, tipo, precio: precioClase(alumno, tipo, fecha) } });
  res.json({ presente: true, asistencia: { id: a.id, alumnoId, fecha: toKey(fecha), tipo, precio: a.precio } });
}));

// ── Saldos ────────────────────────────────────────────────────────────────────
// Resumen por cuenta para un mes: saldo anterior + cargos del mes − pagos del mes
router.get('/resumen', wrap(async (req, res) => {
  const mes = /^\d{4}-\d{2}$/.test(req.query.mes || '') ? req.query.mes : mesActual();
  await asegurarAbonos(mes);
  const { desde, hasta } = mesRange(mes);

  const [cuentas, asist, cargos, pagos] = await Promise.all([
    prisma.cuenta.findMany({ include: { alumnos: { select: { id: true, nombre: true, activo: true } } } }),
    prisma.asistencia.findMany({ where: { fecha: { lt: hasta }, precio: { not: 0 } }, select: { fecha: true, precio: true, tipo: true, alumnoId: true, alumno: { select: { cuentaId: true } } } }),
    prisma.cargo.findMany({ where: { mes: { lte: mes } } }),
    prisma.pago.findMany({ where: { fecha: { lt: hasta } } }),
  ]);

  const r = {};
  for (const c of cuentas) {
    r[c.id] = { id: c.id, nombre: c.nombre, alumnos: c.alumnos, saldoAnterior: 0, grupales: 0, individuales: 0, montoGrupal: 0, montoIndividual: 0, abonos: 0, otrosCargos: 0, pagado: 0, pagos: [] };
  }
  for (const a of asist) {
    const x = r[a.alumno.cuentaId]; if (!x) continue;
    if (a.fecha < desde) { x.saldoAnterior += a.precio; continue; }
    if (a.tipo === 'individual') { x.individuales++; x.montoIndividual += a.precio; }
    else { x.grupales++; x.montoGrupal += a.precio; }
  }
  for (const c of cargos) {
    const x = r[c.cuentaId]; if (!x) continue;
    if (c.mes < mes) x.saldoAnterior += c.monto;
    else if (c.concepto === 'abono') x.abonos += c.monto;
    else x.otrosCargos += c.monto;
  }
  for (const p of pagos) {
    const x = r[p.cuentaId]; if (!x) continue;
    if (p.fecha < desde) x.saldoAnterior -= p.monto;
    else { x.pagado += p.monto; x.pagos.push({ id: p.id, fecha: toKey(p.fecha), monto: p.monto, nota: p.nota }); }
  }

  const filas = Object.values(r).map((x) => {
    const cargosMes = x.montoGrupal + x.montoIndividual + x.abonos + x.otrosCargos;
    return { ...x, cargosMes, saldo: x.saldoAnterior + cargosMes - x.pagado };
  }).filter((x) => x.alumnos.some((a) => a.activo) || Math.abs(x.saldo) > 0.5 || x.cargosMes || x.pagado)
    .sort((a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre));

  const tot = (k) => filas.reduce((s, f) => s + f[k], 0);
  res.json({
    mes,
    filas,
    totales: { cargosMes: tot('cargosMes'), pagado: tot('pagado'), deuda: filas.reduce((s, f) => s + Math.max(f.saldo, 0), 0) },
  });
}));

// Estado de cuenta completo: movimientos con saldo acumulado
router.get('/cuentas/:id/movimientos', wrap(async (req, res) => {
  await asegurarAbonos(mesActual());
  const cuenta = await prisma.cuenta.findUnique({
    where: { id: req.params.id },
    include: { alumnos: { select: { id: true, nombre: true } } },
  });
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const ids = cuenta.alumnos.map((a) => a.id);
  const nombre = Object.fromEntries(cuenta.alumnos.map((a) => [a.id, a.nombre]));
  const [asist, cargos, pagos] = await Promise.all([
    prisma.asistencia.findMany({ where: { alumnoId: { in: ids }, precio: { not: 0 } } }),
    prisma.cargo.findMany({ where: { cuentaId: cuenta.id } }),
    prisma.pago.findMany({ where: { cuentaId: cuenta.id } }),
  ]);

  // Clases agrupadas por mes, alumno y tipo para que no sea una lista eterna
  const grupos = {};
  for (const a of asist) {
    const k = `${mesKey(a.fecha)}|${a.alumnoId}|${a.tipo}`;
    grupos[k] ??= { mes: mesKey(a.fecha), alumno: nombre[a.alumnoId], tipo: a.tipo, cantidad: 0, monto: 0 };
    grupos[k].cantidad++; grupos[k].monto += a.precio;
  }
  const movs = [
    ...Object.values(grupos).map((g) => ({
      fecha: `${g.mes}-01`, orden: 0, tipo: 'cargo',
      detalle: `${g.alumno}: ${g.cantidad} clase${g.cantidad > 1 ? 's' : ''} ${g.tipo === 'individual' ? 'individual' + (g.cantidad > 1 ? 'es' : '') : 'grupal' + (g.cantidad > 1 ? 'es' : '')}`,
      monto: g.monto,
    })),
    ...cargos.map((c) => ({
      fecha: `${c.mes}-01`, orden: 0, tipo: 'cargo',
      detalle: c.concepto === 'abono' ? `${nombre[c.alumnoId] || ''}: abono mensual` : c.concepto, monto: c.monto,
    })),
    ...pagos.map((p) => ({ id: p.id, fecha: toKey(p.fecha), orden: 1, tipo: 'pago', detalle: p.nota || 'Pago', monto: -p.monto })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);

  let saldo = 0;
  for (const m of movs) { saldo += m.monto; m.saldo = saldo; }
  res.json({ cuenta, movimientos: movs.reverse(), saldo });
}));

// ── Pagos ─────────────────────────────────────────────────────────────────────
router.post('/pagos', wrap(async (req, res) => {
  const monto = Number(req.body.monto);
  if (!req.body.cuentaId || !(monto > 0)) return res.status(400).json({ error: 'Cuenta y monto son obligatorios' });
  const pago = await prisma.pago.create({
    data: { cuentaId: req.body.cuentaId, monto, fecha: toDate(req.body.fecha), nota: req.body.nota || null },
  });
  res.json(pago);
}));

router.delete('/pagos/:id', wrap(async (req, res) => {
  await prisma.pago.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ── Importación desde la planilla vieja ───────────────────────────────────────
// Descarga la planilla como .xlsx a partir del link (el cliente la parsea).
// 1) export público si está compartida "cualquier persona con el enlace";
// 2) si no, Drive API con la service account (si la planilla está compartida con ella).
router.post('/planilla-xlsx', wrap(async (req, res) => {
  const id = String(req.body.url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return res.status(400).json({ error: 'Link de Google Sheets inválido' });

  const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, { redirect: 'follow' });
  const tipo = r.headers.get('content-type') || '';
  if (r.ok && !tipo.includes('text/html')) {
    res.set('Content-Type', 'application/octet-stream');
    return res.send(Buffer.from(await r.arrayBuffer()));
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (email && key) {
    try {
      const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
      const drive = google.drive({ version: 'v3', auth });
      const { data } = await drive.files.export(
        { fileId: id, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { responseType: 'arraybuffer' },
      );
      res.set('Content-Type', 'application/octet-stream');
      return res.send(Buffer.from(data));
    } catch { /* cae al mensaje de abajo */ }
  }
  res.status(403).json({
    error: `No puedo abrir la planilla. Compartila como "Cualquier persona con el enlace (Lector)"${email ? ` o compartila con ${email}` : ''}.`,
  });
}));

// body: {alumnos:[{legacyId,nombre,precio,activo}], asistencias:[{legacyId,fecha,precio}], pagos:[{legacyId,fecha,monto}]}
router.post('/importar', wrap(async (req, res) => {
  const { alumnos = [], asistencias = [], pagos = [] } = req.body;
  const mapa = {};
  let nuevos = 0;
  for (const a of alumnos) {
    if (!a.legacyId || !a.nombre) continue;
    let al = await prisma.alumno.findUnique({ where: { legacyId: a.legacyId } });
    if (!al) {
      const cuenta = await prisma.cuenta.create({ data: { nombre: a.nombre } });
      al = await prisma.alumno.create({
        data: { nombre: a.nombre, legacyId: a.legacyId, precioGrupal: Number(a.precio) || 0, activo: a.activo !== false, cuentaId: cuenta.id },
      });
      nuevos++;
    }
    mapa[a.legacyId] = al;
  }

  const dataAsist = asistencias
    .filter((x) => mapa[x.legacyId] && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha))
    .map((x) => ({ alumnoId: mapa[x.legacyId].id, fecha: toDate(x.fecha), tipo: 'grupal', precio: Number(x.precio) || 0 }));
  const { count: clases } = await prisma.asistencia.createMany({ data: dataAsist, skipDuplicates: true });

  let pagosCreados = 0;
  for (const p of pagos) {
    const al = mapa[p.legacyId];
    const monto = Number(p.monto);
    if (!al || !(monto > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) continue;
    const nota = `Planilla: semana del ${p.fecha.split('-').reverse().join('/')}`;
    const fecha = toDate(p.fecha);
    const ya = await prisma.pago.findFirst({ where: { cuentaId: al.cuentaId, fecha, monto, nota } });
    if (ya) continue;
    await prisma.pago.create({ data: { cuentaId: al.cuentaId, fecha, monto, nota } });
    pagosCreados++;
  }
  res.json({ alumnosNuevos: nuevos, clases, pagos: pagosCreados });
}));

export default router;
