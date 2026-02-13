import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Scan, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTerm } from '@/lib/termContext';
import { getStudents, saveAttendanceRecords } from '@/lib/services';
import { AttendanceStatus, STATUS_CONFIG, Student } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface QuickCheckDialogProps {
    subjectId: string;
    subjectName: string;
    period: number;
    students: Student[];
    onScan: (student: Student, status: AttendanceStatus) => void;
}

const statusOptions: AttendanceStatus[] = ['present', 'late', 'absent', 'leave', 'sick'];

export function QuickCheckDialog({ subjectId, subjectName, period, students, onScan }: QuickCheckDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    // Date not needed here, handled by parent
    const [status, setStatus] = useState<AttendanceStatus>('present');
    const [studentCode, setStudentCode] = useState('');
    // saving state not needed as we just callback
    const [recentChecks, setRecentChecks] = useState<Array<{ code: string; name: string; time: string }>>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when dialog opens
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!studentCode.trim()) {
            return;
        }

        // Find student in provided list
        const student = students.find(
            (s) => s.studentCode.toLowerCase() === studentCode.toLowerCase().trim()
        );

        if (!student) {
            toast({
                title: 'ไม่พบนักศึกษา',
                description: `ไม่พบรหัส "${studentCode}" ในรายการ`,
                variant: 'destructive'
            });
            setStudentCode('');
            inputRef.current?.focus();
            return;
        }

        // Call parent handler
        onScan(student, status);

        // Add to recent checks
        const now = new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        setRecentChecks(prev => [
            { code: student.studentCode, name: student.fullName, time: now },
            ...prev.slice(0, 4) // Keep last 5
        ]);

        toast({
            title: 'เช็คชื่อสำเร็จ',
            description: `${student.fullName} - ${STATUS_CONFIG[status].label}`,
            className: "bg-green-50 border-green-200"
        });

        setStudentCode('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };


    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            // Reset on close
            setRecentChecks([]);
            setStudentCode('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Scan className="mr-2 h-4 w-4" />
                    เช็คชื่อด่วน
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>เช็คชื่อด่วน - {subjectName}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 py-4">
                        {/* Date removed - handled by parent page */}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">สถานะ</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as AttendanceStatus)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {STATUS_CONFIG[s].label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="studentCode">
                            รหัสนักศึกษา (กรอก หรือ สแกนบาร์โค้ด/NFC)
                        </Label>
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                id="studentCode"
                                value={studentCode}
                                onChange={(e) => setStudentCode(e.target.value)}
                                placeholder="กรอกหรือสแกนรหัสนักศึกษา แล้วกด Enter"
                                className="pr-10 text-lg font-mono"
                                autoComplete="off"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            💡 เคล็ดลับ: ใช้เครื่องสแกนบาร์โค้ดหรือ NFC reader เพื่อสแกนอัตโนมัติ
                        </p>
                    </div>

                    <Button type="submit" disabled={!studentCode.trim()} className="w-full">
                        <Scan className="mr-2 h-4 w-4" /> ตรวจสอบ
                    </Button>
                </form>

                {/* Recent Checks */}
                {recentChecks.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                        <h4 className="text-sm font-semibold">เช็คล่าสุด ({recentChecks.length})</h4>
                        <div className="max-h-48 space-y-1 overflow-y-auto">
                            {recentChecks.map((check, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 rounded-md bg-secondary/50 p-2 text-sm"
                                >
                                    <Badge variant="outline" className="font-mono">
                                        {check.code}
                                    </Badge>
                                    <span className="flex-1 font-medium">{check.name}</span>
                                    <span className="text-xs text-muted-foreground">{check.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
