import { useRef, useCallback } from 'react';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(255,255,255,0.06)', size = 220 }) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const rafRef = useRef(null);

  const handleMove = useCallback((e) => {
    if (!cardRef.current || !glowRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      glowRef.current.style.cssText = `
        opacity: 1;
        background: radial-gradient(${size}px circle at ${x}px ${y}px, ${spotlightColor}, transparent 70%);
      `;
    });
  }, [spotlightColor, size]);

  const handleLeave = useCallback(() => {
    if (glowRef.current) glowRef.current.style.opacity = '0';
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`card relative overflow-hidden ${className}`}
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      {children}
    </div>
  );
}
