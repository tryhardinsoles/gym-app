import { useState } from 'react';
import axios from 'axios';

// Importa la planilla vieja (PRESENTES) a partir de su link (el server la baja como .xlsx):
// ALUMNOS → alumnos, REGISTRO (Presente = TRUE) → clases grupales, PAGOS (Pagó = TRUE) → pagos.
// Se puede correr más de una vez: no duplica.

const pad = (n) => String(n).padStart(2, '0');
function aKey(v) {
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  const m = String(v || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : null;
}
const aNum = (v) => (typeof v === 'number' ? v : Number(String(v || '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0);
const aBool = (v) => v === true || String(v).toUpperCase() === 'TRUE' || String(v).toUpperCase() === 'VERDADERO';

function hoja(wb, XLSX, nombre) {
  const name = wb.SheetNames.find((n) => n.trim().toUpperCase() === nombre);
  if (!name) return [];
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
  const i = filas.findIndex((f) => f.some((c) => String(c).trim().toUpperCase() === 'ID ALUMNO' || String(c).trim().toUpperCase() === 'ID'));
  if (i < 0) return [];
  const head = filas[i].map((c) => String(c).trim().toLowerCase());
  return filas.slice(i + 1).map((f) => Object.fromEntries(head.map((h, j) => [h, f[j]])));
}

export default function ImportarPlanilla({ onDone }) {
  const [estado, setEstado] = useState('');
  const [resultado, setResultado] = useState(null);
  const [preview, setPreview] = useState(null);
  const [url, setUrl] = useState(() => { try { return localStorage.getItem('cobrosPlanillaUrl') || ''; } catch { return ''; } });

  const leer = async (e) => {
    e.preventDefault();
    setEstado('Leyendo planilla…'); setResultado(null); setPreview(null);
    try {
      try { localStorage.setItem('cobrosPlanillaUrl', url); } catch {}
      const [XLSX, resp] = await Promise.all([
        import('xlsx'),
        axios.post('/api/cobros/planilla-xlsx', { url }, { responseType: 'arraybuffer' }),
      ]);
      const wb = XLSX.read(resp.data, { cellDates: true });
      const alumnos = hoja(wb, XLSX, 'ALUMNOS')
        .filter((r) => r.id && r['nombre del alumno'])
        .map((r) => ({ legacyId: String(r.id).trim(), nombre: String(r['nombre del alumno']).trim(), precio: aNum(r['valor por clase']), activo: aBool(r.activo) }));
      const asistencias = hoja(wb, XLSX, 'REGISTRO')
        .filter((r) => aBool(r.presente) && r['id alumno'])
        .map((r) => ({ legacyId: String(r['id alumno']).trim(), fecha: aKey(r.fecha), precio: aNum(r.importe) || aNum(r['valor clase']) }))
        .filter((r) => r.fecha);
      const pagos = hoja(wb, XLSX, 'PAGOS')
        .filter((r) => aBool(r['pagó'] ?? r.pago) && r['id alumno'])
        .map((r) => ({ legacyId: String(r['id alumno']).trim(), fecha: aKey(r.semana), monto: aNum(r['total semanal']) }))
        .filter((r) => r.fecha && r.monto > 0);
      if (!alumnos.length) throw new Error('No encontré la hoja ALUMNOS con columna ID');
      setPreview({ alumnos, asistencias, pagos });
      setEstado('');
    } catch (err) {
      let msg = err.message;
      if (err.response?.data instanceof ArrayBuffer) {
        try { msg = JSON.parse(new TextDecoder().decode(err.response.data)).error; } catch {}
      }
      setEstado(msg || 'No se pudo leer la planilla');
    }
  };

  const importar = async () => {
    setEstado('Importando…');
    try {
      const { data } = await axios.post('/api/cobros/importar', preview);
      setResultado(data); setPreview(null); setEstado('');
    } catch (e) {
      setEstado(e.response?.data?.error || 'Error al importar');
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3 space-y-3 text-sm">
      <p className="text-gray-400">Pegá el link de la planilla vieja. Tiene que estar compartida como <b className="text-white">Cualquier persona con el enlace (Lector)</b>. Se puede importar de nuevo sin duplicar.</p>
      <form onSubmit={leer} className="flex gap-2">
        <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500" />
        <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 rounded-xl">Leer</button>
      </form>
      {preview && (
        <div className="space-y-2">
          <p className="text-white">Encontré <b>{preview.alumnos.length}</b> alumnos, <b>{preview.asistencias.length}</b> clases y <b>{preview.pagos.length}</b> pagos.</p>
          <button onClick={importar} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl">Importar</button>
        </div>
      )}
      {estado && <p className="text-gray-400">{estado}</p>}
      {resultado && (
        <div className="text-emerald-400">
          Listo: {resultado.alumnosNuevos} alumnos nuevos, {resultado.clases} clases y {resultado.pagos} pagos.
          <p className="text-gray-400 mt-1">Ahora armá los grupos familiares y los abonos desde cada alumno.</p>
          <button onClick={onDone} className="mt-2 text-white underline">Cerrar</button>
        </div>
      )}
    </div>
  );
}
