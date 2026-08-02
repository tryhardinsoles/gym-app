import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ImportFromSheets() {
  const navigate = useNavigate();
  const [masterUrl, setMasterUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!masterUrl.trim()) { setError('Pegá la URL de la hoja maestra'); return; }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const { data } = await axios.post('/api/admin/import-from-sheets', { masterSheetUrl: masterUrl.trim() });
      setResults(data.results);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  const successCount = results?.filter(r => !r.error).length ?? 0;
  const errorCount = results?.filter(r => r.error).length ?? 0;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3 pt-6 mb-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
        >
          ← Volver
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Importar desde Google Sheets</h1>
          <p className="text-gray-500 text-sm">Cargá rutinas para múltiples alumnos a la vez</p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="card mb-6">
        <h2 className="text-base font-black text-white mb-3">Cómo funciona</h2>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex gap-3">
            <span className="text-brand-400 font-black shrink-0">1.</span>
            <p>Tenés una <span className="text-white font-bold">hoja maestra</span> con dos columnas: <code className="bg-gray-800 px-1 rounded text-brand-300">username</code> y <code className="bg-gray-800 px-1 rounded text-brand-300">sheet_url</code></p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-400 font-black shrink-0">2.</span>
            <p>Cada <span className="text-white font-bold">hoja individual</span> tiene columnas: <code className="bg-gray-800 px-1 rounded text-brand-300">dia · seccion · ejercicio · repeticiones · series · peso · youtube</code></p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-400 font-black shrink-0">3.</span>
            <p>Todas las hojas deben estar compartidas como <span className="text-white font-bold">"Cualquier persona con el enlace puede ver"</span></p>
          </div>
        </div>
      </div>

      {/* Input URL */}
      <div className="card mb-4">
        <h2 className="text-base font-black text-white mb-3">URL de la hoja maestra</h2>
        <input
          className="input-field text-sm"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={masterUrl}
          onChange={e => setMasterUrl(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={loading}
        className="btn-primary py-4 text-base mb-6"
      >
        {loading ? 'Importando...' : 'Importar rutinas'}
      </button>

      {/* Resultados */}
      {results && (
        <div className="space-y-3">
          <div className="flex gap-3">
            {successCount > 0 && (
              <div className="flex-1 bg-brand-500/10 border border-brand-500/30 rounded-2xl px-4 py-3 text-center">
                <p className="text-brand-400 font-black text-2xl">{successCount}</p>
                <p className="text-gray-400 text-xs mt-0.5">alumnos importados</p>
              </div>
            )}
            {errorCount > 0 && (
              <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-center">
                <p className="text-red-400 font-black text-2xl">{errorCount}</p>
                <p className="text-gray-400 text-xs mt-0.5">con errores</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-2xl px-4 py-3 border ${
                  r.error
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-brand-500/5 border-brand-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{r.username}</span>
                  {r.error
                    ? <span className="text-red-400 text-xs font-bold">Error</span>
                    : <span className="text-brand-400 text-xs font-bold">Mes {r.mes} · {r.created} rutinas</span>
                  }
                </div>
                {r.error && <p className="text-red-400 text-xs mt-1">{r.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
