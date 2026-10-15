import { useEffect } from 'react';

export default function PRCelebration({ count, exercises, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.25s ease-out' }}
    >
      <div className="text-center px-8 max-w-sm" style={{ animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {/* Medal */}
        <div className="text-7xl mb-4 select-none" style={{ filter: 'drop-shadow(0 0 24px #fbbf24)' }}>
          🏅
        </div>

        {/* Title */}
        <p className="text-white font-black text-2xl leading-tight mb-2">
          ¡Nuevo récord personal!
        </p>

        {/* Subtitle */}
        <p className="text-yellow-400 font-bold text-lg mb-4">
          {count === 1
            ? 'Mejoraste el peso en 1 ejercicio'
            : `Mejoraste el peso en ${count} ejercicio${count !== 1 ? 's' : ''}`}
        </p>

        {/* Exercise names (up to 3) */}
        {exercises.length > 0 && exercises.length <= 4 && (
          <div className="space-y-1 mb-5">
            {exercises.map(name => (
              <p key={name} className="text-gray-400 text-sm">· {name}</p>
            ))}
          </div>
        )}

        <p className="text-gray-600 text-xs">Tocá para continuar</p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes popIn  { from { opacity:0; transform:scale(0.7) } to { opacity:1; transform:scale(1) } }
      `}</style>
    </div>
  );
}
