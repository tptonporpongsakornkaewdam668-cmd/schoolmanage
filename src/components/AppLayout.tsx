import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TermSelector } from './TermSelector';
import { AcademicManagementDialog } from './AcademicManagementDialog';

import { useAuth, AppUser } from '@/contexts/AuthContext';
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
  { icon: FileText, label: 'รายงาน', path: '/reports' },
  { icon: Settings, label: 'ตั้งค่า', path: '/settings' },
];

const studentNavItems = [
  { icon: LayoutDashboard, label: 'แดชบอร์ด', path: '/' },
  { icon: QrCode, label: 'สแกน QR', path: '/scan-qr' },
  { icon: BookOpen, label: 'วิชาของฉัน', path: '/my-subjects' },
  { icon: History, label: 'ประวัติเข้าเรียน', path: '/attendance-history' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = currentUser?.role === 'student' ? studentNavItems : teacherNavItems;

  const navigate = (path: string) => {
    // We'll use Link's 'to' so no need for manual navigate here, but just in case
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
          'fixed z-50 flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:relative lg:z-auto',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="truncate text-sm font-bold text-sidebar-primary">
                Class Companion
              </h1>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {currentUser?.role === 'student' ? 'Student Portal' : 'Teacher Portal'}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
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
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Term Selector */}
          <TermSelector />

          <div className="flex-1" />

          {/* Academic Management - Only for teachers */}
          {currentUser?.role !== 'student' && <AcademicManagementDialog />}

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{currentUser?.role}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                    {currentUser?.name?.charAt(0) || 'U'}
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
