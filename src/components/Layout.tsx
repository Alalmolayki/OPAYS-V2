import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Upload, UserCircle, LogOut,
  Rocket, ChevronLeft, ChevronRight, Menu, Bell,
  Sun, Moon, X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { avatarGradient } from '../utils/avatar';

const navItems = [
  { label: 'Dashboard',    icon: LayoutDashboard, path: '/dashboard', roles: ['superadmin','admin','tech_teacher','branch_teacher','student','demo','graduate'] },
  { label: 'Takımlar',     icon: Users,           path: '/teams',     roles: ['superadmin','admin','tech_teacher','branch_teacher','student','demo','graduate'] },
  { label: 'Kullanıcılar', icon: Users,           path: '/users',     roles: ['superadmin','admin','tech_teacher','branch_teacher'] },
  { label: 'İçe Aktar',   icon: Upload,          path: '/import',    roles: ['superadmin','admin'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, schools, selectedSchoolId, notifications, theme, toggleTheme } = useStore();

  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const notifPopupShown = useRef(false);
  const navRef = useRef<HTMLElement>(null);
  const navScrollPos = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const mainScrollMap = useRef<Map<string, number>>(new Map());
  const prevPath = useRef(location.pathname);

  const unreadNotifications = notifications.filter(n =>
    !n.read && (n.userId === currentUser?.id || (!n.userId && currentUser?.role === 'superadmin'))
  ).length;

  useEffect(() => {
    if (unreadNotifications > 0 && !notifPopupShown.current && currentUser) {
      notifPopupShown.current = true;
      setShowNotifPopup(true);
      const timer = setTimeout(() => setShowNotifPopup(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollTop = navScrollPos.current;
    const handleScroll = () => { navScrollPos.current = nav.scrollTop; };
    nav.addEventListener('scroll', handleScroll);
    return () => nav.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    mainScrollMap.current.set(prevPath.current, main.scrollTop);
    main.scrollTop = mainScrollMap.current.get(location.pathname) ?? 0;
    prevPath.current = location.pathname;
  }, [location.pathname]);

  const visibleNav = navItems.filter(item => currentUser && item.roles.includes(currentUser.role));
  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const isLight = theme === 'light';

  // Apply .light class to <html> so CSS variables activate globally
  useEffect(() => {
    document.documentElement.classList.toggle('light', isLight);
  }, [isLight]);

  const handleLogout = () => { logout(); navigate('/'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800/60 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 glow-cyan">
          <Rocket size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-lg font-bold text-white tracking-wide">OPAYS</span>
            <p className="text-[10px] text-slate-500 -mt-0.5">V2 · Öğrenci Aktivite</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav ref={navRef} className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`sidebar-link w-full ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-slate-800/60 pt-3">
        <button
          onClick={() => { navigate('/profile'); setMobileOpen(false); }}
          className={`sidebar-link w-full ${location.pathname === '/profile' ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <UserCircle size={17} className="flex-shrink-0" />
          {!collapsed && <span>Profilim</span>}
        </button>
        <button
          onClick={toggleTheme}
          className={`sidebar-link w-full ${collapsed ? 'justify-center px-2' : ''}`}
          title={isLight ? 'Karanlık Mod' : 'Açık Mod'}
        >
          {isLight
            ? <Moon size={17} className="flex-shrink-0 text-slate-400" />
            : <Sun size={17} className="flex-shrink-0 text-amber-400" />}
          {!collapsed && <span>{isLight ? 'Karanlık Mod' : 'Açık Mod'}</span>}
        </button>
        <button
          onClick={() => { navigate('/notifications'); setMobileOpen(false); }}
          className={`sidebar-link w-full ${location.pathname === '/notifications' ? 'active' : ''} ${unreadNotifications > 0 ? 'text-amber-400 hover:bg-amber-500/10' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <Bell size={17} className="flex-shrink-0" />
          {!collapsed && (
            <span className="flex items-center gap-2">
              Bildirimler
              {unreadNotifications > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-medium">{unreadNotifications}</span>
              )}
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>

      {/* User card */}
      {!collapsed && currentUser && (
        <div className="px-3 pb-4">
          <div className="card p-3">
            <div className="flex items-center gap-2.5">
              {currentUser.photoUrl ? (
                <img src={currentUser.photoUrl} alt="Profil" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarGradient(currentUser.id)}`}>
                  {currentUser.firstName[0]}{currentUser.lastName[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{currentUser.firstName} {currentUser.lastName}</p>
                <p className="text-xs text-slate-500">{selectedSchool?.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--c-base)' }}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r transition-all duration-300 flex-shrink-0 relative ${collapsed ? 'w-16' : 'w-56'} ${isLight ? 'lm-sidebar light bg-slate-50 border-slate-200' : 'bg-[#080e1c] border-slate-800/60'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -translate-y-1/2 w-5 h-10 bg-slate-800 border border-slate-700 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors z-50"
          style={{ left: collapsed ? '52px' : '220px' }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className={`absolute left-0 top-0 bottom-0 w-64 border-r ${isLight ? 'lm-sidebar light bg-slate-50 border-slate-200' : 'bg-[#080e1c] border-slate-800/60'}`}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className={`flex-1 flex flex-col overflow-hidden transition-colors duration-200 ${isLight ? 'lm-content light' : ''}`}
           style={{ backgroundColor: isLight ? 'var(--c-base)' : undefined }}>
        {/* Mobile header */}
        <header className="lm-header lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 bg-[#080e1c]">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-slate-100">
            <Menu size={20} />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Rocket size={14} className="text-white" />
          </div>
          <span className="font-bold text-white">OPAYS</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleTheme} className="text-slate-400 hover:text-slate-200 transition-colors">
              {isLight ? <Moon size={18} /> : <Sun size={18} className="text-amber-400" />}
            </button>
            {unreadNotifications > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto animate-fade-in">
          <div className="flex flex-col min-h-full p-4 lg:p-6">
            <div className="flex-1">
              {children}
            </div>
            <footer className="mt-12 pt-5 border-t border-slate-800/60 text-center">
              <p className="text-[11px] text-slate-600 leading-relaxed pb-2">
                Bu sistem Bahçelievler 15 Temmuz Şehitleri Teknoloji Proje AİHL öğrencileri tarafından geliştirilmiştir.
                <span className="mx-2 text-slate-700">·</span>
                © {new Date().getFullYear()} OPAYS V2
              </p>
            </footer>
          </div>
        </main>
      </div>

      {/* Notification popup */}
      {showNotifPopup && unreadNotifications > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-[#0f1d30] border border-amber-500/30 rounded-2xl shadow-2xl p-5 w-72">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Bell size={15} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Yeni Bildirimler</p>
                  <p className="text-xs text-amber-400">{unreadNotifications} okunmamış</p>
                </div>
              </div>
              <button onClick={() => setShowNotifPopup(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={16} />
              </button>
            </div>
            <button
              onClick={() => { setShowNotifPopup(false); navigate('/notifications'); }}
              className="btn-primary w-full justify-center text-sm py-2"
            >
              Bildirimlere Git
            </button>
            <div className="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full animate-[shrink_8s_linear_forwards]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
