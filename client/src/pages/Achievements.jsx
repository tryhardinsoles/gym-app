import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CountUp from '../components/CountUp.jsx';
import SpotlightCard from '../components/SpotlightCard.jsx';

const ACHIEVEMENTS = [
  { id: 'first_workout',   icon: '🔥', title: 'Primera llama',       desc: 'Completaste tu primer entrenamiento',     check: (s) => s.totalSessions >= 1 },
  { id: 'five_workouts',   icon: '💪', title: 'En racha',            desc: '5 entrenamientos completados',            check: (s) => s.totalSessions >= 5 },
  { id: 'ten_workouts',    icon: '🏅', title: 'Constancia',          desc: '10 entrenamientos completados',           check: (s) => s.totalSessions >= 10 },
  { id: 'twenty_five',     icon: '⚡', title: 'Máquina',             desc: '25 entrenamientos completados',           check: (s) => s.totalSessions >= 25 },
  { id: 'fifty',           icon: '🏆', title: 'Élite',               desc: '50 entrenamientos completados',           check: (s) => s.totalSessions >= 50 },
  { id: 'first_pr',        icon: '🎯', title: 'Primer récord',       desc: 'Superaste un máximo personal',           check: (s) => s.exercisesWithPR >= 1 },
  { id: 'five_prs',        icon: '🌟', title: 'Coleccionista',       desc: 'Récords en 5 ejercicios distintos',       check: (s) => s.exercisesWithPR >= 5 },
  { id: 'ten_prs',         icon: '💥', title: 'Dominador',           desc: 'Récords en 10 ejercicios distintos',      check: (s) => s.exercisesWithPR >= 10 },
  { id: 'variety',         icon: '🎪', title: 'Variedad',            desc: 'Entrenaste más de 15 ejercicios únicos', check: (s) => s.uniqueExercises >= 15 },
  { id: 'volume_king',     icon: '👑', title: 'Rey del volumen',     desc: 'Acumulaste 1000+ repeticiones totales',   check: (s) => s.totalReps >= 1000 },
];

export default function Achievements() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [perfRes, histRes] = await Promise.all([
          axios.get('/api/performance'),
          axios.get('/api/routines/history'),
        ]);
        setExercises(perfRes.data.exercises || []);
        setHistory(histRes.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const stats = (() => {
    const totalSessions = history.length;
    const uniqueExercises = exercises.length;
    let totalReps = 0;
    let exercisesWithPR = 0;

    for (const ex of exercises) {
      const logs = ex.logs || [];
      if (logs.length < 2) continue;
      let maxW = null;
      let hasPR = false;
      for (const log of logs) {
        if (log.weight != null) {
          if (maxW == null) { maxW = log.weight; continue; }
          if (log.weight > maxW) { hasPR = true; maxW = log.weight; }
        }
        totalReps += (log.volume || 0);
      }
      if (hasPR) exercisesWithPR++;
    }

    return { totalSessions, uniqueExercises, exercisesWithPR, totalReps };
  })();

  const prs = exercises
    .map(ex => {
      const withWeight = (ex.logs || []).filter(l => l.weight != null);
      if (!withWeight.length) return null;
      const maxWeight = Math.max(...withWeight.map(l => l.weight));
      const firstLog = withWeight[0];
      const lastLog = withWeight[withWeight.length - 1];
      const improved = withWeight.length > 1 && lastLog.weight > firstLog.weight;
      return { name: ex.name, maxWeight, sessions: withWeight.length, improved };
    })
    .filter(Boolean)
    .sort((a, b) => b.maxWeight - a.maxWeight);

  const earned = ACHIEVEMENTS.filter(a => a.check(stats));
  const locked = ACHIEVEMENTS.filter(a => !a.check(stats));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur px-4 pt-10 pb-4 border-b border-gray-800/60">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <h1 className="text-white font-black text-xl leading-tight">Logros</h1>
            <p className="text-gray-500 text-xs">{earned.length}/{ACHIEVEMENTS.length} desbloqueados</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 pt-6">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Entrenamientos', value: stats.totalSessions },
            { label: 'Ejercicios únicos', value: stats.uniqueExercises },
            { label: 'Récords rotos', value: stats.exercisesWithPR },
          ].map(s => (
            <div key={s.label} className="card text-center py-4">
              <CountUp to={s.value} className="text-white font-black text-2xl" />
              <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Earned achievements */}
        {earned.length > 0 && (
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Desbloqueados</p>
            <div className="grid grid-cols-2 gap-3">
              {earned.map((a, i) => (
                <SpotlightCard
                  key={a.id}
                  className="flex items-start gap-3 py-4"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="text-2xl shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.5))' }}>{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white font-black text-sm leading-tight">{a.title}</p>
                    <p className="text-gray-500 text-[10px] leading-snug mt-0.5">{a.desc}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        )}

        {/* Locked achievements */}
        {locked.length > 0 && (
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Por desbloquear</p>
            <div className="grid grid-cols-2 gap-3">
              {locked.map(a => (
                <div key={a.id} className="card flex items-start gap-3 py-4 opacity-40">
                  <span className="text-2xl shrink-0 grayscale">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white font-black text-sm leading-tight">{a.title}</p>
                    <p className="text-gray-500 text-[10px] leading-snug mt-0.5">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRs table */}
        {prs.length > 0 && (
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Récords personales</p>
            <div className="card p-0 overflow-hidden divide-y divide-gray-800/60">
              {prs.map((pr, i) => (
                <div key={pr.name} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-gray-600 text-xs font-black w-5 shrink-0 text-center">{i + 1}</span>
                  <span className="flex-1 text-white text-sm font-semibold truncate">{pr.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {pr.improved && (
                      <span className="text-[9px] font-black text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
                        🏅 PR
                      </span>
                    )}
                    <span className="text-white font-black text-sm">{pr.maxWeight} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {prs.length === 0 && !loading && (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="text-gray-500 text-sm">Completá entrenamientos para ver tus récords acá</p>
          </div>
        )}
      </div>
    </div>
  );
}
