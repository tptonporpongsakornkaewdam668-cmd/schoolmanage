import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getStudentAttendanceStats, getClassrooms, addStudent } from '@/lib/services';
import { Student, AttendanceStatus, Classroom } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StudentDialog } from '@/components/StudentDialog';
import { useToast } from '@/hooks/use-toast';

// Helper for status config
export const statusColors: Record<AttendanceStatus, string> = {
    present: 'bg-green-100 text-green-700 border-green-200',
    late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    leave: 'bg-blue-100 text-blue-700 border-blue-200',
    sick: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    activity: 'bg-orange-100 text-orange-700 border-orange-200',
    online: 'bg-purple-100 text-purple-700 border-purple-200',
};

const statusLabels: Record<AttendanceStatus, string> = {
    present: 'มา',
    late: 'สาย',
    absent: 'ขาด',
    leave: 'ลา',
    sick: 'ป่วย',
    activity: 'กิจกรรม',
    online: 'ออนไลน์',
};

export default function ClassroomDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ student: Student; stats: Record<AttendanceStatus, number> }[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [classroomName, setClassroomName] = useState('');

    useEffect(() => {
        if (!id) return;
        async function load() {
            try {
                setLoading(true);
                // Quick way to get name, fetch all classrooms and find one
                const allClassrooms = await getClassrooms();
                setClassrooms(allClassrooms); // Save for dialog
                const cls = allClassrooms.find(c => c.id === id);
                if (cls) setClassroomName(cls.name);

                const stats = await getStudentAttendanceStats(id);
                setData(stats);
            } catch (e) {
                console.error("Failed to load details", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    const handleAddStudent = async (student: Omit<Student, 'id'>) => {
        try {
            await addStudent(student);
            // Reload stats
            const stats = await getStudentAttendanceStats(id!);
            setData(stats);
            toast({ title: "เพิ่มนักเรียนสำเร็จ" });
        } catch (e) {
            console.error(e);
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/classrooms')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">รายชื่อนักเรียน - {classroomName}</h1>
                        <p className="text-sm text-muted-foreground">สรุปการเข้าเรียนรายบุคคล</p>
                    </div>
                </div>
                {/* Add Student Dialog */}
                <StudentDialog classrooms={classrooms} onSave={handleAddStudent} defaultClassroomId={id} />
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/30">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[50px]">ลำดับ</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[100px]">รหัสนักเรียน</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">ชื่อ-สกุล</th>
                                {Object.keys(statusLabels).map((status) => (
                                    <th key={status} className="px-2 py-3 text-center font-medium text-muted-foreground min-w-[60px]">
                                        {statusLabels[status as AttendanceStatus]}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center font-medium text-muted-foreground min-w-[80px]">รวมวันเรียน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => {
                                const total = Object.values(item.stats).reduce((a, b) => a + b, 0);
                                return (
                                    <tr key={item.student.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/10">
                                        <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.student.studentCode}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                    {item.student.fullName.charAt(0)}
                                                </div>
                                                <span className="font-medium truncate">{item.student.fullName}</span>
                                            </div>
                                        </td>
                                        {Object.keys(statusLabels).map((key) => {
                                            const count = item.stats[key as AttendanceStatus];
                                            return (
                                                <td key={key} className="px-2 py-3 text-center">
                                                    {count > 0 ? (
                                                        <span className={cn("inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold border", statusColors[key as AttendanceStatus])}>
                                                            {count}
                                                        </span>
                                                    ) : <span className="text-muted-foreground/30 text-xs">-</span>}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-center font-bold">
                                            {total}
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูลนักเรียนในห้องเรียนนี้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
