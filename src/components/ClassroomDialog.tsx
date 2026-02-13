import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { Classroom } from '@/lib/types';
import { addClassroom } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { useTerm } from '@/lib/termContext';

interface ClassroomDialogProps {
    onSave: () => void;
}

export function ClassroomDialog({ onSave }: ClassroomDialogProps) {
    const { toast } = useToast();
    const { activeTerm } = useTerm();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [level, setLevel] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeTerm) {
            toast({ title: "กรุณาเลือกเทอมก่อน", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            await addClassroom({
                name,
                level,
                studentCount: 0, // Initial count
                termId: activeTerm.id
            });
            toast({ title: "เพิ่มห้องเรียนสำเร็จ" });
            setOpen(false);
            setName('');
            setLevel('');
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
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> เพิ่มห้องเรียน
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>เพิ่มห้องเรียนใหม่</DialogTitle>
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
