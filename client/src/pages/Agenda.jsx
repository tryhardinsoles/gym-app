import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS   = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// Returns local Monday's date as "YYYY-MM-DD" — timezone-independent week key
function getWeekKey(offsetWeeks = 0) {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Build 7 local Date objects (Mon–Sun) from a YYYY-MM-DD key
function getWeekDates(weekKey) {
  return Array.from({ length: 7 }, (_, i) => {
    const [y, m, d] = weekKey.split('-').map(Number);
    const date = new Date(y, m - 1, d + i); // local midnight
    return date;
  });
}

function formatWeekLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const s = weekStart.getDate();
  const e = end.getDate();
  const em = MONTHS[end.getMonth()];
  if (weekStart.getMonth() === end.getMonth()) return `${s} - ${e} ${em}`;
  return `${s} ${MONTHS[weekStart.getMonth()]} - ${e} ${em}`;
}

function isPast(date, time) {
  const [h, m] = time.split(':').map(Number);
  const slotDate = new Date(date);
  slotDate.setHours(h, m, 0, 0);
  return slotDate < new Date();
}

// Returns 'active' | 'future' | 'past'
function getMeetStatus(date, time, now) {
  const [h, m] = time.split(':').map(Number);
  const slotDate = new Date(date);
  slotDate.setHours(h, m, 0, 0);
  const diff = now - slotDate; // ms; positive = after start
  if (diff >= -6 * 60 * 1000 && diff <= 40 * 60 * 1000) return 'active';
  if (diff < -5 * 60 * 1000) return 'future';
  return 'past';
}

export default function Agenda() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [bookedSlotIds, setBookedSlotIds] = useState([]);
  const [plan, setPlan] = useState('start');
  const [maxCalls, setMaxCalls] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [tick, setTick] = useState(0);
  const [pastBookings, setPastBookings] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();

  const weekKey   = getWeekKey(weekOffset);
  const weekDates = getWeekDates(weekKey);

  const fetchData = async (offset = weekOffset) => {
    const wk = getWeekKey(offset);
    try {
      const { data } = await axios.get('/api/agenda', { params: { weekKey: wk } });
      setSlots(data.slots);
      setMyBookings(data.myBookings);
      setBookedSlotIds(data.bookedSlotIds || []);
      setPlan(data.plan);
      setMaxCalls(data.maxCalls);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData(weekOffset);
  }, [weekOffset]);

  useEffect(() => {
    axios.get('/api/agenda/history').then(r => setPastBookings(r.data)).catch(() => {});
  }, []);

  const handleBook = async (slotId) => {
    setBooking(slotId);
    try {
      await axios.post(`/api/agenda/book/${slotId}`, { weekKey });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo reservar');
    } finally {
      setBooking(null);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    try {
      await axios.delete(`/api/agenda/booking/${bookingId}`);
      await fetchData();
    } catch {
      alert('No se pudo cancelar');
    }
  };

  const usedCalls = myBookings.length;
  const canBook = usedCalls < maxCalls;

  const slotsByDay = slots.reduce((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  // Mon→Sun order; only days that have slots
  const activeDays = weekDates
    .map(date => ({ date, dayOfWeek: date.getDay() }))
    .filter(({ dayOfWeek }) => slotsByDay[dayOfWeek]?.length > 0);

  const isCurrentWeek = weekOffset === 0;
  const weekLabel = formatWeekLabel(weekDates[0]); // Mon of this week

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} logout={logout} />

      {/* Header */}
      <div className="flex justify-between items-center pt-6 pb-2">
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="w-10 h-10 flex flex-col items-center justify-center rounded-2xl hover:bg-gray-800 transition-colors"
          style={{ gap: '6px' }}
        >
          <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1)', transform: sidebarOpen ? 'translateY(8px) rotate(45deg)' : 'none' }} />
          <span style={{ display:'block', height:'2px', width:'20px', borderRadius:'999px', backgroundColor:'white', transition:'opacity 0.2s ease 0.05s, transform 0.3s ease', opacity: sidebarOpen ? 0 : 1, transform: sidebarOpen ? 'scaleX(0.3)' : 'none' }} />
          <span style={{ display:'block', height:'2px', borderRadius:'999px', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1), width 0.3s ease, background-color 0.2s ease', width: sidebarOpen ? '20px' : '12px', backgroundColor: sidebarOpen ? '#ffffff' : '#e01020', transform: sidebarOpen ? 'translateY(-8px) rotate(-45deg)' : 'none' }} />
        </button>
        <span className="text-xs font-black tracking-widest text-gray-500 uppercase">Agenda</span>
        <div className="w-10" />
      </div>

      {/* Week navigator */}
      <div className="mt-5 flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          disabled={weekOffset === 0}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-base font-bold"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-white font-black text-sm">{weekLabel}</p>
          <p className="text-gray-600 text-xs mt-0.5">
            {isCurrentWeek ? 'Esta semana' : weekOffset === 1 ? 'Próxima semana' : `En ${weekOffset} semanas`}
          </p>
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-base font-bold"
        >
          ›
        </button>
      </div>

      {/* Plan badge + call counter */}
      <div className="mt-4 card flex items-center justify-between">
        <div>
          <p className="text-white font-black text-base">Llamadas {isCurrentWeek ? 'esta' : 'esa'} semana</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Plan <span className={plan === 'performance' ? 'text-brand-400 font-bold' : 'text-gray-400 font-bold'}>
              {plan === 'performance' ? 'Performance' : 'Start'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: maxCalls }, (_, i) => (
            <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
              i < usedCalls ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-700 text-gray-600'
            }`}>
              {i < usedCalls ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Mis reservas */}
      {myBookings.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
            Mis reservas
          </p>
          <div className="space-y-2">
            {myBookings.map(b => {
              const meetLink = b.meetUrl || b.slot.googleMeetUrl;
              const bDate = weekDates[b.slot.dayOfWeek === 0 ? 6 : b.slot.dayOfWeek - 1];
              const status = meetLink ? getMeetStatus(bDate, b.slot.time, now) : null;
              return (
                <div key={b.id} className="card flex items-center justify-between gap-3 py-3 px-4">
                  <p className="text-white font-bold text-sm shrink-0">
                    {DAY_FULL[b.slot.dayOfWeek]} {b.slot.time}
                  </p>
                  {meetLink ? (() => {
                    const [h, m] = b.slot.time.split(':').map(Number);
                    const slotDate = new Date(bDate);
                    slotDate.setHours(h, m, 0, 0);
                    const diff = now - slotDate;
                    const active = diff >= -6 * 60 * 1000 && diff <= 40 * 60 * 1000;
                    return active ? (
                      <a href={meetLink} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center bg-brand-500 hover:bg-brand-400 text-white text-xs font-black px-3 py-2 rounded-xl transition-colors">
                        Unirse al Meet
                      </a>
                    ) : (
                      <span className="flex-1 text-center bg-gray-800 text-gray-500 text-xs font-black px-3 py-2 rounded-xl cursor-not-allowed select-none">
                        Unirse al Meet
                      </span>
                    );
                  })() : <span className="flex-1" />}
                  <button onClick={() => handleCancel(b.id)}
                    className="shrink-0 text-xs text-gray-500 hover:text-red-400 font-medium px-3 py-1.5 rounded-xl hover:bg-gray-800 transition-colors">
                    Cancelar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Horarios disponibles */}
      <div className="mt-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">
          Horarios disponibles
        </p>

        {activeDays.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-gray-500 text-sm">No hay horarios esta semana.</p>
            <p className="text-gray-600 text-xs mt-1">Probá con la semana siguiente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDays.map(({ date, dayOfWeek }) => {
              const daySlots = slotsByDay[dayOfWeek] || [];
              return (
                <div key={dayOfWeek}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                    {DAY_FULL[dayOfWeek]} {date.getDate()}/{date.getMonth() + 1}
                  </p>
                  <div className="space-y-2">
                    {daySlots.map(slot => {
                      const myBooking = myBookings.find(b => b.slotId === slot.id);
                      const takenByOther = !myBooking && bookedSlotIds.includes(slot.id);
                      const past = isPast(date, slot.time);
                      return (
                        <div key={slot.id} className={`card flex items-center justify-between py-3 px-4 transition-all ${
                          myBooking ? 'border border-brand-500/30 bg-brand-500/5' : ''
                        } ${(past || takenByOther) && !myBooking ? 'opacity-35' : ''}`}>
                          <div>
                            <p className={`font-black text-sm ${myBooking ? 'text-brand-300' : 'text-white'}`}>
                              {slot.time}
                            </p>
                          </div>
                          {myBooking ? (
                            <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-3 py-1 rounded-full">
                              Reservado
                            </span>
                          ) : past ? (
                            <span className="text-gray-600 text-xs font-medium">Pasado</span>
                          ) : takenByOther ? (
                            <span className="text-gray-500 text-xs font-medium">Reservado</span>
                          ) : !canBook ? (
                            <span className="text-gray-600 text-xs font-medium">Límite alcanzado</span>
                          ) : (
                            <button onClick={() => handleBook(slot.id)} disabled={booking === slot.id}
                              className="bg-brand-500 hover:bg-brand-400 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                              {booking === slot.id ? '...' : 'Reservar'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de llamadas pasadas */}
      {pastBookings.length > 0 && (
        <div className="mt-6 pb-10">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between mb-3 px-1"
          >
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Historial de llamadas ({pastBookings.length})
            </p>
            <span className="text-gray-600 text-xs">{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="space-y-2">
              {pastBookings.map(b => {
                const [y, mo, d] = b.weekStart.slice(0, 10).split('-').map(Number);
                const weekDate = new Date(y, mo - 1, d + (b.slot.dayOfWeek === 0 ? 6 : b.slot.dayOfWeek - 1));
                const dateStr = weekDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <div key={b.id} className="card flex items-center justify-between py-3 px-4">
                    <div>
                      <p className="text-white font-bold text-sm">
                        {DAY_FULL[b.slot.dayOfWeek]} {b.slot.time}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{dateStr}</p>
                    </div>
                    <span className="text-gray-600 text-xs">Completada</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
