import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ExerciseRow from '../components/ExerciseRow.jsx';
import ConfettiScreen from '../components/ConfettiScreen.jsx';
import WellbeingScale from '../components/WellbeingScale.jsx';
import PRCelebration from '../components/PRCelebration.jsx';

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
  const [isOverview, setIsOverview] = useState(false);
  const [prAlert, setPrAlert] = useState(null); // { count, exercises[] }

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

  const parseWeightNum = (str) => {
    if (!str) return null;
    const m = String(str).match(/(\d+\.?\d*)/);
    return m ? parseFloat(m[1]) : null;
  };

  const doNext = async () => {
    if (isLastSection) {
      if (sessionId) await axios.post(`/api/workouts/${sessionId}/complete`);
      setShowConfetti(true);
    } else {
      setCurrentSectionIdx(i => i + 1);
    }
  };

  const handleNext = async () => {
    if (!adminPlay) {
      const newPRs = (currentSection?.exercises ?? []).filter(ex => {
        const current = parseWeightNum(ex.weight);
        return current != null && ex.prWeight != null && current > ex.prWeight;
      });
      if (newPRs.length > 0) {
        setPrAlert({ count: newPRs.length, exercises: newPRs.map(e => e.name) });
        return;
      }
    }
    await doNext();
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

  if (prAlert) return (
    <PRCelebration
      count={prAlert.count}
      exercises={prAlert.exercises}
      onDismiss={async () => { setPrAlert(null); await doNext(); }}
    />
  );

  const handleExerciseInOverview = (sectionIdx, exercise) => {
    setCurrentSectionIdx(sectionIdx);
    setSelectedExercise(exercise);
    setIsOverview(false);
  };

  const TRANSITION = 'height 0.45s cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950">
      {/* Video — 35% normal, 0 in overview */}
      <div
        style={{
          height: isOverview ? '0%' : '35%',
          transition: TRANSITION,
          flexShrink: 0,
          overflow: 'hidden',
        }}
        className="bg-black relative"
      >
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

      {/* Bottom — 65% normal, 100% in overview */}
      <div
        style={{ height: isOverview ? '100%' : '65%', transition: TRANSITION }}
        className="flex flex-col overflow-hidden"
      >
        {/* Header del bloque */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-3 flex-shrink-0 border-b border-gray-800/60">
          {/* Izquierda: nombre del bloque */}
          {isOverview ? (
            <button
              onClick={() => navigate(adminPlay ? `/admin/users/${userId}` : '/')}
              className="text-gray-500 hover:text-white text-sm font-bold transition-colors flex-1"
            >
              ← Volver
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-black text-base leading-tight truncate">
                {currentSection?.name}
              </h2>
              <p className="text-gray-500 text-xs mt-0.5 truncate">{routine?.name}</p>
            </div>
          )}

          {/* Centro: botón overview */}
          <button
            onClick={() => setIsOverview(v => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
              isOverview ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title={isOverview ? 'Volver al bloque' : 'Ver todos los bloques'}
          >
            {isOverview ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            )}
          </button>

          {/* Derecha: puntos de progreso */}
          {!isOverview && (
            <div className="flex gap-1.5 flex-shrink-0">
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
          )}
        </div>

        {isOverview ? (
          /* ── Overview: all sections ────────────────────────── */
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 pb-6">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">{routine?.name}</p>
            {activeSections.map((section, sIdx) => {
              const isCurrent = sIdx === currentSectionIdx;
              const isPast = sIdx < currentSectionIdx;
              return (
                <div key={section.id} className={isPast ? 'opacity-40' : ''}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isPast ? 'bg-brand-500' : isCurrent ? 'bg-brand-400 animate-pulse' : 'bg-gray-700'
                    }`} />
                    <p className={`text-xs font-black uppercase tracking-widest flex-1 truncate ${
                      isCurrent ? 'text-brand-400' : 'text-gray-500'
                    }`}>
                      {section.name}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                        Actual
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full font-bold shrink-0">
                        Completado
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {section.exercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => handleExerciseInOverview(sIdx, ex)}
                        className="w-full text-left rounded-2xl px-3 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 active:scale-[0.98] transition-all flex items-center justify-between gap-3"
                      >
                        <span className="text-white text-sm font-semibold truncate">{ex.name}</span>
                        <div className="flex gap-3 text-xs text-gray-500 shrink-0">
                          <span>{ex.series} ×</span>
                          <span>{ex.repetitions}</span>
                          {ex.weight && <span className="text-gray-400">{ex.weight}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Normal: current section ───────────────────────── */
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
