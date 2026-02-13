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
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    present: 0,
    late: 0,
    absent: 0
  });
  const [loading, setLoading] = useState(true);

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
          getDashboardData(activeTerm.id, date)
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
  }, [activeTerm, date]);

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-muted-foreground">
            ภาคเรียนที่ 1/2568 · {dayNames[dayOfWeek]}ที่{' '}
            {today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            className="w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              {stat.trend && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {stat.trend}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attendance Summary Table */}
        <Card className="border-0 shadow-sm lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">สรุปการเข้าเรียนตามห้อง</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left font-medium text-muted-foreground">ห้อง</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">มา</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">สาย</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">ขาด</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">ลา</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">ป่วย</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">รวม</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceSummary.length === 0 ? (
                    <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">ไม่พบข้อมูลสรุป</td></tr>
                  ) : (
                    attendanceSummary.map((row) => (
                      <tr key={row.classroomName} className="border-b border-border/50 last:border-0">
                        <td className="py-3 font-medium">{row.classroomName}</td>
                        <td className="py-3 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-status-present/10 text-xs font-semibold text-status-present">
                            {row.present}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-status-late/10 text-xs font-semibold text-status-late">
                            {row.late}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-status-absent/10 text-xs font-semibold text-status-absent">
                            {row.absent}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-status-leave/10 text-xs font-semibold text-status-leave">
                            {row.leave}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-status-sick/10 text-xs font-semibold text-status-sick">
                            {row.sick}
                          </span>
                        </td>
                        <td className="py-3 text-center font-medium">{row.total}</td>
                        <td className="py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigate('/attendance')}>
                            ดูเพิ่มเติม <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              คาบเรียนวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaySchedule.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ไม่มีคาบเรียนวันนี้
              </p>
            ) : (
              todaySchedule.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => navigate('/attendance')}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/50 p-3 text-left transition-colors hover:bg-secondary"
                >
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-xs font-bold">คาบ {entry.period}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{entry.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.classroomName} · {entry.startTime}–{entry.endTime}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
