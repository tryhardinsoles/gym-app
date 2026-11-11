import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { money, dateKey, mondayOf, addDays, parseKey, ddmm } from './utils.js';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Celda: vacío → G (grupal) → I (individual) → G+I → vacío.
// Si el alumno no tiene precio individual, la celda solo alterna G.
export default function AsistenciaSemana() {
  const [lunes, setLunes] = useState(() => mondayOf(new Date()));
  const [data, setData] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [conSabado, setConSabado] = useState(false);
  const [error, setError] = useState('');
  const weekKey = dateKey(lunes);

  useEffect(() => {
    setData(null);
    axios.get('/api/cobros/semana', { params: { weekKey } }).then((r) => {
      setData(r.data);
      if (r.data.asistencias.some((a) => parseKey(a.fecha).getDay() === 6)) setConSabado(true);
    }).catch(() => setError('No se pudo cargar la semana'));
  }, [weekKey]);

  const dias = useMemo(() => Array.from({ length: conSabado ? 6 : 5 }, (_, i) => dateKey(addDays(lunes, i))), [lunes, conSabado]);

  const marcas = useMemo(() => {
    const m = {};
    for (const a of data?.asistencias || []) m[`${a.alumnoId}|${a.fecha}|${a.tipo}`] = a;
    return m;
  }, [data]);

  const toggle = async (alumnoId, fecha, tipo) => {
    const k = `${alumnoId}|${fecha}|${tipo}`;
    const prev = data;
    // optimista
    setData((d) => ({
      ...d,
      asistencias: marcas[k]
        ? d.asistencias.filter((a) => `${a.alumnoId}|${a.fecha}|${a.tipo}` !== k)
        : [...d.asistencias, { alumnoId, fecha, tipo, precio: null }],
    }));
    try {
      const { data: r } = await axios.post('/api/cobros/asistencia/toggle', { alumnoId, fecha, tipo });
      if (r.presente) {
        setData((d) => ({ ...d, asistencias: d.asistencias.map((a) => (`${a.alumnoId}|${a.fecha}|${a.tipo}` === k ? r.asistencia : a)) }));
      }
    } catch {
      setData(prev);
      setError('No se guardó el último cambio, probá de nuevo');
    }
  };

  const tocar = (alumno, fecha) => {
    const g = !!marcas[`${alumno.id}|${fecha}|grupal`];
    const i = !!marcas[`${alumno.id}|${fecha}|individual`];
    if (alumno.precioIndividual == null && !i) return toggle(alumno.id, fecha, 'grupal');
    if (!g && !i) toggle(alumno.id, fecha, 'grupal');
    else if (g && !i) { toggle(alumno.id, fecha, 'grupal'); toggle(alumno.id, fecha, 'individual'); }
    else if (!g && i) toggle(alumno.id, fecha, 'grupal');
    else { toggle(alumno.id, fecha, 'grupal'); toggle(alumno.id, fecha, 'individual'); }
  };

  const alumnos = (data?.alumnos || []).filter((a) => a.nombre.toLowerCase().includes(filtro.toLowerCase()));
  const hoy = dateKey(new Date());
  const totalSemana = (data?.asistencias || []).reduce((s, a) => s + (a.precio || 0), 0);
  const totalAlumno = (id) => (data?.asistencias || []).filter((a) => a.alumnoId === id).reduce((s, a) => s + (a.precio || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setLunes(addDays(lunes, -7))} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl font-bold">‹</button>
        <div className="text-center">
          <p className="text-white font-bold">Semana del {ddmm(weekKey)}</p>
          <button onClick={() => setLunes(mondayOf(new Date()))} className="text-xs text-gray-500 hover:text-brand-400">Ir a hoy</button>
        </div>
        <button onClick={() => setLunes(addDays(lunes, 7))} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl font-bold">›</button>
      </div>

      <div className="flex gap-2 mb-3">
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar alumno…" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
        <button onClick={() => setConSabado(!conSabado)} className={`px-3 py-2 rounded-xl text-xs font-bold ${conSabado ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-500'}`}>Sáb</button>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-brand-500 inline-block" /> Grupal</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-blue-500 inline-block" /> Individual</span>
        <span className="ml-auto">Semana: <b className="text-white">{money(totalSemana)}</b></span>
      </div>

      {error && <p className="text-red-400 text-sm mb-2" onClick={() => setError('')}>{error}</p>}

      {!data ? (
        <p className="text-gray-500 text-center py-10">Cargando…</p>
      ) : alumnos.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No hay alumnos. Cargalos en la pestaña Alumnos.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="grid items-center text-[11px] text-gray-500 font-bold border-b border-gray-800 px-2 py-2" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${dias.length}, 2.4rem) 4.5rem` }}>
            <span>Alumno</span>
            {dias.map((d, i) => (
              <span key={d} className={`text-center ${d === hoy ? 'text-brand-400' : ''}`}>{DIAS[i]}<br />{ddmm(d).slice(0, 2)}</span>
            ))}
            <span className="text-right">Semana</span>
          </div>
          {alumnos.map((a) => (
            <div key={a.id} className="grid items-center px-2 py-1.5 border-b border-gray-800/60 last:border-0" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${dias.length}, 2.4rem) 4.5rem` }}>
              <span className={`text-sm truncate pr-1 ${a.activo ? 'text-white' : 'text-gray-600'}`}>
                {a.nombre}
                {a.abonoMensual && a.abonoDesde ? <span className="ml-1 text-[10px] text-emerald-400 font-bold">ABONO</span> : null}
              </span>
              {dias.map((d) => {
                const g = marcas[`${a.id}|${d}|grupal`];
                const i = marcas[`${a.id}|${d}|individual`];
                return (
                  <button key={d} onClick={() => tocar(a, d)} className="h-9 w-9 mx-auto rounded-lg flex overflow-hidden border border-gray-700 active:scale-90 transition-transform" aria-label={`${a.nombre} ${d}`}>
                    {g && <span className="flex-1 bg-brand-500 text-[11px] font-black flex items-center justify-center">G</span>}
                    {i && <span className="flex-1 bg-blue-500 text-[11px] font-black flex items-center justify-center">I</span>}
                    {!g && !i && <span className="flex-1 bg-gray-800" />}
                  </button>
                );
              })}
              <span className="text-right text-xs text-gray-400">{money(totalAlumno(a.id))}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-600 mt-3">Tocá una celda para marcar. En alumnos con precio individual, los toques siguientes pasan a Individual y a Grupal + Individual.</p>
    </div>
  );
}
