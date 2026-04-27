import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getRandomWelcome, getRandomCompleted } from '../data/messages.js';
import { getRandomQuote } from '../data/quotes.js';
import WellbeingScale from '../components/WellbeingScale.jsx';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wellbeing, setWellbeing] = useState(null);
  const [saved, setSaved] = useState(false);
  const [lastCompleted, setLastCompleted] = useState(null);
  const [hasPending, setHasPending] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/workouts/last-completed'),
      axios.get('/api/routines/has-pending'),
      axios.get('/api/routines/history'),
    ]).then(([lastRes, pendingRes, historyRes]) => {
      setLastCompleted(lastRes.data?.completedAt ? new Date(lastRes.data.completedAt) : null);
      setHasPending(pendingRes.data.hasPending);
      setHistory(historyRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const recentlyCompleted = lastCompleted &&
    (Date.now() - lastCompleted.getTime() < EIGHT_HOURS_MS);

  const message = useMemo(() => {
    if (!user) return '';
    return recentlyCompleted
      ? getRandomCompleted(user.username)
      : getRandomWelcome(user.username);
  }, [user, recentlyCompleted]);

  const quote = useMemo(() => getRandomQuote(), []);

  const historyByMes = useMemo(() => {
    return history.reduce((acc, r) => {
      const mes = r.mes ?? 1;
      if (!acc[mes]) acc[mes] = [];
      acc[mes].push(r);
      return acc;
    }, {});
  }, [history]);
  const historyMesNumbers = useMemo(
    () => Object.keys(historyByMes).map(Number).sort((a, b) => a - b),
    [historyByMes]
  );

  const handleWellbeing = async (score) => {
    setWellbeing(score);
    await axios.post('/api/wellbeing', { score });
    setSaved(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const HistorySection = () => {
    if (history.length === 0) return null;
    return (
      <div className="mt-8 pb-10">
        <h2 className="text-lg font-black text-white mb-4">
          Historial — {history.length} {history.length === 1 ? 'rutina' : 'rutinas'} completadas
        </h2>
        {historyMesNumbers.map(mes => (
          <div key={mes} className="mb-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
              Mes {mes}
            </p>
            <div className="space-y-2">
              {historyByMes[mes].map(r => (
                <div key={r.id} className="card flex items-center justify-between py-3 px-4">
                  <p className="font-bold text-white text-sm">{r.name}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">
                      {new Date(r.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      Completada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Sin rutinas pendientes → mostrar cita motivacional + historial
  if (!hasPending) return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center pt-6 pb-2">
        <span className="text-gray-500 text-sm font-medium">GymApp</span>
        <button onClick={logout} className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          Salir
        </button>
      </div>

      <div className="flex flex-col items-center py-10 gap-8">
        <div className="text-center">
          <p className="text-2xl font-black text-white">Hola, {user?.username}</p>
          <p className="text-gray-400 mt-2">No tenés rutinas pendientes por ahora.</p>
        </div>

        <div className="card text-center w-full">
          <blockquote className="text-white text-lg font-semibold leading-snug mb-4">
            "{quote.text}"
          </blockquote>
          <p className="text-brand-400 text-sm italic">— {quote.author}</p>
        </div>

        <p className="text-gray-600 text-sm text-center px-4">
          Tu profe va a cargarte nuevas rutinas pronto.
        </p>
      </div>

      <HistorySection />
    </div>
  );

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center pt-6 pb-2">
        <span className="text-gray-500 text-sm font-medium">GymApp</span>
        <button onClick={logout} className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          Salir
        </button>
      </div>

      {/* Welcome card */}
      <div className="card mt-6 text-center">
        <p className="text-xl font-bold text-white leading-tight">{message}</p>
        {recentlyCompleted && lastCompleted && (
          <p className="text-brand-400 text-sm mt-3 font-medium">
            Completado hace {Math.floor((Date.now() - lastCompleted.getTime()) / 60000)} min
          </p>
        )}
      </div>

      {/* Wellbeing question */}
      <div className="card mt-4">
        <p className="text-center text-lg font-bold mb-5 text-white">
          ¿Cómo te sentís hoy?
        </p>
        <WellbeingScale selected={wellbeing} onSelect={handleWellbeing} />
        {saved && (
          <p className="text-center text-brand-400 text-sm mt-3 font-semibold animate-pulse">
            ¡Guardado!
          </p>
        )}
      </div>

      {/* Start button */}
      <div className="mt-6">
        <button
          className="btn-primary text-xl py-5"
          onClick={() => navigate('/routine')}
        >
          Comenzar Rutina
        </button>
      </div>

      <HistorySection />
    </div>
  );
}
