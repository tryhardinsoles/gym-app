export default function StarBorder({ children, className = '', color = '#e01020', speed = '4s' }) {
  return (
    <div className={`relative inline-flex w-full ${className}`}>
      <style>{`
        @keyframes star-border-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* Spinning glow */}
      <div
        className="absolute -inset-[2px] rounded-2xl overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div
          style={{
            position: 'absolute',
            inset: '-100%',
            background: `conic-gradient(from 0deg, transparent 0%, transparent 60%, ${color} 80%, transparent 100%)`,
            animation: `star-border-spin ${speed} linear infinite`,
          }}
        />
      </div>
      {/* Content */}
      <div className="relative w-full z-10">
        {children}
      </div>
    </div>
  );
}
