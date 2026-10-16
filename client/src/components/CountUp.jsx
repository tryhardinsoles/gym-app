import { useEffect, useRef, useState } from 'react';

export default function CountUp({ to, from = 0, duration = 1.2, suffix = '', prefix = '', className = '' }) {
  const [value, setValue] = useState(from);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const elRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
      startRef.current = null;
      const run = (ts) => {
        if (!startRef.current) startRef.current = ts;
        const p = Math.min((ts - startRef.current) / (duration * 1000), 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(from + (to - from) * ease));
        if (p < 1) frameRef.current = requestAnimationFrame(run);
      };
      frameRef.current = requestAnimationFrame(run);
    }, { threshold: 0.3 });

    if (elRef.current) observer.observe(elRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frameRef.current); };
  }, [to, from, duration]);

  return (
    <span ref={elRef} className={className}>
      {prefix}{value}{suffix}
    </span>
  );
}
