import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash, RefreshCw } from 'lucide-react';
import { getClassrooms, deleteClassroom, recalculateAllClassroomCounts } from '@/lib/services';
import { Classroom } from '@/lib/types';
import { ClassroomDialog } from '@/components/ClassroomDialog';
import { EditClassroomDialog } from '@/components/EditClassroomDialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useTerm } from '@/lib/termContext';

export default function ClassroomsPage() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { activeTerm } = useTerm();
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(false);

    useEffect(() => {
        if (activeTerm) {
            loadClassrooms();
            // Auto-recalculate on first load to fix any incorrect counts
            handleRecalculateCounts(true);
        }
    }, [activeTerm]);

    const loadClassrooms = async () => {
        if (!activeTerm) return;

        try {
            const data = await getClassrooms(activeTerm.id);
            setClassrooms(data);
        } catch (error) {
            console.error("Failed to fetch classrooms", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculateCounts = async (silent = false) => {
        setRecalculating(true);
        try {
            const result = await recalculateAllClassroomCounts();
            if (!silent) {
                toast({
                    title: "อัปเดตสำเร็จ",
                    description: `คำนวณจำนวนนักเรียนใหม่สำเร็จ ${result.updatedClassrooms} ห้อง`
                });
            }
            await loadClassrooms(); // Reload to show updated counts
        } catch (error) {
            if (!silent) {
                toast({
                    title: "เกิดข้อผิดพลาด",
                    description: "ไม่สามารถคำนวณจำนวนนักเรียนได้",
                    variant: "destructive"
                });
            }
        } finally {
            setRecalculating(false);
        }
    };

    const handleDeleteClassroom = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Find the classroom to get student count
        const classroom = classrooms.find(c => c.id === id);
        const studentCount = classroom?.studentCount || 0;

        const message = studentCount > 0
            ? `ต้องการลบห้องเรียนนี้หรือไม่?\n\n⚠️ จะลบนักเรียนทั้งหมด ${studentCount} คน ในห้องนี้ด้วย`
            : 'แน่ใจหรือไม่ที่จะลบห้องเรียนนี้?';

        if (!confirm(message)) return;

        try {
            const result = await deleteClassroom(id);
            const desc = result.deletedStudents > 0
                ? `ลบห้องเรียนและนักเรียน ${result.deletedStudents} คน เรียบร้อยแล้ว`
                : 'ลบห้องเรียนเรียบร้อยแล้ว';

            toast({ title: "ลบสำเร็จ", description: desc });
            loadClassrooms();
        } catch (e) {
            toast({ title: "ลบไม่สำเร็จ", variant: "destructive", description: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">จัดการห้องเรียน</h1>
                    <p className="text-sm text-muted-foreground">เพิ่มและจัดการรายชื่อห้องเรียน</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecalculateCounts()}
                        disabled={recalculating}
                    >
                        {recalculating ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-1.5 h-4 w-4" />
                        )}
                        คำนวณจำนวนนักเรียน
                    </Button>
                    <ClassroomDialog onSave={loadClassrooms} />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classrooms.map((classroom) => (
                        <Card
                            key={classroom.id}
                            className="cursor-pointer hover:bg-secondary/10 transition-colors"
                            onClick={() => navigate(`/classrooms/${classroom.id}`)}
                        >
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">{classroom.name}</h3>
                                    <p className="text-sm text-muted-foreground">{classroom.level}</p>
                                    <Badge variant="secondary" className="mt-2 text-xs">
                                        {classroom.studentCount || 0} นักเรียน
                                    </Badge>
                                </div>
                                <div className="flex gap-1">
                                    <EditClassroomDialog
                                        classroom={classroom}
                                        onSave={loadClassrooms}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={(e) => handleDeleteClassroom(classroom.id, e)}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
