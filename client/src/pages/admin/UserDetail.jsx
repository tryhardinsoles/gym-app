import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [routines, setRoutines] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [importingSheet, setImportingSheet] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [sheetSuccess, setSheetSuccess] = useState('');
  const [userPlan, setUserPlan] = useState('start');
  const [savingPlan, setSavingPlan] = useState(false);

  const fetchRoutines = async () => {
    try {
      const [usersRes, routinesRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get(`/api/admin/users/${userId}/routines`)
      ]);
      const found = usersRes.data.find(u => u.id === userId);
      if (found) { setUsername(found.username); setUserPlan(found.plan || 'start'); }
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

  const handleClearRoutines = async () => {
    if (!confirm(`¿Borrar TODAS las rutinas de ${username}? Esta acción no se puede deshacer.`)) return;
    await axios.delete(`/api/admin/users/${userId}/routines`);
    fetchRoutines();
  };

  const handleImportSheet = async () => {
    if (!sheetUrl.trim()) { setSheetError('Pegá la URL de la hoja'); return; }
    setImportingSheet(true);
    setSheetError('');
    setSheetSuccess('');
    try {
      const { data } = await axios.post(`/api/admin/users/${userId}/import-from-sheet`, { sheetUrl: sheetUrl.trim() });
      setSheetSuccess(`Mes ${data.mes} importado — ${data.created} rutinas creadas`);
      setSheetUrl('');
      fetchRoutines();
    } catch (err) {
      setSheetError(err.response?.data?.error || 'Error al importar');
    } finally {
      setImportingSheet(false);
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportError('');
    try {
      const csvText = await file.text();
      const { data } = await axios.post(`/api/admin/users/${userId}/import-csv`, { csvText });
      await fetchRoutines();
      alert(`Mes ${data.mes} importado — ${data.created} rutinas creadas.`);
    } catch (err) {
      setImportError(err.response?.data?.error || 'Error al importar el CSV');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const statusBadge = (routine) => {
    if (routine.completedAt) return (
      <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-2 py-1 rounded-full">
        Completada
      </span>
    );
    return (
      <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full">
        Pendiente
      </span>
    );
  };

  // Agrupar rutinas por mes
  const groupedByMes = routines.reduce((acc, r) => {
    const mes = r.mes ?? 1;
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(r);
    return acc;
  }, {});
  const mesNumbers = Object.keys(groupedByMes).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pt-6 mb-8">
        <button onClick={() => navigate('/admin/dashboard')} className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">{username}</h1>
          <p className="text-gray-500 text-sm">{routines.length} rutinas cargadas</p>
        </div>
      </div>

      <div className="flex gap-3 mb-2 flex-wrap">
        <button
          className="btn-primary flex-1 py-3 text-base"
          onClick={() => navigate(`/admin/users/${userId}/routines/new`)}
        >
          + Agregar rutina
        </button>
        <button
          className="bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 font-bold px-5 py-3 rounded-2xl transition-colors text-base"
          onClick={() => navigate(`/admin/users/${userId}/generate`)}
        >
          Generar
        </button>
        <button
          className="bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold px-5 py-3 rounded-2xl transition-colors text-base"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importando...' : 'Importar CSV'}
        </button>
        <button
          className="bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold px-5 py-3 rounded-2xl transition-colors text-base"
          onClick={() => navigate(`/admin/users/${userId}/stats`)}
        >
          Stats
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportCSV}
      />

      {importError && (
        <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2 mb-4">{importError}</p>
      )}

      {/* Plan del alumno */}
      <div className="card mb-4 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Plan</p>
            <p className="text-gray-500 text-xs mt-0.5">Determina el límite de llamadas en Agenda</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={userPlan}
              onChange={e => setUserPlan(e.target.value)}
              className="bg-gray-800 text-white text-sm font-bold rounded-xl px-3 py-2 border border-gray-700 focus:outline-none focus:border-brand-500"
            >
              <option value="start">Start — 1 call/semana</option>
              <option value="performance">Performance — 3 calls/semana</option>
            </select>
            <button
              onClick={async () => {
                setSavingPlan(true);
                try { await axios.put(`/api/admin/users/${userId}`, { plan: userPlan }); }
                finally { setSavingPlan(false); }
              }}
              disabled={savingPlan}
              className="bg-brand-500 hover:bg-brand-400 text-white text-xs font-black px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {savingPlan ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Importar desde Google Sheets */}
      <div className="card mb-4 mt-2 space-y-2">
        <p className="text-sm font-bold text-white">Importar desde Google Sheets</p>
        <input
          className="input-field text-sm"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={sheetUrl}
          onChange={e => { setSheetUrl(e.target.value); setSheetError(''); setSheetSuccess(''); }}
        />
        {sheetError && <p className="text-red-400 text-xs">{sheetError}</p>}
        {sheetSuccess && <p className="text-brand-400 text-xs">{sheetSuccess}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleImportSheet}
            disabled={importingSheet}
            className="btn-primary py-2 text-sm flex-1"
          >
            {importingSheet ? 'Importando...' : 'Importar rutinas'}
          </button>
          <button
            onClick={handleClearRoutines}
            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold px-4 py-2 rounded-2xl transition-colors text-sm"
          >
            Limpiar todo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : routines.length === 0 ? (
        <div className="card text-center text-gray-500 py-10">
          Este alumno no tiene rutinas cargadas aún
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {mesNumbers.map(mes => (
            <div key={mes}>
              <h2 className="text-lg font-black text-white mb-3 border-b border-gray-800 pb-2">
                Mes {mes}
              </h2>
              <div className="space-y-3">
                {groupedByMes[mes]
                  .slice()
                  .sort((a, b) => {
                    if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1;
                    return a.order - b.order;
                  })
                  .map((r) => (
                  <div key={r.id} className="card">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-white text-lg mb-1">{r.name}</h3>
                        <div className="flex gap-2 flex-wrap">
                          {statusBadge(r)}
                          <span className="bg-gray-800 text-gray-400 text-xs font-medium px-2 py-1 rounded-full">
                            {r.sections.reduce((acc, s) => acc + s.exercises.length, 0)} ejercicios
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-4">
                      {r.sections.filter(s => s.exercises.length > 0).map(s => (
                        <span key={s.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg">
                          {s.name} ({s.exercises.length})
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/admin/users/${userId}/routines/${r.id}/play`)}
                        className="bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                      >
                        Ver como alumno
                      </button>
                      <button
                        onClick={() => navigate(`/admin/users/${userId}/routines/${r.id}`)}
                        className="bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                      >
                        Editar
                      </button>
                      {r.completedAt && (
                        <button
                          onClick={() => handleReset(r.id)}
                          className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                        >
                          Resetear
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-bold px-4 py-2 rounded-xl transition-colors ml-auto"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
