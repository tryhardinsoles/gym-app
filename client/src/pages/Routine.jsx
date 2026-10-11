import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ExerciseRow from '../components/ExerciseRow.jsx';
import ConfettiScreen from '../components/ConfettiScreen.jsx';
import WellbeingScale from '../components/WellbeingScale.jsx';

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?\s]{11})/);
  return m ? m[1] : null;
}

function VideoPanel({ videoId }) {
  if (!videoId) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 text-sm px-4 text-center">Tocá un ejercicio para ver el video</p>
      </div>
    );
  }
  return (
    <iframe
      key={videoId}
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0`}
      className="w-full h-full border-0"
      allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen
      title="Video ejercicio"
    />
  );
}

export default function Routine({ adminPlay = false }) {
  const navigate = useNavigate();
  const { userId, routineId } = useParams();

  const [routine, setRoutine] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');
  const [wellbeingDone, setWellbeingDone] = useState(false);
  const [wellbeingScore, setWellbeingScore] = useState(null);

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        let url = '/api/routines/current';
        if (adminPlay && routineId) url = `/api/admin/routines/${routineId}/play-data`;
        const { data } = await axios.get(url);
        if (!data) { setError('No tenés rutinas pendientes 🎉'); setLoading(false); return; }
        setRoutine(data.routine);
        setSessionId(data.sessionId);
      } catch {
        setError('Error al cargar la rutina');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutine();
  }, [adminPlay, routineId]);

  const activeSections = routine?.sections?.filter(s => s.exercises.length > 0) || [];
  const currentSection = activeSections[currentSectionIdx];
  const isLastSection = currentSectionIdx === activeSections.length - 1;

  useEffect(() => {
    if (currentSection?.exercises?.length > 0) {
      setSelectedExercise(currentSection.exercises[0]);
    }
  }, [currentSectionIdx, currentSection]);

  const handleExerciseUpdate = useCallback(async (exerciseId, field, value) => {
    const url = adminPlay
      ? `/api/admin/exercises/${exerciseId}`
      : `/api/routines/exercises/${exerciseId}`;
    try {
      await axios.patch(url, { [field]: value });
      // Actualizar el estado en memoria para que el valor persista al re-renderizar
      setRoutine(prev => ({
        ...prev,
        sections: prev.sections.map(s => ({
          ...s,
          exercises: s.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, [field]: value } : ex
          )
        }))
      }));
    } catch {}
  }, [adminPlay]);

  const handleNext = async () => {
    if (isLastSection) {
      if (sessionId) {
        await axios.post(`/api/workouts/${sessionId}/complete`);
      }
      setShowConfetti(true);
    } else {
      setCurrentSectionIdx(i => i + 1);
    }
  };

  const handleSaveWellbeing = async () => {
    if (wellbeingScore && routineId) {
      try {
        await axios.post(`/api/admin/routines/${routineId}/wellbeing`, { score: wellbeingScore });
      } catch {}
    }
    setWellbeingDone(true);
  };

  // Pantalla de bienestar (solo admin play, antes de empezar)
  if (adminPlay && !wellbeingDone && !loading && !error && routine) return (
    <div className="min-h-screen p-4 max-w-lg mx-auto flex flex-col justify-center gap-6">
      <div className="card">
        <h2 className="text-xl font-black text-white text-center mb-1">¿Cómo se siente hoy?</h2>
        <p className="text-gray-400 text-sm text-center mb-6">{routine.name}</p>
        <WellbeingScale selected={wellbeingScore} onSelect={setWellbeingScore} />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setWellbeingDone(true)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-5 py-4 rounded-2xl transition-colors"
        >
          Omitir
        </button>
        <button
          onClick={handleSaveWellbeing}
          className={`btn-primary flex-1 py-4 transition-opacity ${!wellbeingScore ? 'opacity-40 cursor-not-allowed' : ''}`}
          disabled={!wellbeingScore}
        >
          Guardar y empezar
        </button>
      </div>
    </div>
  );

  if (showConfetti) return (
    <ConfettiScreen
      onDone={() => navigate(adminPlay ? `/admin/users/${userId}` : '/')}
      onTrainNow={!adminPlay ? () => navigate('/routine') : undefined}
    />
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-6">
      <div className="text-6xl">🎉</div>
      <p className="text-xl font-bold text-white">{error}</p>
      <button
        className="btn-secondary max-w-xs"
        onClick={() => navigate(adminPlay ? `/admin/users/${userId}` : '/')}
      >
        Volver al inicio
      </button>
    </div>
  );

  const videoId = getYouTubeId(selectedExercise?.youtubeUrl);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950">
      {/* Top 50% — Video */}
      <div className="h-1/2 bg-black relative flex-shrink-0">
        <VideoPanel videoId={videoId} />

        <button
          onClick={() => navigate(adminPlay ? `/admin/users/${userId}` : '/')}
          className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-xl"
        >
          ← Volver
        </button>

        {adminPlay && (
          <span className="absolute top-3 right-3 z-10 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
            Vista admin
          </span>
        )}
      </div>

      {/* Bottom 50% — Bloque activo */}
      <div className="h-1/2 flex flex-col overflow-hidden">
        {/* Header del bloque */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0 border-b border-gray-800/60">
          <div className="min-w-0 flex-1">
            <h2 className="text-white font-black text-base leading-tight truncate">
              {currentSection?.name}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5 truncate">{routine?.name}</p>
          </div>
          {/* Indicador de progreso */}
          <div className="flex gap-1.5 ml-3 flex-shrink-0">
            {activeSections.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-5 rounded-full transition-all ${
                  i < currentSectionIdx ? 'bg-brand-500' :
                  i === currentSectionIdx ? 'bg-brand-400' :
                  'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Lista de ejercicios */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {currentSection?.exercises.map(ex => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              isSelected={selectedExercise?.id === ex.id}
              onSelect={() => setSelectedExercise(ex)}
              onExerciseUpdate={handleExerciseUpdate}
            />
          ))}
        </div>

        {/* Botones navegación */}
        <div className="px-4 py-3 flex-shrink-0 flex gap-2">
          <button
            onClick={() => setCurrentSectionIdx(i => Math.max(0, i - 1))}
            disabled={currentSectionIdx === 0}
            className="w-1/5 bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-black py-4 rounded-2xl text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button
            onClick={handleNext}
            className="w-4/5 bg-brand-500 hover:bg-brand-400 active:scale-95 text-white font-black py-4 rounded-2xl text-base transition-all"
          >
            {isLastSection ? '🏁 Finalizar entrenamiento' : 'Completar bloque →'}
          </button>
        </div>
      </div>
    </div>
  );
}
