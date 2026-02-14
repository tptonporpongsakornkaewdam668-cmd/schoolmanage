import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSystemSettings } from '@/lib/services';
import { SystemSettings } from '@/lib/types';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  BookOpen,
  Calendar,
  Settings,
  ChevronLeft,
  GraduationCap,
  FileText,
  Menu,
  HelpCircle,
  Bell
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { TermSelector } from './TermSelector';
import { AcademicManagementDialog } from './AcademicManagementDialog';

import { useAuth } from '@/contexts/AuthContext';
import { AppUser } from '@/lib/types';
import {
  Plus,
  LogOut,
  User as UserIcon,
  Key,
  QrCode,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const teacherNavItems = [
  { icon: LayoutDashboard, label: 'แดชบอร์ด', path: '/' },
  { icon: ClipboardCheck, label: 'เช็คชื่อ', path: '/attendance' },
  { icon: Users, label: 'นักเรียน', path: '/students' },
  { icon: BookOpen, label: 'รายวิชา', path: '/subjects' },
  { icon: GraduationCap, label: 'ห้องเรียน', path: '/classrooms' },
  { icon: Calendar, label: 'ตารางสอน', path: '/timetable' },
  { icon: Bell, label: 'แจ้งเตือน', path: '/announcements' },
  { icon: FileText, label: 'รายงาน', path: '/reports' },
  { icon: Settings, label: 'ตั้งค่า', path: '/settings' },
  { icon: HelpCircle, label: 'คู่มือการใช้งาน', path: '/guide' },
];

const studentNavItems = [
  { icon: LayoutDashboard, label: 'แดชบอร์ด', path: '/' },
  { icon: QrCode, label: 'สแกน QR', path: '/scan-qr' },
  { icon: BookOpen, label: 'วิชาของฉัน', path: '/my-subjects' },
  { icon: FileText, label: 'งานและคะแนน', path: '/assignments' },
  { icon: History, label: 'ประวัติเข้าเรียน', path: '/attendance-history' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(() => {
    const cached = localStorage.getItem('system_settings');
    if (cached) {
      try {
        const s = JSON.parse(cached);
        if (s.schoolName) document.title = s.schoolName;
        return s;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const location = useLocation();

  useEffect(() => {
    getSystemSettings().then((s) => {
      setSettings(s);
      if (s) {
        localStorage.setItem('system_settings', JSON.stringify(s));
        if (s.schoolName) {
          document.title = s.schoolName;
        }
        if (s.logoUrl) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = s.logoUrl;
        }
      }
    });
  }, []);

  const navItems = currentUser?.role === 'student'
    ? studentNavItems
    : teacherNavItems.filter(item => {
      if ((item.path === '/settings' || item.path === '/announcements') && currentUser?.role !== 'admin') return false;
      return true;
    });


  const navigate = (path: string) => {
    // We'll use Link's 'to' so no need for manual navigate here, but just in case
  };

  return (
    <div className="flex h-screen overflow-hidden"> {/* Removed bg-background to show animated background */}
      {/* Animated Background Shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
        <div className="shape shape-6"></div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed z-50 flex h-full flex-col transition-all duration-300 lg:relative lg:z-auto',
          'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-white/20 shadow-xl',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo with gradient */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-white/10">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 overflow-hidden shadow-lg ring-2 ring-primary/20">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <GraduationCap className="h-6 w-6 text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="truncate text-sm font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {settings?.schoolName || 'Class Companion'}
              </h1>
              <p className="truncate text-xs text-muted-foreground font-medium">
                {currentUser?.role === 'student' ? '🎓 Student Portal' : '👨‍🏫 Teacher Portal'}
              </p>
            </div>
          )}
        </div>

        {/* Nav with hover effects */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:scale-[1.02] hover:shadow-md',
                  isActive
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-primary'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 shrink-0 transition-transform group-hover:scale-110',
                  isActive && 'drop-shadow-sm'
                )} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-3 mb-4 hidden items-center justify-center rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground lg:flex"
        >
          <ChevronLeft
            className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
          />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with glass effect */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-4 lg:px-6 shadow-sm">
          {/* Mobile Menu Icon */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Header Logo & Name with gradient */}
          <div className="hidden lg:flex items-center gap-3 mr-4 border-r pr-4 border-white/20 h-8">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 overflow-hidden shadow-md ring-2 ring-primary/10">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
              ) : (
                <GraduationCap className="h-5 w-5 text-white" />
              )}
            </div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent truncate max-w-[200px]">
              {settings?.schoolName || 'Class Companion'}
            </h1>
          </div>

          {/* Term Selector */}
          <TermSelector />

          <div className="flex-1" />

          {/* Academic Management - Only for teachers */}
          {currentUser?.role !== 'student' && (
            <div className="hidden sm:block">
              <AcademicManagementDialog />
            </div>
          )}

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center gap-2 text-left hover:opacity-90 transition-all rounded-xl p-1.5 hover:bg-white/50 dark:hover:bg-slate-800/50">
                  <div className="hidden lg:block text-right">
                    <p className="text-sm font-semibold leading-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">{currentUser?.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{currentUser?.role}</p>
                  </div>
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-sm font-bold text-white shadow-lg overflow-hidden ring-2 ring-primary/20 group-hover:ring-4 transition-all">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name?.charAt(0) || 'U'
                    )}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" /> โปรไฟล์
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/change-password" title="เปลี่ยนรหัสผ่าน" className="cursor-pointer">
                    <Key className="mr-2 h-4 w-4" /> เปลี่ยนรหัสผ่าน
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" /> ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
