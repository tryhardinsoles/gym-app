import { useState } from 'react';
import axios from 'axios';

// Importa la planilla vieja (PRESENTES) descargada como .xlsx:
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

  const leer = async (file) => {
    setEstado('Leyendo archivo…'); setResultado(null);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
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
    } catch (e) {
      setEstado(e.message || 'No se pudo leer el archivo');
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
      <p className="text-gray-400">En la planilla vieja: <b className="text-white">Archivo → Descargar → Microsoft Excel (.xlsx)</b> y subí ese archivo acá. Se puede importar de nuevo sin duplicar.</p>
      <input type="file" accept=".xlsx" onChange={(e) => e.target.files[0] && leer(e.target.files[0])} className="block w-full text-gray-400 file:mr-3 file:bg-gray-800 file:text-white file:border-0 file:px-3 file:py-2 file:rounded-xl" />
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
