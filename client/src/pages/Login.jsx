import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      navigate(user.isAdmin ? '/admin/dashboard' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tight">HARD TRAINING</h1>
          <p className="text-gray-400 mt-2">Ingresá con tus datos</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Usuario</label>
            <input
              className="input-field"
              type="text"
              placeholder="Tu usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Contraseña</label>
            <div className="relative">
              <input
                className="input-field pr-12"
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                tabIndex={-1}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm font-medium text-center bg-red-500/10 rounded-xl p-3">
              {error}
            </p>
          )}

          <button className="btn-primary mt-2" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600 text-sm">
          <a href="/admin" className="hover:text-gray-400 transition-colors">Acceso admin</a>
        </p>
      </div>
    </div>
  );
}
