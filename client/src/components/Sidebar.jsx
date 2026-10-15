import { useLocation, useNavigate } from 'react-router-dom';

const IconWorkout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4"/>
  </svg>
);

const IconPerformance = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconAgenda = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconTrophy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
);

const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function Sidebar({ isOpen, onClose, user, logout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      label: 'Entrenamientos',
      icon: <IconWorkout />,
      path: '/',
      locked: false,
    },
    {
      label: 'Agenda',
      icon: <IconAgenda />,
      path: '/agenda',
      locked: false,
    },
    {
      label: 'Performance',
      icon: <IconPerformance />,
      path: '/performance',
      locked: false,
    },
    {
      label: 'Logros',
      icon: <IconTrophy />,
      path: '/achievements',
      locked: false,
    },
  ];

  const handleNav = (item) => {
    if (item.locked) return;
    navigate(item.path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-gray-950 border-r border-gray-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-10 pb-6 border-b border-gray-800">
          <div>
            <span className="text-xs font-black tracking-widest text-brand-500 uppercase">Tryhard</span>
            <p className="text-white font-black text-lg leading-tight">Training</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <span className="text-brand-400 font-black text-sm uppercase">
                {user?.username?.[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{user?.username}</p>
              <p className="text-gray-500 text-xs">Alumno</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path && !item.locked;
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item)}
                disabled={item.locked}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                  item.locked
                    ? 'text-gray-600 cursor-not-allowed'
                    : isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className={item.locked ? 'text-gray-700' : isActive ? 'text-brand-500' : ''}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.locked && (
                  <span className="flex items-center gap-1.5 text-[10px] font-black tracking-wide text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                    <IconLock />
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 pb-8 pt-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-500 hover:text-white font-medium px-4 py-3 rounded-2xl hover:bg-gray-800 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
