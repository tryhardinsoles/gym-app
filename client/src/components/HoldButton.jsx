import { useRef, useState, useCallback, useEffect } from 'react';

export default function HoldButton({ onHold, label, doneLabel = '¡Listo!', holdTime = 1200, className = '' }) {
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const holdingRef = useRef(false);

  const cancel = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    cancelAnimationFrame(frameRef.current);
    setPhase('idle');
    setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (phase === 'done') return;
    holdingRef.current = true;
    setPhase('holding');
    startRef.current = performance.now();

    const run = (ts) => {
      if (!holdingRef.current) return;
      const p = Math.min((ts - startRef.current) / holdTime, 1);
      setProgress(p);
      if (p < 1) {
        frameRef.current = requestAnimationFrame(run);
      } else {
        holdingRef.current = false;
        setPhase('done');
        onHold?.();
      }
    };
    frameRef.current = requestAnimationFrame(run);
  }, [phase, holdTime, onHold]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const isDone = phase === 'done';
  const isHolding = phase === 'holding';

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={e => e.preventDefault()}
      disabled={isDone}
      className={`relative overflow-hidden select-none touch-none ${className}`}
    >
      {/* Fill bar */}
      <div
        className="absolute inset-0 bg-white/20 origin-left"
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: 'left center',
          transition: isHolding ? 'none' : 'transform 0.25s ease-out',
        }}
      />
      <span className="relative z-10 pointer-events-none">
        {isDone ? doneLabel : isHolding ? 'Soltá para cancelar...' : label}
      </span>
    </button>
  );
}
