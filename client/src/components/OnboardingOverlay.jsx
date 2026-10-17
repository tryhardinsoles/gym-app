import { useState, useEffect, useRef } from 'react';

const SLIDES = [
  {
    emoji: '🏋️',
    title: 'Tu rutina del día',
    desc: 'Sección por sección, con video de cada ejercicio. Marcá con verde, amarillo o rojo cómo se sintió cada uno.',
    accent: '#e01020',
  },
  {
    emoji: '📅',
    title: 'Agenda',
    desc: 'Reservá tu llamada semanal con tu profe. El link de Meet aparece cuando está por comenzar.',
    accent: '#3b82f6',
  },
  {
    emoji: '📈',
    title: 'Performance',
    desc: 'Seguí tu fuerza y volumen por ejercicio. Rompé récords personales con cada entrenamiento.',
    accent: '#4ade80',
  },
  {
    emoji: '❤️',
    title: 'Salud',
    desc: 'Después de entrenar podés cargar tus horas de sueño y frecuencia cardíaca para cruzar esos datos con tu bienestar.',
    accent: '#f97316',
    isLast: true,
  },
];

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandalone = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;

export default function OnboardingOverlay({ userId, onDone }) {
  const [slide, setSlide] = useState(0);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const touchStart = useRef(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(`onboarded_${userId}`, '1'); } catch {}
    onDone();
  };

  const next = () => {
    if (slide < SLIDES.length - 1) setSlide(s => s + 1);
    else dismiss();
  };

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current == null) return;
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (delta > 50 && slide < SLIDES.length - 1) setSlide(s => s + 1);
    if (delta < -50 && slide > 0) setSlide(s => s - 1);
    touchStart.current = null;
  };

  const handleInstall = async () => {
    if (isIOS) { setShowIOSHint(true); return; }
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
  };

  const current = SLIDES[slide];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-950"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ userSelect: 'none' }}
    >
      {/* Skip */}
      <div className="flex justify-end px-5 pt-10">
        <button onClick={dismiss} className="text-gray-600 text-sm font-semibold px-2 py-1">
          Saltar
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6"
        key={slide}
        style={{ animation: 'fadeSlide 0.3s ease both' }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{ backgroundColor: `${current.accent}18`, boxShadow: `0 0 40px ${current.accent}22` }}
        >
          {current.emoji}
        </div>

        <div>
          <h2 className="text-white font-black text-2xl mb-3">{current.title}</h2>
          <p className="text-gray-400 text-base leading-relaxed">{current.desc}</p>
        </div>

        {/* Install block on last slide */}
        {current.isLast && !isInStandalone && (
          <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left">
            <p className="text-white font-black text-sm mb-1">Acceso directo</p>
            <p className="text-gray-500 text-xs mb-3">
              {isIOS
                ? 'Guardala en tu pantalla de inicio para abrirla como una app nativa.'
                : 'Instalala en tu celular para abrirla sin el navegador.'}
            </p>
            {installed ? (
              <p className="text-green-400 text-xs font-bold">✓ Instalada</p>
            ) : (
              <>
                <button
                  onClick={handleInstall}
                  className="w-full py-2.5 rounded-xl text-sm font-black transition-colors"
                  style={{ backgroundColor: current.accent, color: '#fff' }}
                >
                  {isIOS ? 'Cómo instalarlo' : 'Instalar app'}
                </button>
                {showIOSHint && (
                  <p className="text-gray-400 text-[11px] mt-2 leading-snug">
                    Tocá <span className="text-white font-bold">Compartir</span> (el ícono de flecha) y luego{' '}
                    <span className="text-white font-bold">Agregar a pantalla de inicio</span>.
                  </p>
                )}
                {!isIOS && !installPrompt && (
                  <p className="text-gray-600 text-[10px] mt-2">
                    En Chrome: menú ⋮ → Instalar aplicación
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress dots + button */}
      <div className="px-6 pb-12 space-y-5">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === slide ? 20 : 8,
                height: 8,
                backgroundColor: i === slide ? current.accent : '#333',
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full py-4 rounded-2xl text-white font-black text-lg transition-colors"
          style={{ backgroundColor: current.accent }}
        >
          {slide < SLIDES.length - 1 ? 'Siguiente' : 'Comenzar'}
        </button>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
