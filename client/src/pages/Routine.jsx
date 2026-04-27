import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import RoutineSection from '../components/RoutineSection.jsx';
import ConfettiScreen from '../components/ConfettiScreen.jsx';
import WellbeingScale from '../components/WellbeingScale.jsx';

export default function Routine({ adminPlay = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId, routineId } = useParams();

  const [routine, setRoutine] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
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
        const fbMap = {};
        data.feedbacks?.forEach(fb => { fbMap[fb.exerciseId] = fb.feedback; });
        setFeedbacks(fbMap);
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

  const sectionComplete = currentSection
    ? currentSection.exercises.every(ex => feedbacks[ex.id])
    : false;

  const handleFeedback = useCallback(async (exerciseId, value) => {
    setFeedbacks(prev => ({ ...prev, [exerciseId]: value }));
    if (sessionId) {
      await axios.post(`/api/workouts/${sessionId}/feedback`, { exerciseId, feedback: value });
    }
  }, [sessionId]);

  const handleExerciseUpdate = useCallback(async (exerciseId, field, value) => {
    const url = adminPlay
      ? `/api/admin/exercises/${exerciseId}`
      : `/api/routines/exercises/${exerciseId}`;
    try { await axios.patch(url, { [field]: value }); } catch {}
  }, [adminPlay]);

  const handleNext = async () => {
    if (!sectionComplete) return;
    if (isLastSection) {
      if (sessionId) {
        await axios.post(`/api/workouts/${sessionId}/complete`);
      }
      setShowConfetti(true);
    } else {
      setCurrentSectionIdx(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveWellbeing = async () => {
    if (wellbeingScore && routineId) {
      try {
        await axios.post(`/api/admin/routines/${routineId}/wellbeing`, { score: wellbeingScore });
      } catch {} // no bloquear si falla
    }
    setWellbeingDone(true);
  };

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
      <button className="btn-secondary max-w-xs" onClick={() => navigate(adminPlay ? `/admin/users/${userId}` : '/')}>
        Volver al inicio
      </button>
    </div>
  );

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 mb-6">
        <button
          onClick={() => navigate(adminPlay ? `/admin/users/${userId}` : '/')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
        >
          ← Volver
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white truncate">{routine?.name}</h1>
          <p className="text-gray-500 text-xs">
            Sección {currentSectionIdx + 1} de {activeSections.length}
          </p>
        </div>
        {adminPlay && (
          <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
            Vista admin
          </span>
        )}
      </div>

      {/* Section progress dots */}
      <div className="flex gap-2 mb-6">
        {activeSections.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentSectionIdx ? 'bg-brand-500' :
              i === currentSectionIdx ? 'bg-brand-400 animate-pulse' :
              'bg-gray-800'
            }`}
          />
        ))}
      </div>

      {/* Current section */}
      {currentSection && (
        <RoutineSection
          section={currentSection}
          feedbacks={feedbacks}
          onFeedback={handleFeedback}
          onExerciseUpdate={handleExerciseUpdate}
        />
      )}

      {/* Next / Finish button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            className={`btn-primary transition-opacity ${sectionComplete ? 'opacity-100' : 'opacity-40 cursor-not-allowed'}`}
            onClick={handleNext}
            disabled={!sectionComplete}
          >
            {isLastSection ? '🏁 Finalizar Rutina' : 'Siguiente →'}
          </button>
          {!sectionComplete && (
            <p className="text-center text-gray-500 text-xs mt-2">
              Completá todos los feedbacks para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
