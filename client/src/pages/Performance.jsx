import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import {
  LineChart, Line,
  BarChart, Bar, Cell,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function wellbeingColor(score) {
  if (score >= 7) return '#4ade80';
  if (score >= 4) return '#facc15';
  return '#f87171';
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CustomTooltipStrength = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-brand-400 font-black">{payload[0].value} kg</p>
    </div>
  );
};

const CustomTooltipVolume = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-blue-400 font-black">{payload[0].value} reps totales</p>
    </div>
  );
};

const CustomTooltipWellbeing = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="font-black" style={{ color: wellbeingColor(score) }}>{score}/10</p>
    </div>
  );
};

const WellbeingDot = (props) => {
  const { cx, cy, payload } = props;
  const color = wellbeingColor(payload.score);
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#111" strokeWidth={1.5} />;
};

function addClassLabels(logs) {
  return logs.map((l, i) => ({ ...l, classLabel: `Día ${i + 1}` }));
}

function HamburgerButton({ open, onClick }) {
  return (
    <button onClick={onClick}
      className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors shrink-0"
      style={{ gap: '6px' }}>
      <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1)', transform: open ? 'translateY(8px) rotate(45deg)' : 'none' }} />
      <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'opacity 0.2s ease 0.05s', opacity: open ? 0 : 1 }} />
      <span style={{ display:'block', height:'2px', borderRadius:'999px', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1), width 0.3s ease', width: open ? '20px' : '12px', backgroundColor: open ? '#ffffff' : '#e01020', transform: open ? 'translateY(-8px) rotate(-45deg)' : 'none' }} />
    </button>
  );
}

export default function Performance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('exercises'); // 'exercises' | 'wellbeing' | 'health'
  const [xMode, setXMode] = useState('date');
  const [loading, setLoading] = useState(true);
  const [healthCorr, setHealthCorr] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get('/api/performance'),
      axios.get('/api/performance/health-correlation'),
    ]).then(([perfRes, corrRes]) => {
      setData(perfRes.data);
      if (perfRes.data.exercises?.length > 0) setSelected(perfRes.data.exercises[0].id);
      setHealthCorr(corrRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const exercise = data?.exercises?.find(e => e.id === selected);
  const strengthLogs = addClassLabels(exercise?.logs?.filter(l => l.weight != null) ?? []);
  const volumeLogs   = addClassLabels(exercise?.logs?.filter(l => l.volume != null) ?? []);
  const xKey = xMode === 'date' ? 'date' : 'classLabel';

  const stats = (() => {
    const wl = strengthLogs;
    const sessions = exercise?.logs?.length ?? 0;
    const maxWeight = wl.length ? Math.max(...wl.map(l => l.weight)) : null;
    const avgWeight = wl.length ? (wl.reduce((a, b) => a + b.weight, 0) / wl.length).toFixed(1) : null;
    const weightPct = wl.length >= 2
      ? Math.round(((wl[wl.length - 1].weight - wl[0].weight) / wl[0].weight) * 100)
      : null;
    return { sessions, maxWeight, avgWeight, weightPct };
  })();

  // Wellbeing stats
  const wellbeingStats = (() => {
    const logs = data?.wellbeingLogs ?? [];
    if (logs.length === 0) return null;
    const avg = (logs.reduce((a, b) => a + b.score, 0) / logs.length).toFixed(1);
    const max = Math.max(...logs.map(l => l.score));
    const min = Math.min(...logs.map(l => l.score));
    // Average by day of week
    const byDay = {};
    for (const l of logs) {
      if (!byDay[l.dayOfWeek]) byDay[l.dayOfWeek] = [];
      byDay[l.dayOfWeek].push(l.score);
    }
    const dayAvgs = DAY_LABELS.map((label, i) => {
      const scores = byDay[i];
      return {
        day: label,
        avg: scores ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : null,
        count: scores?.length ?? 0,
      };
    }).filter(d => d.avg != null);
    return { avg, max, min, total: logs.length, dayAvgs };
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
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
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

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto flex flex-col bg-gray-950" style={{ height: '100dvh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-5 pb-3 shrink-0">
        <HamburgerButton open={sidebarOpen} onClick={() => setSidebarOpen(v => !v)} />

        {/* Tabs — pill animado (3 tabs) */}
        {(() => {
          const TABS = [
            { key: 'exercises', label: 'Ejercicios' },
            { key: 'wellbeing', label: 'Percepción' },
            { key: 'health',    label: 'Salud' },
          ];
          const tabIdx = TABS.findIndex(t => t.key === tab);
          return (
            <div className="relative flex flex-1 items-center bg-gray-900 rounded-2xl p-1 mx-1">
              <div
                className="absolute top-1 bottom-1 bg-gray-700 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  width: 'calc((100% - 8px) / 3)',
                  left: `calc(4px + ${tabIdx} * (100% - 8px) / 3)`,
                }}
              />
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative flex-1 py-1.5 rounded-xl text-[10px] font-black transition-colors duration-200 z-10 ${
                    tab === t.key ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Home button */}
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors shrink-0"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
      </div>

      {/* ── Tab: Ejercicios ──────────────────────────────────────────────── */}
      {tab === 'exercises' && (
        data?.exercises?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-3xl bg-gray-800 flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <p className="text-white font-black text-xl mb-2">Sin datos aún</p>
            <p className="text-gray-500 text-sm">Completá al menos una rutina para ver tus gráficos de progreso.</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* Left: exercise list */}
            <div className="w-[38%] border-r border-gray-800 overflow-y-auto py-2 shrink-0">
              {data.exercises.map(ex => {
                const isSelected = selected === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setSelected(ex.id)}
                    className={`w-full flex flex-col items-center gap-1 px-2 py-3 transition-all border-l-2 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/8'
                        : 'border-transparent active:bg-gray-800/50'
                    }`}
                  >
                    <p className={`text-[10px] font-bold leading-tight text-center w-full line-clamp-3 ${
                      isSelected ? 'text-brand-300' : 'text-gray-300'
                    }`}>
                      {ex.name}
                    </p>
                    <p className="text-gray-600 text-[9px]">{ex.logs.length} ses.</p>
                  </button>
                );
              })}
            </div>

            {/* Right: charts */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {!exercise ? (
                <p className="text-gray-600 text-sm text-center mt-10">Seleccioná un ejercicio</p>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-2.5 text-center">
                      <p className="text-base font-black text-white">{stats.sessions}</p>
                      <p className="text-gray-600 text-[9px]">sesiones</p>
                    </div>
                    {stats.maxWeight != null && (
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-2.5 text-center">
                        <p className="text-base font-black text-brand-400">{stats.maxWeight} kg</p>
                        <p className="text-gray-600 text-[9px]">máximo</p>
                      </div>
                    )}
                    {stats.avgWeight != null && (
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-2.5 text-center">
                        <p className="text-base font-black text-white">{stats.avgWeight} kg</p>
                        <p className="text-gray-600 text-[9px]">promedio</p>
                      </div>
                    )}
                    {stats.weightPct != null && (
                      <div className={`border rounded-2xl p-2.5 text-center ${
                        stats.weightPct >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <p className={`text-base font-black ${stats.weightPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stats.weightPct >= 0 ? '+' : ''}{stats.weightPct}%
                        </p>
                        <p className="text-gray-600 text-[9px]">progreso</p>
                      </div>
                    )}
                  </div>

                  {/* X-axis toggle */}
                  <div className="flex items-center gap-1 bg-gray-900 rounded-xl p-0.5">
                    {['date', 'class'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setXMode(mode)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          xMode === mode ? 'bg-gray-700 text-white' : 'text-gray-500'
                        }`}
                      >
                        {mode === 'date' ? 'Fecha' : 'N° clase'}
                      </button>
                    ))}
                  </div>

                  {/* Strength chart */}
                  {strengthLogs.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                        <p className="text-white font-black text-xs">Fuerza</p>
                        <span className="text-gray-600 text-[10px] ml-auto">kg</span>
                      </div>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={strengthLogs} margin={{ top: 4, right: 6, left: -28, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                          <XAxis dataKey={xKey} tick={{ fill: '#555', fontSize: 8 }} axisLine={{ stroke: '#222' }} tickLine={false} />
                          <YAxis tick={{ fill: '#555', fontSize: 8 }} axisLine={false} tickLine={false}
                            domain={[d => Math.max(0, Math.floor(d * 0.85)), d => Math.ceil(d * 1.1)]} />
                          <Tooltip content={<CustomTooltipStrength />} cursor={{ stroke: '#333' }} />
                          <Line type="monotone" dataKey="weight" stroke="#e01020" strokeWidth={2}
                            dot={{ fill: '#e01020', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#e01020' }}
                            animationDuration={700} animationEasing="ease-out" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Volume chart */}
                  {volumeLogs.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <p className="text-white font-black text-xs">Volumen</p>
                        <span className="text-gray-600 text-[10px] ml-auto">reps × series</span>
                      </div>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={volumeLogs} margin={{ top: 4, right: 6, left: -28, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                          <XAxis dataKey={xKey} tick={{ fill: '#555', fontSize: 8 }} axisLine={{ stroke: '#222' }} tickLine={false} />
                          <YAxis tick={{ fill: '#555', fontSize: 8 }} axisLine={false} tickLine={false}
                            domain={[d => Math.max(0, Math.floor(d * 0.85)), d => Math.ceil(d * 1.1)]} />
                          <Tooltip content={<CustomTooltipVolume />} cursor={{ stroke: '#333' }} />
                          <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#3b82f6' }}
                            animationDuration={700} animationEasing="ease-out" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {strengthLogs.length === 0 && volumeLogs.length === 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl py-6 text-center">
                      <p className="text-gray-600 text-xs">Sin datos numéricos para este ejercicio.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* ── Tab: Salud ───────────────────────────────────────────────────── */}
      {tab === 'health' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-8">
          {healthCorr.length < 3 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-3xl bg-gray-800 flex items-center justify-center mb-5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <p className="text-white font-black text-lg mb-2">Pocos datos aún</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                Registrá sueño y FC en al menos 3 entrenamientos para ver el análisis de correlación.
              </p>
            </div>
          ) : (() => {
            const wbVsHr = healthCorr.filter(d => d.wellbeing != null && d.hrAvg != null)
              .map(d => ({ x: d.wellbeing, y: d.hrAvg, date: d.date }));
            const sleepVsHr = healthCorr.filter(d => d.sleepHours != null && d.hrAvg != null)
              .map(d => ({ x: d.sleepHours, y: d.hrAvg, date: d.date }));

            const corrCoeff = (pts) => {
              if (pts.length < 3) return null;
              const n = pts.length;
              const mx = pts.reduce((s, p) => s + p.x, 0) / n;
              const my = pts.reduce((s, p) => s + p.y, 0) / n;
              const num = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
              const den = Math.sqrt(
                pts.reduce((s, p) => s + (p.x - mx) ** 2, 0) *
                pts.reduce((s, p) => s + (p.y - my) ** 2, 0)
              );
              return den === 0 ? null : parseFloat((num / den).toFixed(2));
            };

            const corrLabel = (r) => {
              if (r == null) return null;
              const abs = Math.abs(r);
              const dir = r > 0 ? 'positiva' : 'negativa';
              if (abs >= 0.7) return { text: `Correlación fuerte ${dir}`, color: abs >= 0.7 && r < 0 ? '#4ade80' : '#f87171' };
              if (abs >= 0.4) return { text: `Correlación moderada ${dir}`, color: '#facc15' };
              return { text: 'Sin correlación clara', color: '#6b7280' };
            };

            const ScatterTooltip = ({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const { x, y, date } = payload[0].payload;
              return (
                <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
                  <p className="text-gray-400 mb-1">{date}</p>
                  <p className="text-white">{payload[0].name === 'wbHr' ? `Bienestar: ${x}/10` : `Sueño: ${x}h`}</p>
                  <p className="text-red-400">FC avg: {y} ppm</p>
                </div>
              );
            };

            const rWb   = corrCoeff(wbVsHr);
            const rSleep = corrCoeff(sleepVsHr);

            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-white">{healthCorr.length}</p>
                    <p className="text-gray-600 text-[10px] mt-0.5">sesiones</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-red-400">
                      {healthCorr.filter(d => d.hrAvg).length > 0
                        ? Math.round(healthCorr.filter(d => d.hrAvg).reduce((s, d) => s + d.hrAvg, 0) / healthCorr.filter(d => d.hrAvg).length)
                        : '—'}
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5">FC avg ppm</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-blue-400">
                      {healthCorr.filter(d => d.sleepHours).length > 0
                        ? parseFloat((healthCorr.filter(d => d.sleepHours).reduce((s, d) => s + d.sleepHours, 0) / healthCorr.filter(d => d.sleepHours).length).toFixed(1))
                        : '—'}
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5">sueño avg h</p>
                  </div>
                </div>

                {/* Scatter: Bienestar vs FC */}
                {wbVsHr.length >= 3 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
                    <p className="text-white font-black text-sm">Bienestar vs FC promedio</p>
                    <p className="text-gray-600 text-[10px] mb-1">¿Cuándo te sentís mejor, el corazón trabaja menos?</p>
                    {corrLabel(rWb) && (
                      <p className="text-[10px] font-bold mb-3" style={{ color: corrLabel(rWb).color }}>
                        {corrLabel(rWb).text} (r = {rWb})
                      </p>
                    )}
                    <ResponsiveContainer width="100%" height={180}>
                      <ScatterChart margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis type="number" dataKey="x" name="wbHr" domain={[1, 10]} ticks={[1,2,3,4,5,6,7,8,9,10]}
                          tick={{ fill: '#555', fontSize: 9 }} axisLine={{ stroke: '#222' }} tickLine={false}
                          label={{ value: 'Bienestar', fill: '#555', fontSize: 9, position: 'insideBottom', offset: -2 }} />
                        <YAxis type="number" dataKey="y" name="wbHr"
                          domain={[d => Math.floor(d * 0.9), d => Math.ceil(d * 1.05)]}
                          tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false}
                          label={{ value: 'ppm', fill: '#555', fontSize: 9, angle: -90, position: 'insideLeft', offset: 10 }} />
                        <ZAxis range={[40, 40]} />
                        <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={wbVsHr} fill="#e01020" fillOpacity={0.8} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Scatter: Sueño vs FC */}
                {sleepVsHr.length >= 3 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <p className="text-white font-black text-sm">Sueño vs FC promedio</p>
                    <p className="text-gray-600 text-[10px] mb-1">¿Más horas de sueño = FC más baja?</p>
                    {corrLabel(rSleep) && (
                      <p className="text-[10px] font-bold mb-3" style={{ color: corrLabel(rSleep).color }}>
                        {corrLabel(rSleep).text} (r = {rSleep})
                      </p>
                    )}
                    <ResponsiveContainer width="100%" height={180}>
                      <ScatterChart margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis type="number" dataKey="x" name="sleepHr"
                          domain={[d => Math.floor(d - 1), d => Math.ceil(d + 1)]}
                          tick={{ fill: '#555', fontSize: 9 }} axisLine={{ stroke: '#222' }} tickLine={false}
                          label={{ value: 'Horas de sueño', fill: '#555', fontSize: 9, position: 'insideBottom', offset: -2 }} />
                        <YAxis type="number" dataKey="y" name="sleepHr"
                          domain={[d => Math.floor(d * 0.9), d => Math.ceil(d * 1.05)]}
                          tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false}
                          label={{ value: 'ppm', fill: '#555', fontSize: 9, angle: -90, position: 'insideLeft', offset: 10 }} />
                        <ZAxis range={[40, 40]} />
                        <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={sleepVsHr} fill="#3b82f6" fillOpacity={0.8} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {wbVsHr.length < 3 && sleepVsHr.length < 3 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl py-6 text-center">
                    <p className="text-gray-600 text-xs">Necesitás más datos para ver los gráficos de correlación.</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Percepción de esfuerzo ──────────────────────────────────── */}
      {tab === 'wellbeing' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-8">
          {!wellbeingStats ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-3xl bg-gray-800 flex items-center justify-center mb-5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <p className="text-white font-black text-lg mb-2">Sin registros aún</p>
              <p className="text-gray-500 text-sm">Completá rutinas respondiendo cómo te sentís para ver este análisis.</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
                  <p className="text-xl font-black" style={{ color: wellbeingColor(parseFloat(wellbeingStats.avg)) }}>
                    {wellbeingStats.avg}
                  </p>
                  <p className="text-gray-600 text-[10px] mt-0.5">promedio</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
                  <p className="text-xl font-black text-green-400">{wellbeingStats.max}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">máximo</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
                  <p className="text-xl font-black text-white">{wellbeingStats.total}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">registros</p>
                </div>
              </div>

              {/* Timeline chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
                <p className="text-white font-black text-sm mb-4">Evolución del esfuerzo</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.wellbeingLogs} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltipWellbeing />} cursor={{ stroke: '#333' }} />
                    <Line type="monotone" dataKey="score" stroke="#4ade80" strokeWidth={2}
                      dot={<WellbeingDot />} activeDot={{ r: 6 }}
                      animationDuration={900} animationEasing="ease-out" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3 justify-center">
                  {[['#4ade80','7-10 Bien'],['#facc15','4-6 Regular'],['#f87171','1-3 Mal']].map(([color, label]) => (
                    <span key={label} className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* By day of week */}
              {wellbeingStats.dayAvgs.length >= 2 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <p className="text-white font-black text-sm mb-1">Promedio por día de semana</p>
                  <p className="text-gray-600 text-xs mb-4">¿En qué días entrenás mejor?</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={wellbeingStats.dayAvgs} margin={{ top: 4, right: 6, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                      <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} tickLine={false} />
                      <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const { day, avg, count } = payload[0].payload;
                          return (
                            <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
                              <p className="text-white font-black">{day}</p>
                              <p style={{ color: wellbeingColor(avg) }} className="font-bold">{avg}/10</p>
                              <p className="text-gray-500">{count} sesión{count !== 1 ? 'es' : ''}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {wellbeingStats.dayAvgs.map((d, i) => (
                          <Cell key={i} fill={wellbeingColor(d.avg)} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
