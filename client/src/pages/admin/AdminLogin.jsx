import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      if (!user.isAdmin) { setError('Acceso solo para administradores'); return; }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">⚙️</div>
          <h1 className="text-3xl font-black text-white">Panel Admin</h1>
          <p className="text-gray-400 mt-2">Acceso exclusivo para administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <input
            className="input-field"
            type="text"
            placeholder="Usuario admin"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoCapitalize="none"
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && (
            <p className="text-red-400 text-sm font-medium text-center bg-red-500/10 rounded-xl p-3">
              {error}
            </p>
          )}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center mt-4">
          <a href="/login" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Volver al login de alumnos
          </a>
        </p>
      </div>
    </div>
  );
}
