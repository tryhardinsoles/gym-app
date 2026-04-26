import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const FEEDBACK_LABELS = { green: 'Fácil', yellow: 'Correcto', red: 'No cumplió' };
const FEEDBACK_COLORS = { green: '#4ade80', yellow: '#facc15', red: '#f87171' };

const WELLBEING_COLORS = [
  '', '#ef4444', '#f97316', '#f97316', '#eab308', '#eab308',
  '#84cc16', '#84cc16', '#22c55e', '#22c55e', '#16a34a'
];

function WellbeingBadge({ score }) {
  if (!score) return <span className="text-gray-500 text-xs">Sin dato</span>;
  const color = WELLBEING_COLORS[score];
  return (
    <span
      className="text-sm font-black px-2 py-0.5 rounded-full"
      style={{ backgroundColor: color + '33', color }}
    >
      {score}/10
    </span>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm shadow-xl">
      <p className="text-white font-bold mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-sm">
          {p.name}: <strong>{p.value ?? '—'}{p.dataKey === 'completado' ? '%' : ''}</strong>
        </p>
      ))}
    </div>
  );
}

export default function UserStats() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todo');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          axios.get('/api/admin/users'),
          axios.get(`/api/admin/users/${userId}/stats`)
        ]);
        const found = usersRes.data.find(u => u.id === userId);
        if (found) setUsername(found.username);
        setSessions(statsRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'semana') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return sessions.filter(s => new Date(s.completedAt) >= cutoff);
    }
    if (filter === 'mes') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return sessions.filter(s => new Date(s.completedAt) >= cutoff);
    }
    return sessions;
  }, [sessions, filter]);

  const chartData = useMemo(() => filtered.map(s => {
    const d = new Date(s.completedAt);
    const completado = s.feedbackSummary.total > 0
      ? Math.round((s.feedbackSummary.green + s.feedbackSummary.yellow) / s.feedbackSummary.total * 100)
      : null;
    return {
      name: `${d.getDate()}/${d.getMonth() + 1}`,
      rutina: s.routineName,
      bienestar: s.wellbeingScore,
      completado,
    };
  }), [filtered]);

  const avgBienestar = useMemo(() => {
    const scores = sessions.filter(s => s.wellbeingScore).map(s => s.wellbeingScore);
    return scores.length
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;
  }, [sessions]);

  const avgCompletado = useMemo(() => {
    const rates = sessions
      .filter(s => s.feedbackSummary.total > 0)
      .map(s => (s.feedbackSummary.green + s.feedbackSummary.yellow) / s.feedbackSummary.total * 100);
    return rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  }, [sessions]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 mb-6">
        <button onClick={() => navigate(`/admin/users/${userId}`)} className="text-gray-400 hover:text-white transition-colors">
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">{username}</h1>
          <p className="text-gray-500 text-sm">Estadísticas de percepción del esfuerzo</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center py-4">
          <div className="text-3xl font-black text-white">{sessions.length}</div>
          <div className="text-gray-500 text-xs mt-1">Sesiones</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-black text-brand-400">{avgBienestar ?? '—'}</div>
          <div className="text-gray-500 text-xs mt-1">Bienestar prom.</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-black text-blue-400">
            {avgCompletado != null ? `${avgCompletado}%` : '—'}
          </div>
          <div className="text-gray-500 text-xs mt-1">Completado</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          Este alumno aún no ha completado ninguna rutina
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Evolución</h2>
              <div className="flex gap-1">
                {[
                  { key: 'todo', label: 'Todo' },
                  { key: 'mes', label: 'Mes' },
                  { key: 'semana', label: 'Semana' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${
                      filter === key
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">Sin datos para este período</p>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 10]}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    yAxisId="left"
                    dataKey="bienestar"
                    name="Bienestar"
                    fill="#4ade80"
                    opacity={0.85}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completado"
                    name="% Completado"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    dot={{ fill: '#60a5fa', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}

            <div className="flex gap-5 mt-3 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-3 h-3 rounded bg-green-400 inline-block" />
                Bienestar (1–10)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-4 h-0.5 bg-blue-400 inline-block rounded" />
                % Completado
              </span>
            </div>
          </div>

          {/* Historial */}
          <h2 className="text-white font-bold text-lg mb-3">Historial de rutinas</h2>
          <div className="space-y-3">
            {[...sessions].reverse().map(session => {
              const d = new Date(session.completedAt);
              const dateStr = d.toLocaleDateString('es-AR', {
                day: 'numeric', month: 'long', year: 'numeric'
              });
              const isOpen = expanded === session.id;

              return (
                <div key={session.id} className="card">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpanded(isOpen ? null : session.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base leading-tight">
                          {session.routineName}
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">{dateStr}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <WellbeingBadge score={session.wellbeingScore} />
                        <span className="text-gray-600 text-sm">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2 flex-wrap">
                      <span className="text-green-400 text-xs font-medium">
                        ✓ {session.feedbackSummary.green} fácil
                      </span>
                      <span className="text-yellow-400 text-xs font-medium">
                        ✓ {session.feedbackSummary.yellow} correcto
                      </span>
                      <span className="text-red-400 text-xs font-medium">
                        ✗ {session.feedbackSummary.red} no cumplió
                      </span>
                      <span className="text-gray-500 text-xs ml-auto">
                        {session.feedbackSummary.total > 0
                          ? `${Math.round((session.feedbackSummary.green + session.feedbackSummary.yellow) / session.feedbackSummary.total * 100)}% completado`
                          : ''}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 space-y-4 border-t border-gray-700/40 pt-4">
                      {session.sections.map((sec, si) => (
                        <div key={si}>
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
                            {sec.name}
                          </p>
                          <div className="space-y-2">
                            {sec.exercises.map((ex, ei) => (
                              <div key={ei} className="flex items-center justify-between gap-3">
                                <span className="text-gray-300 text-sm leading-tight">{ex.name}</span>
                                {ex.feedback ? (
                                  <span
                                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{
                                      backgroundColor: FEEDBACK_COLORS[ex.feedback] + '22',
                                      color: FEEDBACK_COLORS[ex.feedback]
                                    }}
                                  >
                                    {FEEDBACK_LABELS[ex.feedback]}
                                  </span>
                                ) : (
                                  <span className="text-gray-700 text-xs">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
