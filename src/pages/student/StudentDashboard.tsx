import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/lib/termContext';
import { getSubjects, getAttendanceRecords, getClassrooms, getTimetable, getAssignmentsBySubject, getScoresByAssignment } from '@/lib/services';
import { Subject, AttendanceRecord, Classroom, STATUS_CONFIG, AttendanceStatus, TimetableEntry, Assignment } from '@/lib/types';
import {
    User,
    BookOpen,
    Calendar,
    CheckCircle,
    Clock,
    AlertTriangle,
    QrCode,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnnouncementFloater } from '@/components/AnnouncementFloater';
import { RealTimeClock } from '@/components/RealTimeClock';



export default function StudentDashboard() {
    const { currentUser } = useAuth();
    const { activeTerm } = useTerm();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [todayTimetable, setTodayTimetable] = useState<TimetableEntry[]>([]);
    const [pendingAssignments, setPendingAssignments] = useState<(Assignment & { subjectName: string })[]>([]);
    const [stats, setStats] = useState<Record<AttendanceStatus, number>>({
        present: 0, late: 0, absent: 0, leave: 0, sick: 0, activity: 0, online: 0
    });
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30s
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (currentUser?.studentId && activeTerm) {
            loadData();
        }
    }, [currentUser, activeTerm]);

    async function loadData() {
        setLoading(true);
        try {
            const [allSubjects, allAttendance, allClassrooms, allTimetable] = await Promise.all([
                getSubjects(activeTerm!.id),
                getAttendanceRecords(activeTerm!.id, { studentId: currentUser!.studentId }),
                getClassrooms(activeTerm!.id),
                getTimetable(activeTerm!.id)
            ]);

            // Filter subjects that include student's classroom
            const student = await (await import('@/lib/services')).getStudents(activeTerm!.id).then(ss => ss.find(s => s.id === currentUser!.studentId));

            if (student) {
                const studentClassroom = allClassrooms.find(c => c.id === student.classroomId);
                setClassroom(studentClassroom || null);

                const studentSubjects = allSubjects.filter(s => s.classrooms.includes(student.classroomId));
                setSubjects(studentSubjects);

                // Filter timetable for today and student's classroom
                const today = new Date();
                const currentDay = today.getDay() === 0 ? 7 : today.getDay();
                const todaySchedule = allTimetable.filter(t =>
                    t.classroomId === student.classroomId &&
                    t.dayOfWeek === currentDay
                ).sort((a, b) => a.period - b.period);
                setTodayTimetable(todaySchedule);

                // Fetch assignments and scores to find pending ones
                const allAssignmentsPromises = studentSubjects.map(s => getAssignmentsBySubject(s.id));
                const subjectsAssignments = await Promise.all(allAssignmentsPromises);

                const pending: (Assignment & { subjectName: string })[] = [];
                for (let i = 0; i < studentSubjects.length; i++) {
                    const sub = studentSubjects[i];
                    const assignments = subjectsAssignments[i];

                    for (const asm of assignments) {
                        const asmScores = await getScoresByAssignment(asm.id);
                        const hasScore = asmScores.some(sc => sc.studentId === currentUser!.studentId);
                        if (!hasScore) {
                            pending.push({ ...asm, subjectName: sub.name });
                        }
                    }
                }
                setPendingAssignments(pending.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')));
            }

            setAttendance(allAttendance);

            // Calculate stats
            const newStats = { ...stats };
            allAttendance.forEach(a => {
                if (newStats[a.status] !== undefined) {
                    newStats[a.status]++;
                }
            });
            setStats(newStats);

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Welcome & Info */}
            <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                        <User className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{currentUser?.name}</h1>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Badge variant="outline">{currentUser?.username}</Badge>
                            {classroom && <span>ห้อง {classroom.name}</span>}
                        </div>
                    </div>
                </div>
                <div className="text-right hidden md:block space-y-2">
                    <p className="text-sm font-medium">{activeTerm?.name}</p>
                    <RealTimeClock />
                </div>

            </div>

            {/* Quick Action - Scan QR */}
            <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <QrCode className="h-40 w-40" />
                </div>
                <CardContent className="p-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold mb-1">สแกน QR Code เพื่อเช็คชื่อ</h2>
                            <p className="text-primary-foreground/80 text-sm">ตรวจสอบคาบเรียนที่กำลังเปิดให้เช็คชื่อและสแกนได้ทันที</p>
                        </div>
                        <Button size="lg" variant="secondary" onClick={() => navigate('/scan-qr')} className="font-bold">
                            <QrCode className="mr-2 h-5 w-5" /> เข้าสู่โหมดสแกน
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(key => {
                    const config = STATUS_CONFIG[key];
                    return (
                        <Card key={key} className="border-none shadow-sm">
                            <CardContent className="p-3 text-center">
                                <div className={`mx-auto h-8 w-8 rounded-full ${config.bgClass} flex items-center justify-center mb-1`}>
                                    <span className="text-sm">{config.icon}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{config.label}</p>
                                <p className="text-lg font-bold">{stats[key]}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Today's Schedule */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">ตารางเรียนวันนี้</CardTitle>
                                <CardDescription>รายวิชาที่คุณต้องเข้าเรียนในวันนี้</CardDescription>
                            </div>
                        </div>
                        <Badge variant="secondary" className="font-bold">
                            {new Date().toLocaleDateString('th-TH', { weekday: 'long' })}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {todayTimetable.length === 0 ? (
                        <div className="text-center py-10 space-y-2">
                            <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto opacity-50">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <p className="text-muted-foreground text-sm font-medium">ไม่มีตารางเรียนในวันนี้</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {todayTimetable.map((entry) => {
                                const subject = subjects.find(s => s.id === entry.subjectId);
                                return (
                                    <div
                                        key={entry.id}
                                        className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:shadow-md transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold overflow-hidden border border-primary/5">
                                                {subject?.logoUrl ? (
                                                    <img src={subject.logoUrl} alt={subject.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <BookOpen className="h-6 w-6" />
                                                )}
                                            </div>
                                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm">
                                                {entry.period === 0 ? 'H' : entry.period}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{entry.subjectName}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{entry.startTime} - {entry.endTime} น.</span>
                                            </div>
                                            {(() => {
                                                const [startH, startM] = entry.startTime.split(':').map(Number);
                                                const [endH, endM] = entry.endTime.split(':').map(Number);
                                                const startTime = new Date(now);
                                                startTime.setHours(startH, startM, 0, 0);
                                                const endTime = new Date(now);
                                                endTime.setHours(endH, endM, 0, 0);

                                                if (now < startTime) {
                                                    const diffMs = startTime.getTime() - now.getTime();
                                                    const diffMins = Math.floor(diffMs / 60000);
                                                    const h = Math.floor(diffMins / 60);
                                                    const m = diffMins % 60;
                                                    return (
                                                        <p className="text-[10px] font-bold text-amber-600 mt-1 animate-pulse">
                                                            กำลังจะเริ่มในอีก {h > 0 ? `${h} ชม. ` : ''}{m} นาที
                                                        </p>
                                                    );
                                                } else if (now >= startTime && now <= endTime) {
                                                    const diffMs = endTime.getTime() - now.getTime();
                                                    const diffMins = Math.floor(diffMs / 60000);
                                                    const h = Math.floor(diffMins / 60);
                                                    const m = diffMins % 60;
                                                    return (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <div className="flex gap-0.5 h-1.5 w-1.5">
                                                                <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-green-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-green-600">
                                                                นับถอยหลังเวลาเรียน: {h > 0 ? `${h} ชม. ` : ''}{m} นาที
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <Button variant="ghost" size="icon" className="rounded-full flex sm:hidden lg:flex" onClick={() => navigate('/scan-qr')}>
                                            <QrCode className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                    )}
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Pending Assignments */}
                <Card className="border-none shadow-sm h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">งานที่ยังไม่ได้ส่ง</CardTitle>
                            <CardDescription>การบ้านหรือใบงานที่ยังไม่มีคะแนน</CardDescription>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingAssignments.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle className="h-10 w-10 text-green-500/20 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">ไม่มีงานค้างในขณะนี้ เก่งมาก!</p>
                            </div>
                        ) : pendingAssignments.map(asm => (
                            <div
                                key={asm.id}
                                className="p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-bold text-sm text-primary">{asm.title}</p>
                                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">รอดำเนินการ</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{asm.subjectName}</p>
                                {asm.dueDate && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-medium">
                                        <Clock className="h-3 w-3" />
                                        กำหนดส่ง: {new Date(asm.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} {asm.dueTime || ''}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* My Subjects */}
                <Card className="border-none shadow-sm h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">วิชาที่เรียนเทอมนี้</CardTitle>
                            <CardDescription>วิชาที่คุณลงทะเบียนไว้ในแผนการเรียน</CardDescription>
                        </div>
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {subjects.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground text-sm">ยังไม่มีรายวิชาในเทอมนี้</p>
                        ) : subjects.map(s => (
                            <div
                                key={s.id}
                                onClick={() => navigate('/my-subjects')}
                                className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group"
                            >
                                <div>
                                    <p className="font-bold text-sm">{s.code}</p>
                                    <p className="text-xs text-muted-foreground">{s.name}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Recent Activity / Attendance */}
                <Card className="border-none shadow-sm h-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg">ประวัติการเข้าเรียนล่าสุด</CardTitle>
                            <CardDescription>5 รายการล่าสุด</CardDescription>
                        </div>
                        <Clock className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {attendance.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground text-sm">ยังไม่มีประวัติการเช็คชื่อ</p>
                        ) : attendance.slice(0, 5).map(a => {
                            const subject = subjects.find(s => s.id === a.subjectId);
                            const config = STATUS_CONFIG[a.status];
                            return (
                                <div key={a.id} className="flex items-start gap-3">
                                    <div className={`mt-1 h-3 w-3 rounded-full ${config.dotClass} shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{subject?.name || 'Unknown'}</p>
                                        <p className="text-[10px] text-muted-foreground">{a.period === 0 ? 'กิจกรรม/โฮมรูม' : `คาบ ${a.period}`} · {new Date(a.date).toLocaleDateString('th-TH')}</p>
                                    </div>
                                    <Badge variant="outline" className={`${config.bgClass} text-[10px] py-0 h-5`}>
                                        {config.label}
                                    </Badge>
                                </div>
                            );
                        })}
                        <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2" onClick={() => navigate('/attendance-history')}>
                            ดูประวัติทั้งหมด
                        </Button>
                    </CardContent>
                </Card>
            </div>
            {classroom && <AnnouncementFloater classroomId={classroom.id} />}
        </div>
    );
}

