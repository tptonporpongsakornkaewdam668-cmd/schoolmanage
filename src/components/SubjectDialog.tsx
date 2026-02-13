import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Subject, Classroom, PeriodConfig, SubjectSchedule } from '@/lib/types';
import { Plus, Trash, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTerm } from '@/lib/termContext';
import { useToast } from '@/hooks/use-toast';

interface SubjectDialogProps {
    classrooms: Classroom[];
    periods: PeriodConfig[];
    onSave: (subject: Omit<Subject, 'id'>) => Promise<void>;
}

const DAYS = [
    { value: 1, label: 'จันทร์' },
    { value: 2, label: 'อังคาร' },
    { value: 3, label: 'พุธ' },
    { value: 4, label: 'พฤหัสบดี' },
    { value: 5, label: 'ศุกร์' },
    { value: 6, label: 'เสาร์' },
    { value: 7, label: 'อาทิตย์' },
];

export function SubjectDialog({ classrooms, periods, onSave }: SubjectDialogProps) {
    const { activeTerm } = useTerm();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        classrooms: [] as string[]
    });
    const [schedules, setSchedules] = useState<SubjectSchedule[]>([]);

    // State for temporary schedule addition
    const [scheduleForm, setScheduleForm] = useState<{ classroomId: string, day: string, period: string, startTime: string, endTime: string }>({
        classroomId: '', day: '', period: '', startTime: '', endTime: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeTerm) {
            toast({ title: "กรุณาเลือกเทอมก่อน", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await onSave({
                ...formData,
                schedules: schedules,
                termId: activeTerm.id
            });
            setOpen(false);
            setFormData({ code: '', name: '', classrooms: [] });
            setSchedules([]);
            toast({ title: "เพิ่มวิชาสำเร็จ" });
        } catch (error) {
            console.error(error);
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const toggleClassroom = (id: string) => {
        setFormData(prev => {
            const current = prev.classrooms;
            const isSelected = current.includes(id);
            if (isSelected) {
                // Remove classroom -> remove schedules for it?
                setSchedules(prev => prev.filter(s => s.classroomId !== id));
                return { ...prev, classrooms: current.filter(c => c !== id) };
            } else {
                return { ...prev, classrooms: [...current, id] };
            }
        });
    };

    const addSchedule = () => {
        if (!scheduleForm.classroomId || !scheduleForm.day || !scheduleForm.startTime || !scheduleForm.endTime) return;
        setSchedules([...schedules, {
            classroomId: scheduleForm.classroomId,
            dayOfWeek: Number(scheduleForm.day),
            period: 0, // Not using period number anymore
            startTime: scheduleForm.startTime,
            endTime: scheduleForm.endTime
        }]);
        setScheduleForm({ ...scheduleForm, day: scheduleForm.day, startTime: '', endTime: '' });
    };

    const removeSchedule = (index: number) => {
        const newSchedules = [...schedules];
        newSchedules.splice(index, 1);
        setSchedules(newSchedules);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    เพิ่มรายวิชา
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>เพิ่มรายวิชาใหม่</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">รหัสวิชา</Label>
                            <Input
                                id="code"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">ชื่อวิชา</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>ห้องเรียนที่เรียนวิชานี้</Label>
                        <div className="grid grid-cols-3 gap-2 border rounded-md p-4 max-h-[150px] overflow-y-auto">
                            {classrooms.map(c => (
                                <div key={c.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`classroom-${c.id}`}
                                        checked={formData.classrooms.includes(c.id)}
                                        onCheckedChange={() => toggleClassroom(c.id)}
                                    />
                                    <Label htmlFor={`classroom-${c.id}`} className="text-sm font-normal cursor-pointer">
                                        {c.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <Label>ตารางเรียน (Teaching Schedule)</Label>
                        </div>

                        {/* Schedule Input Form */}
                        {formData.classrooms.length > 0 && (
                            <div className="flex gap-2 items-end bg-secondary/20 p-3 rounded-lg">
                                <div className="space-y-1 w-[150px]">
                                    <Label className="text-xs">ห้องเรียน</Label>
                                    <Select
                                        value={scheduleForm.classroomId}
                                        onValueChange={v => setScheduleForm({ ...scheduleForm, classroomId: v })}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="เลือกห้อง" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classrooms.filter(c => formData.classrooms.includes(c.id)).map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 w-[120px]">
                                    <Label className="text-xs">วัน</Label>
                                    <Select
                                        value={scheduleForm.day}
                                        onValueChange={v => setScheduleForm({ ...scheduleForm, day: v })}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="วัน" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DAYS.map(d => (
                                                <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 w-[120px]">
                                    <Label className="text-xs">เริ่ม</Label>
                                    <Input
                                        type="time"
                                        value={scheduleForm.startTime}
                                        onChange={e => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1 w-[120px]">
                                    <Label className="text-xs">สิ้นสุด</Label>
                                    <Input
                                        type="time"
                                        value={scheduleForm.endTime}
                                        onChange={e => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <Button type="button" size="sm" onClick={addSchedule}>เพิ่ม</Button>
                            </div>
                        )}

                        {/* Schedule List */}
                        <div className="space-y-2">
                            {schedules.map((sch, idx) => {
                                const room = classrooms.find(c => c.id === sch.classroomId);
                                const day = DAYS.find(d => d.value === sch.dayOfWeek);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-secondary/10 rounded border">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{room?.name}</Badge>
                                            <span>
                                                {day?.label} {sch.startTime} - {sch.endTime}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive"
                                            onClick={() => removeSchedule(idx)}
                                            type="button"
                                        >
                                            <Trash className="h-3 w-3" />
                                        </Button>
                                    </div>
                                );
                            })}
                            {schedules.length === 0 && formData.classrooms.length > 0 && (
                                <p className="text-sm text-muted-foreground text-center py-2">ยังไม่มีตารางเรียน</p>
                            )}
                            {formData.classrooms.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-2">กรุณาเลือกห้องเรียนก่อนกำหนดตาราง</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" type="button">ยกเลิก</Button></DialogClose>
                        <Button type="submit" disabled={loading}>{loading ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
