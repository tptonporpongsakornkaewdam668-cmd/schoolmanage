import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Student, Classroom } from '@/lib/types';
import { Plus } from 'lucide-react';
import { useTerm } from '@/lib/termContext';
import bcrypt from 'bcryptjs';

interface StudentDialogProps {
    classrooms: Classroom[];
    onSave: (student: Omit<Student, 'id'>) => Promise<void>;
    defaultClassroomId?: string; // Add default prop
}

export function StudentDialog({ classrooms, onSave, defaultClassroomId }: StudentDialogProps) {
    const { activeTerm } = useTerm();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        studentCode: '',
        fullName: '',
        username: '',
        password: '',
        classroomId: defaultClassroomId || '',
        status: 'active' as const,
        mustChangePassword: true
    });

    const resetForm = () => {
        setFormData({
            studentCode: '',
            fullName: '',
            username: '',
            password: '',
            classroomId: defaultClassroomId || '',
            status: 'active' as const,
            mustChangePassword: true
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Optional: reset on close?
        } else {
            if (!formData.classroomId && defaultClassroomId) {
                setFormData(prev => ({ ...prev, classroomId: defaultClassroomId }));
            }
        }
        setOpen(newOpen);
    };

    // Auto-fill username/password when studentCode changes
    const handleStudentCodeChange = (code: string) => {
        setFormData(prev => ({
            ...prev,
            studentCode: code,
            username: prev.username === prev.studentCode || !prev.username ? code : prev.username,
            password: prev.password === prev.studentCode || !prev.password ? code : prev.password
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeTerm) {
            alert('กรุณาเลือกเทอมก่อน');
            return;
        }

        setLoading(true);
        try {
            // Hash password before saving
            const hashedPassword = await bcrypt.hash(formData.password, 10);

            await onSave({
                ...formData,
                password: hashedPassword,
                role: 'student',
                termId: activeTerm.id
            });
            setOpen(false); // Changed from onOpenChange(false) to setOpen(false) to match existing state setter
            resetForm();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    เพิ่มนักเรียน
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>เพิ่มนักเรียนใหม่</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="studentCode">รหัสนักเรียน</Label>
                        <Input
                            id="studentCode"
                            required
                            value={formData.studentCode}
                            onChange={(e) => handleStudentCodeChange(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fullName">ชื่อ-สกุล</Label>
                        <Input
                            id="fullName"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="classroom">ห้องเรียน</Label>
                        <Select
                            value={formData.classroomId}
                            onValueChange={(val) => setFormData({ ...formData, classroomId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกห้องเรียน" />
                            </SelectTrigger>
                            <SelectContent>
                                {classrooms.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

// Separate Edit Dialog if needed or combine. For complexity sake, sticking to one for Add first.
