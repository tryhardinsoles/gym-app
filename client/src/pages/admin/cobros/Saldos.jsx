import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { money, mesKeyOf, mesLabel, shiftMes, todayKey } from './utils.js';
import PagoForm from './PagoForm.jsx';

export default function Saldos() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(() => mesKeyOf(new Date()));
  const [data, setData] = useState(null);
  const [cobrando, setCobrando] = useState(null);
  const [soloDeudores, setSoloDeudores] = useState(false);

  const cargar = () => axios.get('/api/cobros/resumen', { params: { mes } }).then((r) => setData(r.data));
  useEffect(() => { setData(null); cargar(); }, [mes]);

  const filas = (data?.filas || []).filter((f) => !soloDeudores || f.saldo > 0.5);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMes(shiftMes(mes, -1))} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl font-bold">‹</button>
        <p className="text-white font-bold capitalize">{mesLabel(mes)}</p>
        <button onClick={() => setMes(shiftMes(mes, 1))} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl font-bold">›</button>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Generado en el mes" value={money(data.totales.cargosMes)} />
          <Stat label="Cobrado en el mes" value={money(data.totales.pagado)} color="text-emerald-400" />
          <Stat label="Deuda total" value={money(data.totales.deuda)} color="text-brand-400" />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-400 mb-3">
        <input type="checkbox" checked={soloDeudores} onChange={(e) => setSoloDeudores(e.target.checked)} className="accent-brand-500" />
        Solo cuentas con deuda
      </label>

      {!data ? <p className="text-gray-500 text-center py-10">Cargando…</p> : (
        <div className="space-y-2">
          {filas.map((f) => (
            <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => navigate(`/admin/cobros/cuenta/${f.id}`)} className="text-left min-w-0">
                  <p className="text-white font-bold truncate">{f.nombre}</p>
                  {f.alumnos.length > 1 && <p className="text-xs text-gray-500 truncate">{f.alumnos.map((a) => a.nombre).join(' · ')}</p>}
                </button>
                <div className="text-right shrink-0">
                  <p className={`font-black text-lg ${f.saldo > 0.5 ? 'text-brand-400' : f.saldo < -0.5 ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {f.saldo < -0.5 ? `+${money(-f.saldo)}` : money(f.saldo)}
                  </p>
                  <p className="text-[11px] text-gray-500">{f.saldo > 0.5 ? 'debe' : f.saldo < -0.5 ? 'a favor' : 'al día'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mt-2">
                {Math.abs(f.saldoAnterior) > 0.5 && <span>Anterior {money(f.saldoAnterior)}</span>}
                {f.grupales > 0 && <span>{f.grupales} grupal{f.grupales > 1 ? 'es' : ''} {money(f.montoGrupal)}</span>}
                {f.individuales > 0 && <span className="text-blue-400">{f.individuales} individual{f.individuales > 1 ? 'es' : ''} {money(f.montoIndividual)}</span>}
                {f.abonos > 0 && <span className="text-emerald-400">Abono {money(f.abonos)}</span>}
                {f.pagado > 0 && <span className="text-emerald-400">Pagó {money(f.pagado)}</span>}
              </div>
              {cobrando === f.id ? (
                <PagoForm
                  cuentaId={f.id}
                  sugerido={Math.max(f.saldo, 0)}
                  fechaInicial={todayKey()}
                  onCancel={() => setCobrando(null)}
                  onSaved={() => { setCobrando(null); cargar(); }}
                />
              ) : (
                <button onClick={() => setCobrando(f.id)} className="mt-3 w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-xl text-sm">
                  Registrar pago
                </button>
              )}
            </div>
          ))}
          {filas.length === 0 && <p className="text-gray-500 text-center py-10">Nada para mostrar este mes.</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
      <p className={`font-black ${color} text-sm sm:text-lg`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
