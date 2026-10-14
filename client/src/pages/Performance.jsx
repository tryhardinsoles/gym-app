import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function getYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:[?&]v=|youtu\.be\/)([^&?\s]{11})/);
  return m?.[1] ?? null;
}

const CustomTooltipStrength = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-brand-400 font-black">{payload[0].value} kg</p>
    </div>
  );
};

const CustomTooltipVolume = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-blue-400 font-black">{payload[0].value} reps totales</p>
    </div>
  );
};

function addClassLabels(logs) {
  return logs.map((l, i) => ({ ...l, classLabel: `Día ${i + 1}` }));
}

function HamburgerButton({ open, onClick }) {
  return (
    <button onClick={onClick}
      className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors"
      style={{ gap: '6px' }}>
      <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1)', transform: open ? 'translateY(8px) rotate(45deg)' : 'none' }} />
      <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'opacity 0.2s ease 0.05s', opacity: open ? 0 : 1 }} />
      <span style={{ display:'block', height:'2px', borderRadius:'999px', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1), width 0.3s ease', width: open ? '20px' : '12px', backgroundColor: open ? '#ffffff' : '#e01020', transform: open ? 'translateY(-8px) rotate(-45deg)' : 'none' }} />
    </button>
  );
}

export default function Performance() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [xMode, setXMode] = useState('date');
  const [loading, setLoading] = useState(true);
  const chartsRef = useRef(null);

  useEffect(() => {
    axios.get('/api/performance').then(({ data }) => {
      setData(data);
      if (data.exercises?.length > 0) setSelected(data.exercises[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const handleSelect = (id) => {
    setSelected(id);
    setView('detail');
  };

  const exercise = data?.exercises?.find(e => e.id === selected);
  const strengthLogs = addClassLabels(exercise?.logs?.filter(l => l.weight != null) ?? []);
  const volumeLogs   = addClassLabels(exercise?.logs?.filter(l => l.volume != null) ?? []);
  const xKey = xMode === 'date' ? 'date' : 'classLabel';

  const stats = (() => {
    const wl = strengthLogs;
    const vl = volumeLogs;
    const sessions = exercise?.logs?.length ?? 0;
    const maxWeight = wl.length ? Math.max(...wl.map(l => l.weight)) : null;
    const avgWeight = wl.length ? (wl.reduce((a, b) => a + b.weight, 0) / wl.length).toFixed(1) : null;
    const weightPct = wl.length >= 2
      ? Math.round(((wl[wl.length - 1].weight - wl[0].weight) / wl[0].weight) * 100)
      : null;
    const maxVolume = vl.length ? Math.max(...vl.map(l => l.volume)) : null;
    return { sessions, maxWeight, avgWeight, weightPct, maxVolume };
  })();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Plan gate ─────────────────────────────────────────────────────────────
  if (data?.plan !== 'performance') return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />
      <div className="flex justify-between items-center pt-6 pb-2">
        <HamburgerButton open={sidebarOpen} onClick={() => setSidebarOpen(v => !v)} />
        <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Performance</span>
        <div className="w-10" />
      </div>
      <div className="mt-20 flex flex-col items-center text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-gray-800 flex items-center justify-center mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <p className="text-white font-black text-xl mb-2">Plan Performance</p>
        <p className="text-gray-500 text-sm leading-relaxed">
          Esta sección está disponible únicamente para los alumnos del plan Performance. Hablá con tu entrenador para actualizar tu plan.
        </p>
      </div>
    </div>
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  if (data?.exercises?.length === 0) return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />
      <div className="flex justify-between items-center pt-6 pb-2">
        <HamburgerButton open={sidebarOpen} onClick={() => setSidebarOpen(v => !v)} />
        <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Performance</span>
        <div className="w-10" />
      </div>
      <div className="mt-20 flex flex-col items-center text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-gray-800 flex items-center justify-center mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <p className="text-white font-black text-xl mb-2">Sin datos aún</p>
        <p className="text-gray-500 text-sm leading-relaxed">
          Completá al menos una rutina para ver tus gráficos de progreso.
        </p>
      </div>
    </div>
  );

  // ── Detail view (charts) ──────────────────────────────────────────────────
  if (view === 'detail' && exercise) return (
    <div className="min-h-screen p-4 max-w-lg mx-auto pb-10">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />

      {/* Header */}
      <div className="flex justify-between items-center pt-6 pb-2">
        <HamburgerButton open={sidebarOpen} onClick={() => setSidebarOpen(v => !v)} />
        <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Performance</span>
        <div className="w-10" />
      </div>

      {/* Back + exercise name */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setView('list')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors shrink-0"
        >
          ← Lista
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          {(() => {
            const id = getYoutubeId(exercise.youtubeUrl);
            return id ? (
              <img
                src={`https://img.youtube.com/vi/${id}/default.jpg`}
                alt=""
                className="w-10 h-8 rounded-lg object-cover shrink-0"
              />
            ) : null;
          })()}
          <p className="text-white font-black text-lg leading-tight truncate">{exercise.name}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4" ref={chartsRef}>
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-white">{stats.sessions}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">sesiones</p>
          </div>
          {stats.maxWeight != null && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-brand-400">{stats.maxWeight}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">kg máx</p>
            </div>
          )}
          {stats.avgWeight != null && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-white">{stats.avgWeight}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">kg prom</p>
            </div>
          )}
          {stats.weightPct != null && (
            <div className={`border rounded-2xl p-3 text-center ${
              stats.weightPct >= 0
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <p className={`text-lg font-black ${stats.weightPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.weightPct >= 0 ? '+' : ''}{stats.weightPct}%
              </p>
              <p className="text-gray-600 text-[10px] mt-0.5">progreso</p>
            </div>
          )}
          {stats.maxVolume != null && stats.weightPct == null && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-blue-400">{stats.maxVolume}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">vol máx</p>
            </div>
          )}
        </div>

        {/* X-axis toggle */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-2xl p-1 w-fit">
          <button
            onClick={() => setXMode('date')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              xMode === 'date' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Fecha
          </button>
          <button
            onClick={() => setXMode('class')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              xMode === 'class' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            N° de clase
          </button>
        </div>

        {/* Strength chart */}
        {strengthLogs.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" />
              <p className="text-white font-black text-sm">Fuerza</p>
              <span className="text-gray-600 text-xs ml-auto">kg</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={strengthLogs} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey={xKey} tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false}
                  domain={[dataMin => Math.max(0, Math.floor(dataMin * 0.85)), dataMax => Math.ceil(dataMax * 1.1)]} />
                <Tooltip content={<CustomTooltipStrength />} cursor={{ stroke: '#333' }} />
                <Line type="monotone" dataKey="weight" stroke="#e01020" strokeWidth={2.5}
                  dot={{ fill: '#e01020', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#e01020' }}
                  animationDuration={900} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Volume chart */}
        {volumeLogs.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <p className="text-white font-black text-sm">Volumen</p>
              <span className="text-gray-600 text-xs ml-auto">reps × series</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={volumeLogs} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey={xKey} tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false}
                  domain={[dataMin => Math.max(0, Math.floor(dataMin * 0.85)), dataMax => Math.ceil(dataMax * 1.1)]} />
                <Tooltip content={<CustomTooltipVolume />} cursor={{ stroke: '#333' }} />
                <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#3b82f6' }}
                  animationDuration={900} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {strengthLogs.length === 0 && volumeLogs.length === 0 && (
          <div className="card py-8 text-center">
            <p className="text-gray-600 text-sm">Sin datos numéricos para este ejercicio.</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto flex flex-col" style={{ height: '100dvh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />

      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-6 pb-3 shrink-0">
        <HamburgerButton open={sidebarOpen} onClick={() => setSidebarOpen(v => !v)} />
        <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Performance</span>
        <div className="w-10" />
      </div>

      <p className="px-5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 shrink-0">
        Tus ejercicios — {data.exercises.length}
      </p>

      {/* Exercise list — fills remaining height */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {data.exercises.map(ex => {
          const videoId = getYoutubeId(ex.youtubeUrl);
          const isSelected = selected === ex.id;
          return (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex.id)}
              className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 transition-all text-left border ${
                isSelected
                  ? 'bg-brand-500/10 border-brand-500/30'
                  : 'bg-gray-900 border-gray-800 active:border-gray-600'
              }`}
            >
              {videoId ? (
                <img
                  src={`https://img.youtube.com/vi/${videoId}/default.jpg`}
                  alt=""
                  className="w-14 h-10 rounded-xl object-cover shrink-0 bg-gray-800"
                />
              ) : (
                <div className="w-14 h-10 rounded-xl bg-gray-800 shrink-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm leading-snug truncate ${isSelected ? 'text-brand-300' : 'text-white'}`}>
                  {ex.name}
                </p>
                <p className="text-gray-600 text-xs mt-0.5">
                  {ex.logs.length} {ex.logs.length === 1 ? 'sesión' : 'sesiones'}
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#ff2a35' : '#444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
