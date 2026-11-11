import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { money, todayKey, mesLabel } from './utils.js';
import PagoForm from './PagoForm.jsx';

export default function CuentaDetalle() {
  const { cuentaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [nombre, setNombre] = useState('');
  const [cobrar, setCobrar] = useState(false);

  const cargar = () => axios.get(`/api/cobros/cuentas/${cuentaId}/movimientos`).then((r) => { setData(r.data); setNombre(r.data.cuenta.nombre); });
  useEffect(() => { cargar(); }, [cuentaId]);

  const renombrar = async () => {
    if (nombre.trim() && nombre !== data.cuenta.nombre) await axios.put(`/api/cobros/cuentas/${cuentaId}`, { nombre });
  };
  const borrarPago = async (id) => {
    if (!confirm('¿Borrar este pago?')) return;
    await axios.delete(`/api/cobros/pagos/${id}`);
    cargar();
  };

  if (!data) return <p className="text-gray-500 text-center py-20">Cargando…</p>;

  // Agrupar movimientos por mes para leerlos fácil
  const porMes = {};
  for (const m of data.movimientos) (porMes[m.fecha.slice(0, 7)] ??= []).push(m);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-16">
      <button onClick={() => navigate('/admin/cobros?tab=saldos')} className="text-gray-500 hover:text-white text-sm pt-4 mb-4">← Saldos</button>

      <div className="card mb-4">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} onBlur={renombrar} className="bg-transparent text-2xl font-black text-white w-full focus:outline-none border-b border-transparent focus:border-gray-700" />
        <p className="text-sm text-gray-500 mt-1">{data.cuenta.alumnos.map((a) => a.nombre).join(' · ')}</p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">{data.saldo < -0.5 ? 'Saldo a favor' : 'Debe en total'}</p>
            <p className={`text-3xl font-black ${data.saldo > 0.5 ? 'text-brand-400' : 'text-emerald-400'}`}>{money(Math.abs(data.saldo))}</p>
          </div>
          {!cobrar && <button onClick={() => setCobrar(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm">Registrar pago</button>}
        </div>
        {cobrar && <PagoForm cuentaId={cuentaId} sugerido={Math.max(data.saldo, 0)} fechaInicial={todayKey()} onCancel={() => setCobrar(false)} onSaved={() => { setCobrar(false); cargar(); }} />}
      </div>

      {Object.entries(porMes).map(([mes, movs]) => (
        <div key={mes} className="mb-4">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2 capitalize">{mesLabel(mes)}</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
            {movs.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm gap-2">
                <div className="min-w-0">
                  <p className="text-white truncate">{m.detalle}</p>
                  {m.tipo === 'pago' && <p className="text-[11px] text-gray-500">{m.fecha.split('-').reverse().join('/')}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={m.tipo === 'pago' ? 'text-emerald-400 font-bold' : 'text-gray-300'}>{m.tipo === 'pago' ? `−${money(-m.monto)}` : money(m.monto)}</span>
                  {m.tipo === 'pago' && <button onClick={() => borrarPago(m.id)} className="text-gray-600 hover:text-red-400 text-lg leading-none" aria-label="Borrar pago">×</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.movimientos.length === 0 && <p className="text-gray-500 text-center py-8">Sin movimientos.</p>}
    </div>
  );
}
