import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/lib/termContext';
import { getSubjects, getAttendanceRecords, getClassrooms } from '@/lib/services';
import { Subject, AttendanceRecord, Classroom, STATUS_CONFIG, AttendanceStatus } from '@/lib/types';
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

export default function StudentDashboard() {
    const { currentUser } = useAuth();
    const { activeTerm } = useTerm();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [stats, setStats] = useState<Record<AttendanceStatus, number>>({
        present: 0, late: 0, absent: 0, leave: 0, sick: 0, activity: 0, online: 0
    });

    useEffect(() => {
        if (currentUser?.studentId && activeTerm) {
            loadData();
        }
    }, [currentUser, activeTerm]);

    async function loadData() {
        setLoading(true);
        try {
            const [allSubjects, allAttendance, allClassrooms] = await Promise.all([
                getSubjects(activeTerm!.id),
                getAttendanceRecords(activeTerm!.id, { studentId: currentUser!.studentId }),
                getClassrooms(activeTerm!.id)
            ]);

            // Filter subjects that include student's classroom
            const student = await (await import('@/lib/services')).getStudents(activeTerm!.id).then(ss => ss.find(s => s.id === currentUser!.studentId));

            if (student) {
                const studentClassroom = allClassrooms.find(c => c.id === student.classroomId);
                setClassroom(studentClassroom || null);

                const studentSubjects = allSubjects.filter(s => s.classrooms.includes(student.classroomId));
                setSubjects(studentSubjects);
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
                <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">{activeTerm?.name}</p>
                    <p className="text-xs text-muted-foreground">ปีการศึกษา 2568</p>
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

            <div className="grid md:grid-cols-2 gap-6">
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
                                        <p className="text-[10px] text-muted-foreground">คาบ {a.period} · {new Date(a.date).toLocaleDateString('th-TH')}</p>
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
        </div>
    );
}
