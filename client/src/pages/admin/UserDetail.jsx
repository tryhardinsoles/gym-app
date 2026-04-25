import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [routines, setRoutines] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRoutines = async () => {
    try {
      const [usersRes, routinesRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get(`/api/admin/users/${userId}/routines`)
      ]);
      const found = usersRes.data.find(u => u.id === userId);
      if (found) setUsername(found.username);
      setRoutines(routinesRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutines(); }, [userId]);

  const handleDelete = async (routineId, name) => {
    if (!confirm(`¿Eliminar la rutina "${name}"?`)) return;
    await axios.delete(`/api/admin/routines/${routineId}`);
    fetchRoutines();
  };

  const handleReset = async (routineId) => {
    await axios.patch(`/api/admin/routines/${routineId}/reset`);
    fetchRoutines();
  };

  const statusBadge = (routine) => {
    if (routine.completedAt) return (
      <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-2 py-1 rounded-full">
        ✓ Completada
      </span>
    );
    return (
      <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full">
        Pendiente
      </span>
    );
  };

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pt-6 mb-8">
        <button onClick={() => navigate('/admin/dashboard')} className="text-gray-400 hover:text-white transition-colors">
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">{username}</h1>
          <p className="text-gray-500 text-sm">{routines.length} rutinas cargadas</p>
        </div>
      </div>

      <button
        className="btn-primary mb-6 py-3 text-base"
        onClick={() => navigate(`/admin/users/${userId}/routines/new`)}
      >
        + Agregar rutina
      </button>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : routines.length === 0 ? (
        <div className="card text-center text-gray-500 py-10">
          Este alumno no tiene rutinas cargadas aún
        </div>
      ) : (
        <div className="space-y-3">
          {routines.map((r, i) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500 text-sm font-bold">#{i + 1}</span>
                    <h3 className="font-bold text-white text-lg">{r.name}</h3>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {statusBadge(r)}
                    <span className="bg-gray-800 text-gray-400 text-xs font-medium px-2 py-1 rounded-full">
                      {r.sections.reduce((acc, s) => acc + s.exercises.length, 0)} ejercicios
                    </span>
                  </div>
                </div>
              </div>

              {/* Section summary */}
              <div className="flex gap-2 flex-wrap mb-4">
                {r.sections.filter(s => s.exercises.length > 0).map(s => (
                  <span key={s.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg">
                    {s.name} ({s.exercises.length})
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => navigate(`/admin/users/${userId}/routines/${r.id}/play`)}
                  className="bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  ▶ Ver como alumno
                </button>
                <button
                  onClick={() => navigate(`/admin/users/${userId}/routines/${r.id}`)}
                  className="bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  ✏ Editar
                </button>
                {r.completedAt && (
                  <button
                    onClick={() => handleReset(r.id)}
                    className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                  >
                    ↺ Resetear
                  </button>
                )}
                <button
                  onClick={() => handleDelete(r.id, r.name)}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-bold px-4 py-2 rounded-xl transition-colors ml-auto"
                >
                  ✕ Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
