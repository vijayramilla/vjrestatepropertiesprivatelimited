import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { leadSupabase } from '@/services/leadSupabase';
import {
  LayoutDashboard,
  IndianRupee,
  Users,
  Database,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  UserCog,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, path: '/crm', perm: null },
  { id: 'earnings', title: 'Earnings', icon: IndianRupee, path: '/crm/earnings', perm: 'earnings.view' },
  { id: 'clients', title: 'Clients', icon: Users, path: '/crm', perm: 'clients.view' },
  { id: 'requirements', title: 'Requirements', icon: ClipboardList, path: '/crm/requirements', perm: 'requirements.view' },
  { id: 'agents', title: 'Agents', icon: UserCog, path: '/crm/agents', perm: 'agents.view' },
  { id: 'data', title: 'Database 1', icon: Database, path: '/crm/data', perm: 'data.view' },
  { id: 'mongodb-data', title: 'Database 2', icon: Server, path: '/crm/mongodb-data', perm: 'database.view' },
];

export default function CrmSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('V');
  const [perms, setPerms] = useState<string[] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const u = auth.currentUser;
    if (u) {
      setUserName(u.displayName ?? u.email ?? 'Admin');
      setUserInitial((u.displayName?.[0] ?? u.email?.[0] ?? 'V').toUpperCase());
      leadSupabase.admin.verify().then(p => {
        setPerms(p.permissions ?? null);
        if (p.data?.display_name) {
          setUserName(p.data.display_name);
          setUserInitial(p.data.display_name[0].toUpperCase());
        }
      }).catch(() => {});
    }
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        setUserName(user.displayName ?? user.email ?? 'Admin');
        setUserInitial((user.displayName?.[0] ?? user.email?.[0] ?? 'V').toUpperCase());
        leadSupabase.admin.verify().then(p => {
          setPerms(p.permissions ?? null);
          if (p.data?.display_name) {
            setUserName(p.data.display_name);
            setUserInitial(p.data.display_name[0].toUpperCase());
          }
        }).catch(() => {});
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function canSee(perm: string | null) {
    if (!perm) return true;
    if (!perms || perms.length === 0) return true;
    if (perms.includes(perm)) return true;
    const editPerm = perm.replace('.view', '.edit');
    if (perm.endsWith('.view') && perms.includes(editPerm)) return true;
    return false;
  }

  const isActive = (path: string, id: string) => {
    if (id === 'dashboard') return location.pathname === '/crm';
    if (id === 'clients') return location.pathname === '/crm' && !location.pathname.includes('earnings');
    return location.pathname === path;
  };

  const sidebar = (
    <div className={`flex flex-col h-full bg-card ${collapsed ? 'w-[60px]' : 'w-[240px]'}`}>
      <div className="flex items-center h-14 border-b border-border px-3 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
            <img src="/favicon.png" alt="VJR Estate" className="w-full h-full object-contain" />
          </div>
          <div className={`flex flex-col transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <span className="text-[13px] font-semibold text-foreground leading-tight whitespace-nowrap">VJR Estate</span>
            <span className="text-[10px] text-muted-foreground leading-tight">CRM Portal</span>
          </div>
        </div>
        <button onClick={onToggle} className="ml-auto p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 max-sm:hidden">
          {collapsed ? <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} /> : <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />}
        </button>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors shrink-0 sm:hidden">
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.filter(item => canSee(item.perm)).map((item) => {
          const active = isActive(item.path, item.id);
          return (
            <button key={item.id} onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-2.5 py-[7px] rounded-md transition-all duration-200 cursor-pointer border-none text-left ${
                active ? 'bg-black/5 dark:bg-white/10 text-foreground font-medium' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground/90'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.title : undefined}>
              <span className="relative inline-flex">
                <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-foreground' : 'text-muted-foreground/70'}`} strokeWidth={1.5} />
                {item.id === 'mongodb-data' && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-background" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }} />}
              </span>
              <span className={`text-[13px] tracking-wide transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{item.title}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-2 border-t border-border">
        <button onClick={() => navigate('/crm/profile')}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md transition-all duration-200 cursor-pointer border-none text-left hover:bg-black/5 dark:hover:bg-white/5 ${
            location.pathname === '/crm/profile' ? 'bg-black/5 dark:bg-white/10' : ''
          } ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Profile' : undefined}>
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground">{userInitial}</span>
          </div>
          <div className={`transition-opacity duration-200 text-left ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <div className="text-[12px] font-medium text-foreground leading-tight whitespace-nowrap">{userName}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Profile</div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="sm:hidden fixed top-3 left-3 z-40 w-9 h-9 rounded-lg bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
        <Menu className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <div className={`sm:hidden fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)} />
      <div className={`sm:hidden fixed left-0 top-0 z-50 h-full transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </div>
      <div className={`hidden sm:flex h-full border-r border-border shrink-0 transition-all duration-300 ease-in-out ${collapsed ? 'w-[60px]' : 'w-[240px]'}`}>
        {sidebar}
      </div>
    </>
  );
}
