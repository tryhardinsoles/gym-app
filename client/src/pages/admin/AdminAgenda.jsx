import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AdminAgenda() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, time: '10:00', googleMeetUrl: '' });
  const [saving, setSaving] = useState(false);
  const [editingMeet, setEditingMeet] = useState(null); // slotId being edited
  const [meetUrl, setMeetUrl] = useState('');

  const fetchData = async () => {
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        axios.get('/api/agenda/admin/slots'),
        axios.get('/api/agenda/admin/bookings'),
      ]);
      setSlots(slotsRes.data);
      setBookings(bookingsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/agenda/admin/slots', {
        dayOfWeek: Number(newSlot.dayOfWeek),
        time: newSlot.time,
        googleMeetUrl: newSlot.googleMeetUrl || null,
      });
      setNewSlot({ dayOfWeek: 1, time: '10:00', googleMeetUrl: '' });
      setShowAdd(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear horario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (slot) => {
    await axios.patch(`/api/agenda/admin/slots/${slot.id}`, { isActive: !slot.isActive });
    fetchData();
  };

  const handleDelete = async (slot) => {
    if (!confirm(`¿Eliminar el horario del ${DAY_NAMES[slot.dayOfWeek]} ${slot.time}? Se cancelarán todas las reservas.`)) return;
    await axios.delete(`/api/agenda/admin/slots/${slot.id}`);
    fetchData();
  };

  const handleSaveMeet = async (slotId) => {
    await axios.patch(`/api/agenda/admin/slots/${slotId}`, { googleMeetUrl: meetUrl || null });
    setEditingMeet(null);
    fetchData();
  };

  const slotsByDay = slots.reduce((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  const activeDays = [1, 2, 3, 4, 5, 6, 0].filter(d => slotsByDay[d]?.length > 0);

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-6 mb-8">
        <div>
          <button onClick={() => navigate('/admin/dashboard')} className="text-gray-500 hover:text-white text-sm mb-1 transition-colors">
            ← Panel
          </button>
          <h1 className="text-2xl font-black text-white">Agenda</h1>
          <p className="text-gray-500 text-sm">{slots.length} horarios · {bookings.length} reservas esta semana</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn-primary py-2 px-4 text-sm"
        >
          + Horario
        </button>
      </div>

      {/* Add slot form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="card mb-6 space-y-4">
          <h3 className="font-black text-white">Nuevo horario</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Día</label>
              <select
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-brand-500"
                value={newSlot.dayOfWeek}
                onChange={e => setNewSlot(s => ({ ...s, dayOfWeek: Number(e.target.value) }))}
              >
                {[1,2,3,4,5,6,0].map(d => (
                  <option key={d} value={d}>{DAY_NAMES[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hora</label>
              <input
                type="time"
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-brand-500"
                value={newSlot.time}
                onChange={e => setNewSlot(s => ({ ...s, time: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Link Google Meet (opcional)</label>
            <input
              type="url"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-brand-500 placeholder-gray-600"
              value={newSlot.googleMeetUrl}
              onChange={e => setNewSlot(s => ({ ...s, googleMeetUrl: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 rounded-2xl text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm">
              {saving ? 'Guardando...' : 'Crear horario'}
            </button>
          </div>
        </form>
      )}

      {/* Reservas de esta semana */}
      {bookings.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">
            Reservas esta semana
          </p>
          <div className="space-y-2">
            {bookings.map(b => (
              <div key={b.id} className="card flex items-center justify-between py-3 px-4">
                <div>
                  <p className="text-white font-bold text-sm">
                    {DAY_NAMES[b.slot.dayOfWeek]} {b.slot.time}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    <span className="font-semibold text-gray-300">{b.user.username}</span>
                    {' · '}
                    <span className={b.user.plan === 'performance' ? 'text-brand-400' : 'text-gray-500'}>
                      {b.user.plan === 'performance' ? 'Performance' : 'Start'}
                    </span>
                  </p>
                </div>
                <span className="bg-brand-500/20 text-brand-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  Reservado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slots grouped by day */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : slots.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 text-sm">No hay horarios cargados.</p>
          <p className="text-gray-600 text-xs mt-1">Hacé clic en "+ Horario" para agregar.</p>
        </div>
      ) : (
        <div className="space-y-6 pb-10">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Todos los horarios</p>
          {[1,2,3,4,5,6,0].filter(d => slotsByDay[d]?.length > 0).map(dayOfWeek => (
            <div key={dayOfWeek}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                {DAY_NAMES[dayOfWeek]}
              </p>
              <div className="space-y-2">
                {slotsByDay[dayOfWeek].map(slot => (
                  <div key={slot.id} className={`card py-3 px-4 ${!slot.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-black text-sm">{slot.time}</p>
                          {!slot.isActive && (
                            <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-bold">
                              Inactivo
                            </span>
                          )}
                        </div>
                        {editingMeet === slot.id ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="url"
                              value={meetUrl}
                              onChange={e => setMeetUrl(e.target.value)}
                              placeholder="https://meet.google.com/..."
                              className="flex-1 bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 focus:outline-none focus:border-brand-500 placeholder-gray-600 min-w-0"
                            />
                            <button onClick={() => handleSaveMeet(slot.id)} className="text-xs bg-brand-500 text-white px-3 py-1 rounded-lg font-bold shrink-0">
                              OK
                            </button>
                            <button onClick={() => setEditingMeet(null)} className="text-xs text-gray-500 px-2 py-1 rounded-lg shrink-0">
                              ✕
                            </button>
                          </div>
                        ) : slot.googleMeetUrl ? (
                          <button
                            onClick={() => { setEditingMeet(slot.id); setMeetUrl(slot.googleMeetUrl || ''); }}
                            className="text-brand-400 text-xs hover:text-brand-300 transition-colors mt-0.5 text-left truncate max-w-full block"
                          >
                            {slot.googleMeetUrl}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setEditingMeet(slot.id); setMeetUrl(''); }}
                            className="text-gray-600 hover:text-gray-400 text-xs transition-colors mt-0.5"
                          >
                            + Agregar Meet link
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <button
                          onClick={() => handleToggle(slot)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                            slot.isActive
                              ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                          }`}
                        >
                          {slot.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDelete(slot)}
                          className="text-xs text-gray-600 hover:text-red-400 px-2 py-1.5 rounded-xl hover:bg-gray-800 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
