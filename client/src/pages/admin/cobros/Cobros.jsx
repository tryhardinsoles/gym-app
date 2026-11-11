import { useNavigate, useSearchParams } from 'react-router-dom';
import AsistenciaSemana from './AsistenciaSemana.jsx';
import Saldos from './Saldos.jsx';
import AlumnosCobros from './AlumnosCobros.jsx';

const TABS = [
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'saldos', label: 'Saldos' },
  { id: 'alumnos', label: 'Alumnos' },
];

export default function Cobros() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'asistencia';

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between pt-4 mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Asistencia y cobros</h1>
          <p className="text-gray-500 text-sm">Clases presenciales</p>
        </div>
        <button onClick={() => navigate('/admin/dashboard')} className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm font-medium px-3 py-2 rounded-xl">
          ← Panel
        </button>
      </div>

      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${tab === t.id ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'asistencia' && <AsistenciaSemana />}
      {tab === 'saldos' && <Saldos />}
      {tab === 'alumnos' && <AlumnosCobros />}
    </div>
  );
}
