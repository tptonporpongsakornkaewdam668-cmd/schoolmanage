import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Classroom } from '@/lib/types';
import { Edit, Loader2 } from 'lucide-react';
import { updateClassroom } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';

interface EditClassroomDialogProps {
    classroom: Classroom;
    onSave: () => void;
}

export function EditClassroomDialog({ classroom, onSave }: EditClassroomDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(classroom.name);
    const [level, setLevel] = useState(classroom.level);

    useEffect(() => {
        if (open) {
            setName(classroom.name);
            setLevel(classroom.level);
        }
    }, [open, classroom]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updateClassroom(classroom.id, { name, level });
            toast({ title: "แก้ไขห้องเรียนสำเร็จ" });
            setOpen(false);
            onSave();
        } catch (error) {
            console.error(error);
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
                <Edit className="h-4 w-4" />
            </Button>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>แก้ไขห้องเรียน</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="name">ชื่อห้องเรียน</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="เช่น ม.1/1"
                        />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="level">ระดับชั้น</Label>
                        <Input
                            id="level"
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            required
                            placeholder="เช่น มัธยมศึกษาปีที่ 1"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" type="button">ยกเลิก</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
