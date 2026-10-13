import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

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

export default function Performance() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/performance').then(({ data }) => {
      setData(data);
      if (data.exercises?.length > 0) setSelected(data.exercises[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const exercise = data?.exercises?.find(e => e.id === selected);
  const strengthLogs = exercise?.logs?.filter(l => l.weight != null) ?? [];
  const volumeLogs = exercise?.logs?.filter(l => l.volume != null) ?? [];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (data?.plan !== 'performance') return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />
      <div className="flex justify-between items-center pt-6 pb-2">
        <button onClick={() => setSidebarOpen(v => !v)}
          className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors"
          style={{ gap: '6px' }}>
          <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white' }} />
          <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white' }} />
          <span style={{ display:'block', height:'2px', width:'12px', borderRadius:'999px', backgroundColor:'#e01020' }} />
        </button>
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

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />

      {/* Header */}
      <div className="flex justify-between items-center pt-6 pb-2">
        <button onClick={() => setSidebarOpen(v => !v)}
          className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors"
          style={{ gap: '6px' }}>
          <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1)', transform: sidebarOpen ? 'translateY(8px) rotate(45deg)' : 'none' }} />
          <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'opacity 0.2s ease 0.05s', opacity: sidebarOpen ? 0 : 1 }} />
          <span style={{ display:'block', height:'2px', borderRadius:'999px', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1), width 0.3s ease', width: sidebarOpen ? '20px' : '12px', backgroundColor: sidebarOpen ? '#ffffff' : '#e01020', transform: sidebarOpen ? 'translateY(-8px) rotate(-45deg)' : 'none' }} />
        </button>
        <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Performance</span>
        <div className="w-10" />
      </div>

      {data?.exercises?.length === 0 ? (
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
      ) : (
        <div className="mt-5 pb-10">
          {/* Exercise list */}
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">
            Tus ejercicios
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {data.exercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => setSelected(ex.id)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
                  selected === ex.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>

          {exercise && (
            <div className="mt-5 space-y-4">
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
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#555', fontSize: 10 }}
                        axisLine={{ stroke: '#222' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#555', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<CustomTooltipStrength />} cursor={{ stroke: '#333' }} />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#e01020"
                        strokeWidth={2.5}
                        dot={{ fill: '#e01020', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#e01020' }}
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
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
                    <BarChart data={volumeLogs} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#555', fontSize: 10 }}
                        axisLine={{ stroke: '#222' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#555', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 'auto']}
                      />
                      <Tooltip content={<CustomTooltipVolume />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                      <Bar
                        dataKey="volume"
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {strengthLogs.length === 0 && volumeLogs.length === 0 && (
                <div className="card py-8 text-center">
                  <p className="text-gray-600 text-sm">Sin datos numéricos para este ejercicio.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
