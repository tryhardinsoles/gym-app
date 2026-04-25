import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [createError, setCreateError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const fetchUsers = () =>
    axios.get('/api/admin/users').then(r => setUsers(r.data)).finally(() => setLoading(false));

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      await axios.post('/api/admin/users', newUser);
      setNewUser({ username: '', password: '' });
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Error al crear usuario');
    }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`¿Eliminar al usuario "${username}"? Se borrarán todas sus rutinas.`)) return;
    await axios.delete(`/api/admin/users/${id}`);
    fetchUsers();
  };

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Panel Admin</h1>
          <p className="text-gray-500 text-sm">{users.length} alumnos registrados</p>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          Salir
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary flex-1 py-3 text-base"
        >
          + Nuevo alumno
        </button>
        <button
          onClick={() => setShowPasswords(!showPasswords)}
          className="btn-secondary flex-1 py-3 text-sm"
        >
          {showPasswords ? '🔒 Ocultar' : '👁 Ver contraseñas'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-3">
          <h3 className="font-bold text-white">Nuevo alumno</h3>
          <input
            className="input-field"
            placeholder="Nombre de usuario"
            value={newUser.username}
            onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Contraseña"
            value={newUser.password}
            onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
            required
          />
          {createError && <p className="text-red-400 text-sm">{createError}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-primary py-3 text-base">Crear</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary py-3 text-base">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center text-gray-500 py-10">
          No hay alumnos registrados aún
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div
              key={u.id}
              className="card flex items-center justify-between gap-4 cursor-pointer hover:border-brand-500/50 transition-colors"
              onClick={() => navigate(`/admin/users/${u.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-lg truncate">{u.username}</p>
                {showPasswords && (
                  <p className="text-gray-400 text-sm font-mono mt-0.5">{u.password}</p>
                )}
                <p className="text-gray-600 text-xs mt-0.5">
                  Creado: {new Date(u.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-gray-400">→</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(u.id, u.username); }}
                  className="text-red-500 hover:text-red-400 text-sm px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
