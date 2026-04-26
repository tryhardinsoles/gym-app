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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/workouts/last-completed'),
      axios.get('/api/routines/has-pending')
    ]).then(([lastRes, pendingRes]) => {
      setLastCompleted(lastRes.data?.completedAt ? new Date(lastRes.data.completedAt) : null);
      setHasPending(pendingRes.data.hasPending);
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

  // Sin rutinas pendientes → mostrar cita motivacional famosa
  if (!hasPending) return (
    <div className="min-h-screen p-4 max-w-lg mx-auto flex flex-col">
      <div className="flex justify-between items-center pt-6 pb-2">
        <span className="text-gray-500 text-sm font-medium">GymApp</span>
        <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          Salir
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-10 gap-8">
        <div className="text-center">
          <p className="text-2xl font-black text-white">Hola, {user?.username}</p>
          <p className="text-gray-400 mt-2">No tenés rutinas pendientes por ahora.</p>
        </div>

        <div className="card text-center max-w-sm mx-auto">
          <blockquote className="text-white text-lg font-semibold leading-snug mb-4">
            "{quote.text}"
          </blockquote>
          <p className="text-brand-400 text-sm italic">— {quote.author}</p>
        </div>

        <p className="text-gray-600 text-sm text-center px-4">
          Tu profe va a cargarte nuevas rutinas pronto. ¡Seguí entrenando!
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center pt-6 pb-2">
        <span className="text-gray-500 text-sm font-medium">GymApp</span>
        <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
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
      <div className="mt-6 pb-10">
        <button
          className="btn-primary text-xl py-5"
          onClick={() => navigate('/routine')}
        >
          Comenzar Rutina
        </button>
      </div>
    </div>
  );
}
