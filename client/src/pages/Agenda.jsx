import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function getWeekDates(weekStart) {
  // weekStart is Monday; build Mon–Sun array
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

export default function Agenda() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [plan, setPlan] = useState('start');
  const [maxCalls, setMaxCalls] = useState(1);
  const [weekStart, setWeekStart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null); // slotId being booked

  const fetchData = async () => {
    try {
      const { data } = await axios.get('/api/agenda');
      setSlots(data.slots);
      setMyBookings(data.myBookings);
      setPlan(data.plan);
      setMaxCalls(data.maxCalls);
      setWeekStart(new Date(data.weekStart));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleBook = async (slotId) => {
    setBooking(slotId);
    try {
      await axios.post(`/api/agenda/book/${slotId}`);
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

  const weekDates = weekStart ? getWeekDates(weekStart) : [];

  const slotsByDay = slots.reduce((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  // Days that have at least one slot (Mon=1 through Sun=0 mapped to Mon-Sun display)
  const activeDays = weekDates
    .map((date, i) => ({ date, dayOfWeek: date.getUTCDay(), idx: i }))
    .filter(({ dayOfWeek }) => slotsByDay[dayOfWeek]?.length > 0);

  const isPast = (date, time) => {
    const [h, m] = time.split(':').map(Number);
    const slotDate = new Date(date);
    slotDate.setUTCHours(h, m, 0, 0);
    return slotDate < new Date();
  };

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

      {/* Plan badge + call counter */}
      <div className="mt-6 card flex items-center justify-between">
        <div>
          <p className="text-white font-black text-base">Llamadas esta semana</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Plan <span className={plan === 'performance' ? 'text-brand-400 font-bold' : 'text-gray-400 font-bold'}>{plan === 'performance' ? 'Performance' : 'Start'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: maxCalls }, (_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all ${
                i < usedCalls
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'border-gray-700 text-gray-600'
              }`}
            >
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
            {myBookings.map(b => (
              <div key={b.id} className="card flex items-center justify-between py-3 px-4">
                <div>
                  <p className="text-white font-bold text-sm">
                    {DAY_FULL[b.slot.dayOfWeek]} {b.slot.time}
                  </p>
                  {b.slot.googleMeetUrl && (
                    <a
                      href={b.slot.googleMeetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 text-xs font-semibold hover:text-brand-300 transition-colors"
                    >
                      Abrir Google Meet →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleCancel(b.id)}
                  className="text-xs text-gray-500 hover:text-red-400 font-medium px-3 py-1.5 rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ))}
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
            <p className="text-gray-500 text-sm">No hay horarios disponibles esta semana.</p>
            <p className="text-gray-600 text-xs mt-1">Tu profe cargará horarios pronto.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-10">
            {activeDays.map(({ date, dayOfWeek }) => {
              const daySlots = slotsByDay[dayOfWeek] || [];
              return (
                <div key={dayOfWeek}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                    {DAY_FULL[dayOfWeek]} {date.getUTCDate()}/{date.getUTCMonth() + 1}
                  </p>
                  <div className="space-y-2">
                    {daySlots.map(slot => {
                      const myBooking = myBookings.find(b => b.slotId === slot.id);
                      const past = isPast(date, slot.time);
                      return (
                        <div
                          key={slot.id}
                          className={`card flex items-center justify-between py-3 px-4 transition-all ${
                            myBooking ? 'border border-brand-500/30 bg-brand-500/5' : ''
                          } ${past ? 'opacity-40' : ''}`}
                        >
                          <div>
                            <p className={`font-black text-sm ${myBooking ? 'text-brand-300' : 'text-white'}`}>
                              {slot.time}
                            </p>
                            {myBooking && slot.googleMeetUrl && (
                              <a
                                href={slot.googleMeetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-400 text-xs hover:text-brand-300"
                              >
                                Meet →
                              </a>
                            )}
                          </div>
                          {myBooking ? (
                            <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-3 py-1 rounded-full">
                              Reservado
                            </span>
                          ) : past ? (
                            <span className="text-gray-600 text-xs font-medium">Pasado</span>
                          ) : !canBook ? (
                            <span className="text-gray-600 text-xs font-medium">Límite alcanzado</span>
                          ) : (
                            <button
                              onClick={() => handleBook(slot.id)}
                              disabled={booking === slot.id}
                              className="bg-brand-500 hover:bg-brand-400 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                            >
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
    </div>
  );
}
