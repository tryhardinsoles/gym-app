import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'adminTabs';
const MAX_TABS = 8;

export function registerAdminTab(userId, username) {
  try {
    const tabs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (tabs.find(t => t.userId === userId)) return; // ya está, no pisar lastPath
    const next = [...tabs, { userId, username, lastPath: `/admin/users/${userId}` }].slice(-MAX_TABS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('adminTabsChanged'));
  } catch {}
}

export function updateAdminTabPath(userId, path) {
  try {
    const tabs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = tabs.findIndex(t => t.userId === userId);
    if (idx === -1) return;
    tabs[idx] = { ...tabs[idx], lastPath: path };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    window.dispatchEvent(new Event('adminTabsChanged'));
  } catch {}
}

export function clearAdminTabs() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('adminTabsChanged'));
}

export default function AdminTabBar({ currentUserId, compact = false }) {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);

  const refresh = useCallback(() => {
    try { setTabs(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch {}
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('adminTabsChanged', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('adminTabsChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const removeTab = (userId, e) => {
    e.stopPropagation();
    const next = tabs.filter(t => t.userId !== userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTabs(next);
    // limpiar progreso de rutina guardado para este usuario
    Object.keys(localStorage)
      .filter(k => k.startsWith(`adminPlay_section_`))
      .forEach(k => localStorage.removeItem(k));
    if (userId === currentUserId) navigate('/admin/dashboard');
  };

  if (tabs.length === 0) return null;

  return (
    <div
      className={`flex overflow-x-auto gap-2 pb-1 ${compact ? 'mb-1' : 'mb-5'}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabs.map(tab => {
        const isActive = tab.userId === currentUserId;
        return (
          <button
            key={tab.userId}
            onClick={() => navigate(tab.lastPath || `/admin/users/${tab.userId}`)}
            className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
              isActive
                ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-white border-transparent hover:border-gray-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-brand-500' : 'bg-gray-600'}`} />
            {tab.username}
            <span
              role="button"
              onClick={(e) => removeTab(tab.userId, e)}
              className="w-4 h-4 flex items-center justify-center rounded-full text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-0.5 text-sm leading-none"
            >
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
