import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  CalendarDays,
  ChevronRight,
  Search,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimetable, getDashboardData } from '@/lib/services';
import { TimetableEntry, AttendanceSummary, STATUS_CONFIG, AttendanceStatus } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { useTerm } from '@/lib/termContext';
import { RealTimeClock } from '@/components/RealTimeClock';




const dayNames = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

function StatusBadge({ status, count }: { status: AttendanceStatus; count: number }) {
  if (count === 0) return null;
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-accent-foreground',
        config.color
      )}
    >
      {config.label} {count}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeTerm } = useTerm();
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [searchDate, setSearchDate] = useState(today.toISOString().split('T')[0]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    present: 0,
    late: 0,
    absent: 0
  });
  const [loading, setLoading] = useState(true);

  const handleSearch = () => {
    setSearchDate(date);
  };

  useEffect(() => {
    async function loadData() {
      if (!activeTerm) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [tt, dashData] = await Promise.all([
          getTimetable(), // Timetable is likely mock or simple fetch
          getDashboardData(activeTerm.id, searchDate)
        ]);

        setTimetable(tt);
        setAttendanceSummary(dashData.classroomSummary);
        setStats({
          totalStudents: dashData.stats.totalStudents,
          present: dashData.stats.present,
          late: dashData.stats.late,
          absent: dashData.stats.absent
        });
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTerm, searchDate]);

  const statCards = [
    { label: 'นักเรียนทั้งหมด', value: stats.totalStudents.toString(), icon: Users, trend: '' },
    { label: 'มาเรียนวันนี้', value: stats.present.toString(), icon: UserCheck, trend: stats.totalStudents > 0 ? `${((stats.present / stats.totalStudents) * 100).toFixed(1)}%` : '0%' },
    { label: 'สาย', value: stats.late.toString(), icon: Clock, trend: stats.totalStudents > 0 ? `${((stats.late / stats.totalStudents) * 100).toFixed(1)}%` : '0%' },
    { label: 'ขาด/ลา/ป่วย', value: stats.absent.toString(), icon: UserX, trend: '' }, // Combined or just absent? Let's use absent for now or sum of bad statuses? Stat card says 'ขาด' but usage might imply 'Not Here'.
  ];

  const todaySchedule = timetable.filter((t) => t.dayOfWeek === dayOfWeek || t.dayOfWeek === 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">แดชบอร์ด</h1>
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <span className="font-bold text-primary">{activeTerm?.name || 'ภาคเรียนที่ 1/2568'}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{dayNames[dayOfWeek]}ที่{' '}{today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RealTimeClock />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-auto shadow-sm text-xs sm:text-sm h-9 sm:h-10"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold"
            >
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">ค้นหา</span>
            </Button>
          </div>
        </div>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <stat.icon className="h-12 w-12" />
            </div>
            <CardContent className="flex items-center gap-3 sm:gap-4 p-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black tracking-tight">{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{stat.label}</p>
              </div>
              {stat.trend && (
                <div className="ml-auto flex flex-col items-end">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {stat.trend}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attendance Summary */}
        <Card className="border-0 shadow-sm lg:col-span-3 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/10 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              สรุปการเข้าเรียนรายห้อง
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-4 py-3 text-left font-bold text-muted-foreground uppercase text-[10px] tracking-wider">ห้องเรียน</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">มา</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">สาย</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">ขาด</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">ลา/ป่วย</th>
                    <th className="px-4 py-3 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-wider">รวม</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {attendanceSummary.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">ไม่พบข้อมูลสรุป</td></tr>
                  ) : (
                    attendanceSummary.map((row) => (
                      <tr key={row.classroomName} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-4 font-bold text-primary">{row.classroomName}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-xs font-bold text-green-600 border border-green-100 italic">
                            {row.present}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-600 border border-amber-100">
                            {row.late}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600 border border-red-100">
                            {row.absent}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600 border border-blue-100">
                            {row.leave + row.sick}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-black text-muted-foreground">{row.total}</td>
                        <td className="px-4 py-4 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate('/attendance')}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-border/50">
              {attendanceSummary.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">ไม่พบข้อมูลสรุป</div>
              ) : attendanceSummary.map((row) => (
                <div key={row.classroomName} className="p-4 bg-card active:bg-muted/50 transition-colors" onClick={() => navigate('/attendance')}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-primary">{row.classroomName}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">นักเรียน {row.total} คน</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center p-2 rounded-xl bg-green-50/50 border border-green-100/50">
                      <span className="text-lg font-black text-green-600">{row.present}</span>
                      <span className="text-[9px] font-bold text-green-600/70 uppercase">มา</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-xl bg-amber-50/50 border border-amber-100/50">
                      <span className="text-lg font-black text-amber-600">{row.late}</span>
                      <span className="text-[9px] font-bold text-amber-600/70 uppercase">สาย</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-xl bg-red-50/50 border border-red-100/50">
                      <span className="text-lg font-black text-red-600">{row.absent}</span>
                      <span className="text-[9px] font-bold text-red-600/70 uppercase">ขาด</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-xl bg-blue-50/50 border border-blue-100/50">
                      <span className="text-lg font-black text-blue-600">{row.leave + row.sick}</span>
                      <span className="text-[9px] font-bold text-blue-600/70 uppercase">ลา/ป่วย</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="border-0 shadow-sm lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/10 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays className="h-4 w-4 text-primary" />
              คาบเรียนวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {todaySchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">ไม่มีคาบเรียนวันนี้</p>
                <p className="text-xs text-muted-foreground/70 mt-1">พักผ่อนหรือเตรียมงานอื่นๆ</p>
              </div>
            ) : (
              todaySchedule.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => navigate('/attendance')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/30 p-4 text-left transition-all hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm active:scale-[0.98] group"
                >
                  <div className="relative">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/10 group-hover:scale-110 transition-transform">
                      <span className="text-xs font-black">คาบ {entry.period === 0 ? 'H' : entry.period}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold group-hover:text-primary transition-colors">{entry.subjectName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium">{entry.classroomName}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="font-mono text-[10px]">{entry.startTime}–{entry.endTime}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
