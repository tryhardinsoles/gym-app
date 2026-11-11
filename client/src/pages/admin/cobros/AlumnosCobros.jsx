import { useState, useEffect } from 'react';
import axios from 'axios';
import { money } from './utils.js';
import ImportarPlanilla from './ImportarPlanilla.jsx';

const VACIO = { nombre: '', precioGrupal: '', precioIndividual: '', abonoMensual: '', abonoDesde: '', cuentaId: '', activo: true };

export default function AlumnosCobros() {
  const [alumnos, setAlumnos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [editando, setEditando] = useState(null); // id | 'nuevo'
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [importar, setImportar] = useState(false);

  const cargar = () => Promise.all([axios.get('/api/cobros/alumnos'), axios.get('/api/cobros/cuentas')])
    .then(([a, c]) => { setAlumnos(a.data); setCuentas(c.data); });
  useEffect(() => { cargar(); }, []);

  const abrir = (a) => {
    setError('');
    if (!a) { setEditando('nuevo'); setForm(VACIO); return; }
    setEditando(a.id);
    setForm({
      nombre: a.nombre, precioGrupal: a.precioGrupal ?? '', precioIndividual: a.precioIndividual ?? '',
      abonoMensual: a.abonoMensual ?? '', abonoDesde: a.abonoDesde ?? '', cuentaId: a.cuentaId, activo: a.activo,
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (form.abonoMensual && !form.abonoDesde) return setError('Indicá desde qué mes se cobra el abono');
    try {
      const body = { ...form };
      if (editando === 'nuevo') {
        if (!body.cuentaId || body.cuentaId === 'nueva') delete body.cuentaId;
        await axios.post('/api/cobros/alumnos', body);
      } else {
        await axios.put(`/api/cobros/alumnos/${editando}`, body);
      }
      setEditando(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const lista = alumnos.filter((a) => (verInactivos || a.activo) && a.nombre.toLowerCase().includes(filtro.toLowerCase()));
  const compartidas = new Set(cuentas.filter((c) => c.alumnos.length > 1).map((c) => c.id));

  const Form = (
    <form onSubmit={guardar} className="bg-gray-900 border border-brand-500/40 rounded-2xl p-4 space-y-3 mb-3">
      <Campo label="Nombre"><input required value={form.nombre} onChange={set('nombre')} className={inp} /></Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Precio clase grupal"><input type="number" inputMode="numeric" value={form.precioGrupal} onChange={set('precioGrupal')} className={inp} /></Campo>
        <Campo label="Precio clase individual"><input type="number" inputMode="numeric" value={form.precioIndividual} onChange={set('precioIndividual')} placeholder="No toma" className={inp} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Abono mensual fijo"><input type="number" inputMode="numeric" value={form.abonoMensual} onChange={set('abonoMensual')} placeholder="Sin abono" className={inp} /></Campo>
        <Campo label="Abono desde"><input type="month" value={form.abonoDesde} onChange={set('abonoDesde')} className={inp} /></Campo>
      </div>
      {form.abonoMensual ? <p className="text-[11px] text-gray-500">Con abono, las clases grupales no suman: se cobra el monto fijo cada mes. Las individuales se cobran aparte.</p> : null}
      <Campo label="Quién paga (cuenta)">
        <select value={form.cuentaId || 'nueva'} onChange={set('cuentaId')} className={inp}>
          <option value="nueva">{editando === 'nuevo' ? 'Paga por su cuenta' : 'Separar en cuenta propia'}</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}{c.alumnos.length ? ` (${c.alumnos.map((a) => a.nombre).join(', ')})` : ''}</option>
          ))}
        </select>
      </Campo>
      <p className="text-[11px] text-gray-500">Para un grupo familiar, elegí la cuenta de quien paga. La deuda de todos se suma ahí.</p>
      {editando !== 'nuevo' && (
        <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.activo} onChange={set('activo')} className="accent-brand-500" /> Activo</label>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditando(null)} className="flex-1 bg-gray-800 text-gray-400 py-2.5 rounded-xl text-sm font-bold">Cancelar</button>
        <button className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-bold">Guardar</button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => abrir(null)} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm">+ Nuevo alumno</button>
        <button onClick={() => setImportar(!importar)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 rounded-xl text-sm">Importar planilla</button>
      </div>
      {importar && <ImportarPlanilla onDone={() => { setImportar(false); cargar(); }} />}
      {editando === 'nuevo' && Form}

      <div className="flex gap-2 items-center mb-3">
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar…" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
        <label className="text-xs text-gray-500 flex items-center gap-1"><input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} className="accent-brand-500" /> Inactivos</label>
      </div>

      <div className="space-y-2">
        {lista.map((a) => editando === a.id ? <div key={a.id}>{Form}</div> : (
          <button key={a.id} onClick={() => abrir(a)} className="w-full text-left bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`font-bold ${a.activo ? 'text-white' : 'text-gray-600'}`}>{a.nombre}</span>
              <span className="text-xs text-gray-400">{a.abonoMensual ? <span className="text-emerald-400">Abono {money(a.abonoMensual)}</span> : `${money(a.precioGrupal)} / clase`}</span>
            </div>
            <div className="flex gap-3 text-[11px] text-gray-500 mt-0.5">
              {a.precioIndividual != null && <span className="text-blue-400">Individual {money(a.precioIndividual)}</span>}
              {compartidas.has(a.cuentaId) && <span>Paga: {a.cuenta.nombre}</span>}
              {!a.activo && <span>Inactivo</span>}
            </div>
          </button>
        ))}
        {lista.length === 0 && <p className="text-gray-500 text-center py-8">Sin alumnos todavía.</p>}
      </div>
    </div>
  );
}

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500';
function Campo({ label, children }) {
  return <label className="block"><span className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">{label}</span>{children}</label>;
}

