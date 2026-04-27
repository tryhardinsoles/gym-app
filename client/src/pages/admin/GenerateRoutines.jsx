import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const LEVEL_LABELS = ['', 'Muy básico', 'Básico', 'Intermedio', 'Avanzado'];
const LEVEL_DESC = [
  '',
  'Principiante o con limitaciones físicas. Solo ejercicios simples.',
  'Conocimientos básicos. Puede progresar con variantes sencillas.',
  'Entrenamiento regular. Accede a ejercicios complejos con límite.',
  'Alto rendimiento. Accede a todo el catálogo.',
];

export default function GenerateRoutines() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [studentLevel, setStudentLevel] = useState(2);
  const [canDoImpact, setCanDoImpact] = useState(true);
  const [routineType, setRoutineType] = useState('localizada');
  const [csvFile, setCsvFile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!csvFile) { setError('Seleccioná el CSV de ejercicios'); return; }
    setGenerating(true);
    setError('');
    try {
      const exercisesCSV = await csvFile.text();
      const { data } = await axios.post(`/api/admin/users/${userId}/generate-routines`, {
        exercisesCSV,
        studentLevel,
        canDoImpact,
        routineType,
      });
      alert(`Mes ${data.mes} generado — ${data.created} rutinas creadas.`);
      navigate(`/admin/users/${userId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar rutinas');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-36">
      <div className="flex items-center gap-3 pt-6 mb-8">
        <button
          onClick={() => navigate(`/admin/users/${userId}`)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Volver
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Generar Rutinas</h1>
          <p className="text-gray-500 text-sm">12 rutinas automáticas — 4 semanas, 3 por semana</p>
        </div>
      </div>

      {/* Nivel del alumno */}
      <div className="card mb-4">
        <h2 className="text-base font-black text-white mb-1">Nivel del Alumno</h2>
        <p className="text-gray-500 text-sm mb-4">
          Determina los ejercicios disponibles y las repeticiones asignadas
        </p>
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[1, 2, 3, 4].map(level => (
            <button
              key={level}
              onClick={() => setStudentLevel(level)}
              className={`py-5 rounded-2xl font-black text-2xl transition-colors ${
                studentLevel === level
                  ? 'bg-brand-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="bg-gray-800/60 rounded-xl px-4 py-3">
          <p className="text-white font-bold text-sm">{LEVEL_LABELS[studentLevel]}</p>
          <p className="text-gray-400 text-xs mt-0.5">{LEVEL_DESC[studentLevel]}</p>
        </div>
      </div>

      {/* Impacto */}
      <div className="card mb-4">
        <h2 className="text-base font-black text-white mb-1">Ejercicios de Impacto</h2>
        <p className="text-gray-500 text-sm mb-4">
          Saltos, sprints, burpees y movimientos de alto impacto articular
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCanDoImpact(true)}
            className={`py-4 rounded-2xl font-bold transition-colors ${
              canDoImpact
                ? 'bg-brand-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="text-base">Puede hacerlos</div>
            <div className="text-xs mt-0.5 opacity-70">Incluye ejercicios de impacto</div>
          </button>
          <button
            onClick={() => setCanDoImpact(false)}
            className={`py-4 rounded-2xl font-bold transition-colors ${
              !canDoImpact
                ? 'bg-red-500/80 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="text-base">No puede hacerlos</div>
            <div className="text-xs mt-0.5 opacity-70">Excluye todos los de impacto</div>
          </button>
        </div>
      </div>

      {/* Tipo de rutina */}
      <div className="card mb-4">
        <h2 className="text-base font-black text-white mb-1">Tipo de Rutina</h2>
        <p className="text-gray-500 text-sm mb-4">Define cómo se distribuyen los ejercicios por bloque</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRoutineType('localizada')}
            className={`py-4 rounded-2xl font-bold transition-colors text-left px-4 ${
              routineType === 'localizada'
                ? 'bg-brand-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="text-base">Localizada</div>
            <div className="text-xs mt-1 opacity-70 leading-snug">
              EC: Zona media<br/>
              B1: Tren Inferior<br/>
              B2: Tren Superior<br/>
              B3: TI + TS mezclado<br/>
              B4: 1 Aeróbico
            </div>
          </button>
          <button
            onClick={() => setRoutineType('circuito')}
            className={`py-4 rounded-2xl font-bold transition-colors text-left px-4 ${
              routineType === 'circuito'
                ? 'bg-brand-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="text-base">Circuito</div>
            <div className="text-xs mt-1 opacity-70 leading-snug">
              Cada bloque tiene<br/>
              1 ejercicio de cada<br/>
              categoría disponible
            </div>
          </button>
        </div>
      </div>

      {/* Progresión */}
      <div className="card mb-4">
        <h2 className="text-base font-black text-white mb-3">Progresión automática</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-gray-300">Días 1–3: 3 ejercicios por bloque · 3 series</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-yellow-400 flex-shrink-0" />
            <span className="text-gray-300">Días 4–6: 4 ejercicios por bloque · 3 series</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
            <span className="text-gray-300">Días 7–9: 4 ejercicios · +10% repeticiones · 3 series</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-gray-300">Días 10–12: 4 ejercicios · −10% repeticiones · 4 series</span>
          </div>
        </div>
      </div>

      {/* CSV */}
      <div className="card mb-4">
        <h2 className="text-base font-black text-white mb-1">Base de Ejercicios</h2>
        <p className="text-gray-500 text-sm mb-4">
          CSV con columnas: Ejercicio, Nombre, Hipervínculo, Categoria, Dificultad, Elemento, Impacto
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className={`w-full font-bold py-4 rounded-2xl transition-colors border-2 border-dashed ${
            csvFile
              ? 'border-brand-500 bg-brand-500/10 text-brand-400'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {csvFile ? csvFile.name : 'Seleccionar CSV de ejercicios'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => setCsvFile(e.target.files[0] || null)}
        />
      </div>

      {/* Footer fijo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
        <div className="max-w-2xl mx-auto space-y-2">
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
          <button
            className="btn-primary py-5 text-lg"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generando 12 rutinas...' : 'Generar 12 Rutinas'}
          </button>
        </div>
      </div>
    </div>
  );
}
