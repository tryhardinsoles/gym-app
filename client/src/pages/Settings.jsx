import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FONT_OPTIONS = [
  { key: 'normal', label: 'Normal', size: '16px', preview: 'Aa' },
  { key: 'large',  label: 'Grande', size: '18px', preview: 'Aa' },
  { key: 'xlarge', label: 'Muy grande', size: '20px', preview: 'Aa' },
];

export default function Settings() {
  const navigate = useNavigate();

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState(null); // { ok, text }

  const savedSize = localStorage.getItem('fontSize') || 'normal';
  const [fontSize, setFontSize] = useState(savedSize);

  const handleFontSize = (key) => {
    setFontSize(key);
    localStorage.setItem('fontSize', key);
    const sizes = { normal: '16px', large: '18px', xlarge: '20px' };
    document.documentElement.style.fontSize = sizes[key];
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (newPw.length < 4) {
      setPwMsg({ ok: false, text: 'La nueva contraseña debe tener al menos 4 caracteres' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await axios.patch('/api/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ ok: true, text: '¡Contraseña actualizada!' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.error || 'Error al cambiar la contraseña' });
    }
    setPwSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur px-4 pt-10 pb-4 border-b border-gray-800/60">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h1 className="text-white font-black text-xl">Ajustes</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-12 space-y-6">

        {/* Tamaño de texto */}
        <div className="card">
          <p className="text-white font-black text-base mb-1">Tamaño de texto</p>
          <p className="text-gray-500 text-xs mb-4">Ajustá el tamaño de la letra en toda la app</p>
          <div className="grid grid-cols-3 gap-2">
            {FONT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleFontSize(opt.key)}
                className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border transition-all ${
                  fontSize === opt.key
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <span
                  className="font-black text-white"
                  style={{ fontSize: opt.size, lineHeight: 1 }}
                >
                  {opt.preview}
                </span>
                <span className={`text-[10px] font-bold ${fontSize === opt.key ? 'text-brand-400' : 'text-gray-500'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="card">
          <p className="text-white font-black text-base mb-1">Cambiar contraseña</p>
          <p className="text-gray-500 text-xs mb-5">Ingresá tu contraseña actual y la nueva</p>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-1">Contraseña actual</label>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="input-field text-base"
                required
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••"
                className="input-field text-base"
                required
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-bold block mb-1">Confirmá la nueva contraseña</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                className="input-field text-base"
                required
              />
            </div>

            {pwMsg && (
              <p className={`text-sm font-semibold ${pwMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                {pwMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={pwSaving || !currentPw || !newPw || !confirmPw}
              className="btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {pwSaving ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
