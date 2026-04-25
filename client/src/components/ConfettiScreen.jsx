import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function ConfettiScreen({ onDone }) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#4ade80', '#86efac', '#fbbf24', '#fff'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#4ade80', '#86efac', '#fbbf24', '#fff'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950">
      {/* Green aura */}
      <div className="absolute inset-0 bg-brand-500/10 animate-pulse" />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.25) 0%, transparent 70%)',
        }}
      />
      <div className="relative text-center px-8">
        <div className="text-8xl mb-6 animate-bounce">🏆</div>
        <h2 className="text-4xl font-black text-white mb-3">¡Rutina Completada!</h2>
        <p className="text-brand-400 text-xl font-semibold">¡Sos una máquina! 💪</p>
      </div>
    </div>
  );
}
