import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/lib/termContext';
import { getSubjects, getAttendanceRecords, getStudents } from '@/lib/services';
import { Subject, AttendanceRecord, STATUS_CONFIG, AttendanceStatus } from '@/lib/types';
import { BookOpen, Calendar, ClipboardList, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MySubjectsPage() {
    const { currentUser } = useAuth();
    const { activeTerm } = useTerm();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord[]>>({});

    useEffect(() => {
        if (currentUser?.studentId && activeTerm) {
            loadSubjects();
        }
    }, [currentUser, activeTerm]);

    async function loadSubjects() {
        setLoading(true);
        try {
            const [allSubjects, allAttendance, students] = await Promise.all([
                getSubjects(activeTerm!.id),
                getAttendanceRecords(activeTerm!.id, { studentId: currentUser!.studentId }),
                getStudents(activeTerm!.id)
            ]);

            const student = students.find(s => s.id === currentUser!.studentId);
            if (student) {
                const studentSubjects = allSubjects.filter(s => s.classrooms.includes(student.classroomId));
                setSubjects(studentSubjects);

                // Group attendance by subject
                const grouped: Record<string, AttendanceRecord[]> = {};
                allAttendance.forEach(a => {
                    if (!grouped[a.subjectId]) grouped[a.subjectId] = [];
                    grouped[a.subjectId].push(a);
                });
                setAttendanceData(grouped);
            }
        } catch (error) {
            console.error("Failed to load subjects", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">วิชาของฉัน</h1>
                    <p className="text-sm text-muted-foreground">รายการวิชาที่ลงทะเบียนในภาคเรียน {activeTerm?.name}</p>
                </div>
            </div>

            {subjects.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        ไม่พบข้อมูลรายวิชาที่คุณลงทะเบียนไว้
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {subjects.map(subject => {
                        const records = attendanceData[subject.id] || [];
                        const statusCounts: Record<AttendanceStatus, number> = {
                            present: 0, late: 0, absent: 0, leave: 0, sick: 0, activity: 0, online: 0
                        };
                        records.forEach(r => statusCounts[r.status]++);

                        return (
                            <Card key={subject.id} className="border-none shadow-sm overflow-hidden">
                                <CardHeader className="bg-primary/5 pb-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">{subject.code}</span>
                                                    <Badge variant="secondary" className="text-[10px] h-4">วิชาบังคับ</Badge>
                                                </div>
                                                <CardTitle className="text-xl">{subject.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground mt-0.5">ผู้สอน: {subject.teachers?.join(', ') || 'ไม่ระบุ'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(key => {
                                                if (statusCounts[key] === 0) return null;
                                                const config = STATUS_CONFIG[key];
                                                return (
                                                    <Badge key={key} variant="outline" className={`${config.bgClass} text-[10px] py-0`}>
                                                        {config.label} {statusCounts[key]}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Tabs defaultValue="timetable" className="w-full">
                                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 h-12">
                                            <TabsTrigger value="timetable" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                                                <Calendar className="h-4 w-4 mr-2" /> ตารางเรียน
                                            </TabsTrigger>
                                            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                                                <ClipboardList className="h-4 w-4 mr-2" /> ประวัติการเช็คชื่อ
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="timetable" className="p-6">
                                            <div className="space-y-3">
                                                {subject.schedules && subject.schedules.length > 0 ? (
                                                    subject.schedules.map((schedule, idx) => (
                                                        <div key={idx} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                                                            <div className="h-10 w-10 rounded bg-primary/10 flex flex-col items-center justify-center text-primary">
                                                                <span className="text-[10px] uppercase font-bold">{['', 'จัน', 'อัง', 'พุธ', 'พฤ', 'ศุก', 'เสาร์', 'อา'][schedule.dayOfWeek]}</span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">คาบเรียนที่ {schedule.period}</p>
                                                                <p className="text-xs text-muted-foreground">{schedule.startTime} - {schedule.endTime}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground italic text-center py-4">ยังไม่ได้กำหนดตารางเรียน</p>
                                                )}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="history" className="p-6">
                                            <div className="space-y-4">
                                                {records.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground italic text-center py-4">ยังไม่มีประวัติการเช็คชื่อในวิชานี้</p>
                                                ) : (
                                                    records.sort((a, b) => b.date.localeCompare(a.date)).map(record => {
                                                        const config = STATUS_CONFIG[record.status];
                                                        return (
                                                            <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                                                                <div>
                                                                    <p className="text-sm font-medium">{new Date(record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                                    <p className="text-xs text-muted-foreground">คาบที่ {record.period} · {record.checkInTime || 'ไม่ระบุเวลา'}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <Badge className={config.bgClass}>{config.label}</Badge>
                                                                    {record.note && <p className="text-[10px] text-muted-foreground mt-1">{record.note}</p>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
