import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getRandomWelcome, getRandomCompleted } from '../data/messages.js';
import { getRandomQuote } from '../data/quotes.js';
import WellbeingScale from '../components/WellbeingScale.jsx';
import Sidebar from '../components/Sidebar.jsx';
import StarBorder from '../components/StarBorder.jsx';
import OnboardingOverlay from '../components/OnboardingOverlay.jsx';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const IS_STANDALONE = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;

function HistorySection({ history, historyMesNumbers, historyByMes, expandedHealth, healthDraft, savingHealth, openHealth, saveHealth, setExpandedHealth, setHealthDraft }) {
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
            {historyByMes[mes].map(r => {
              const hasHealth = r.sleepHours != null || r.hrAvg != null;
              const isExpanded = expandedHealth === r.id;
              return (
                <div key={r.id} className="card py-3 px-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white text-sm">{r.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">
                        {new Date(r.completedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-2 py-0.5 rounded-full">✓</span>
                    </div>
                  </div>

                  {hasHealth && !isExpanded && (
                    <button onClick={() => openHealth(r)} className="mt-2 flex items-center gap-3 text-[11px] text-gray-400 w-full text-left">
                      {r.sleepHours != null && <span>💤 {r.sleepHours}h</span>}
                      {r.hrAvg != null && <span>❤️ {r.hrAvg} ppm</span>}
                      {r.hrMax != null && <span className="text-red-400">↑{r.hrMax}</span>}
                      {r.hrMin != null && <span className="text-green-400">↓{r.hrMin}</span>}
                      <span className="ml-auto text-gray-600 text-[10px]">editar</span>
                    </button>
                  )}

                  {!hasHealth && !isExpanded && r.sessionId && (
                    <button onClick={() => openHealth(r)} className="mt-2 text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
                      + Agregar sueño y frecuencia cardíaca
                    </button>
                  )}

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-700/60 space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 mb-1">
                          💤 Horas de sueño
                          <span className="text-gray-600 font-normal ml-1">(podés verlo en tu celular o smartwatch)</span>
                        </p>
                        <input
                          type="number" min="1" max="14" step="0.5" placeholder="ej. 7.5"
                          value={healthDraft.sleepHours}
                          onChange={e => setHealthDraft(d => ({ ...d, sleepHours: e.target.value }))}
                          className="w-full bg-gray-800 rounded-xl px-3 py-2 text-white text-sm outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 mb-1">
                          ❤️ Frecuencia cardíaca del entrenamiento
                          <span className="text-gray-600 font-normal ml-1">(de tu smartwatch)</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: 'hrMax', label: 'Máx', color: 'text-red-400' },
                            { key: 'hrMin', label: 'Mín', color: 'text-green-400' },
                            { key: 'hrAvg', label: 'Prom', color: 'text-yellow-400' },
                          ].map(({ key, label, color }) => (
                            <div key={key}>
                              <p className={`text-[10px] font-bold mb-0.5 ${color}`}>{label}</p>
                              <input
                                type="number" min="40" max="220" placeholder="ppm"
                                value={healthDraft[key]}
                                onChange={e => {
                                  const val = e.target.value;
                                  setHealthDraft(d => {
                                    const next = { ...d, [key]: val };
                                    if (key === 'hrMax' || key === 'hrMin') {
                                      const max = parseFloat(key === 'hrMax' ? val : d.hrMax);
                                      const min = parseFloat(key === 'hrMin' ? val : d.hrMin);
                                      if (!isNaN(max) && !isNaN(min)) {
                                        next.hrAvg = String(Math.round((max + min) / 2));
                                      }
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full bg-gray-800 rounded-xl px-2 py-2 text-white text-sm outline-none text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setExpandedHealth(null)} className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold">
                          Cancelar
                        </button>
                        <button onClick={() => saveHealth(r)} disabled={savingHealth} className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-xs font-black disabled:opacity-50">
                          {savingHealth ? '...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wellbeing, setWellbeing] = useState(null);
  const [saved, setSaved] = useState(false);
  const [lastCompleted, setLastCompleted] = useState(null);
  const [hasPending, setHasPending] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedHealth, setExpandedHealth] = useState(null);
  const [healthDraft, setHealthDraft] = useState({});
  const [savingHealth, setSavingHealth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [appInstalled, setAppInstalled] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const seen = localStorage.getItem(`onboarded_${user.id}`);
      if (!seen) setShowOnboarding(true);
    } catch {}
  }, [user]);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setAppInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const fetchData = () => {
    setLoading(true);
    return Promise.all([
      axios.get('/api/workouts/last-completed'),
      axios.get('/api/routines/has-pending'),
      axios.get('/api/routines/history'),
    ]).then(([lastRes, pendingRes, historyRes]) => {
      setLastCompleted(lastRes.data?.completedAt ? new Date(lastRes.data.completedAt) : null);
      setHasPending(pendingRes.data.hasPending);
      setPendingCount(pendingRes.data.pendingCount ?? 0);
      setHistory(historyRes.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

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

  // ── Datos de salud — hooks ANTES del early return ────────────────────────
  const openHealth = useCallback((r) => {
    setExpandedHealth(r.id);
    setHealthDraft({
      sleepHours: r.sleepHours ?? '',
      hrMax: r.hrMax ?? '',
      hrMin: r.hrMin ?? '',
      hrAvg: r.hrAvg ?? '',
    });
  }, []);

  const saveHealth = useCallback(async (r) => {
    if (!r.sessionId) return;
    setSavingHealth(true);
    try {
      await axios.patch(`/api/workouts/${r.sessionId}/health-stats`, healthDraft);
      setHistory(prev => prev.map(h => h.id === r.id ? {
        ...h,
        sleepHours: healthDraft.sleepHours !== '' ? parseFloat(healthDraft.sleepHours) : null,
        hrMax: healthDraft.hrMax !== '' ? parseInt(healthDraft.hrMax) : null,
        hrMin: healthDraft.hrMin !== '' ? parseInt(healthDraft.hrMin) : null,
        hrAvg: healthDraft.hrAvg !== '' ? parseInt(healthDraft.hrAvg) : null,
      } : h));
      setExpandedHealth(null);
    } catch {}
    setSavingHealth(false);
  }, [healthDraft]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const Header = () => (
    <div className="flex justify-between items-center pt-6 pb-2">
      <button
        onClick={() => setSidebarOpen(v => !v)}
        className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors"
        style={{ gap: '6px' }}
      >
        <span style={{
          display: 'block', height: '2px', width: '20px', borderRadius: '999px', backgroundColor: '#ffffff',
          transition: 'transform 0.35s cubic-bezier(0.23,1,0.32,1)',
          transform: sidebarOpen ? 'translateY(8px) rotate(45deg)' : 'none',
        }} />
        <span style={{
          display: 'block', height: '2px', width: '20px', borderRadius: '999px', backgroundColor: '#ffffff',
          transition: 'opacity 0.2s ease 0.05s, transform 0.3s ease',
          opacity: sidebarOpen ? 0 : 1,
          transform: sidebarOpen ? 'scaleX(0.3)' : 'none',
        }} />
        <span style={{
          display: 'block', height: '2px', borderRadius: '999px',
          transition: 'transform 0.35s cubic-bezier(0.23,1,0.32,1), width 0.3s ease, background-color 0.2s ease, margin-left 0.3s ease',
          width: sidebarOpen ? '20px' : '12px',
          backgroundColor: sidebarOpen ? '#ffffff' : '#e01020',
          transform: sidebarOpen ? 'translateY(-8px) rotate(-45deg)' : 'none',
          marginLeft: sidebarOpen ? '0px' : '4px',
        }} />
      </button>
      <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Tryhard Training</span>
      <div className="w-10" />
    </div>
  );

  const InstallBanner = () => {
    if (IS_STANDALONE || appInstalled) return null;
    const isIOS = IS_IOS;
    if (!isIOS && !installPrompt) return null;
    return (
      <div className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold">Guardala en tu celular</p>
          <p className="text-gray-600 text-[10px]">
            {isIOS ? 'Compartir → Agregar a pantalla de inicio' : 'Instalá la app para acceso rápido'}
          </p>
        </div>
        {!isIOS && installPrompt && (
          <button
            onClick={async () => {
              installPrompt.prompt();
              const { outcome } = await installPrompt.userChoice;
              if (outcome === 'accepted') setAppInstalled(true);
            }}
            className="shrink-0 bg-brand-500 text-white text-xs font-black px-3 py-1.5 rounded-xl"
          >
            Instalar
          </button>
        )}
      </div>
    );
  };

  // Sin rutinas pendientes → mostrar cita motivacional + historial
  if (!hasPending) return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {showOnboarding && <OnboardingOverlay userId={user?.id} onDone={() => setShowOnboarding(false)} />}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />
      <Header />

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

        <div className="space-y-3 w-full">
          <p className="text-gray-600 text-sm text-center px-4">
            Tu profe va a cargarte nuevas rutinas pronto.
          </p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-bold py-3 rounded-2xl transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : '↻ Verificar nuevas rutinas'}
          </button>
        </div>
      </div>

      <InstallBanner />
      <HistorySection history={history} historyMesNumbers={historyMesNumbers} historyByMes={historyByMes} expandedHealth={expandedHealth} healthDraft={healthDraft} savingHealth={savingHealth} openHealth={openHealth} saveHealth={saveHealth} setExpandedHealth={setExpandedHealth} setHealthDraft={setHealthDraft} />
    </div>
  );

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {showOnboarding && <OnboardingOverlay userId={user?.id} onDone={() => setShowOnboarding(false)} />}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />
      <Header />

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
        <StarBorder>
        <button
          className="btn-primary text-xl py-5 relative"
          onClick={() => navigate('/routine')}
        >
          Comenzar Rutina
          {pendingCount > 1 && (
            <span className="absolute -top-1.5 -right-1.5 bg-white text-brand-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
        </StarBorder>
      </div>

      <InstallBanner />
      <HistorySection history={history} historyMesNumbers={historyMesNumbers} historyByMes={historyByMes} expandedHealth={expandedHealth} healthDraft={healthDraft} savingHealth={savingHealth} openHealth={openHealth} saveHealth={saveHealth} setExpandedHealth={setExpandedHealth} setHealthDraft={setHealthDraft} />
    </div>
  );
}
