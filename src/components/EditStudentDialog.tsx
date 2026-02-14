import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Student, Classroom } from '@/lib/types';
import { Edit, Key, User as UserIcon } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface EditStudentDialogProps {
    student: Student;
    classrooms: Classroom[];
    onSave: (id: string, data: Partial<Student>) => Promise<void>;
}

const statusOptions = [
    { value: 'active', label: 'กำลังเรียน' },
    { value: 'suspended', label: 'พักการเรียน' },
    { value: 'resigned', label: 'ลาออก' },
    { value: 'graduated', label: 'จบการศึกษา' },
];

export function EditStudentDialog({ student, classrooms, onSave }: EditStudentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        studentCode: student.studentCode,
        fullName: student.fullName,
        username: student.username || '',
        password: '',
        classroomId: student.classroomId,
        status: student.status
    });

    useEffect(() => {
        if (open) {
            setFormData({
                studentCode: student.studentCode,
                fullName: student.fullName,
                username: student.username || '',
                password: '',
                classroomId: student.classroomId,
                status: student.status
            });
        }
    }, [open, student]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSave: Partial<Student> = {
                studentCode: formData.studentCode,
                fullName: formData.fullName,
                username: formData.username,
                classroomId: formData.classroomId,
                status: formData.status
            };

            if (formData.password) {
                dataToSave.password = await bcrypt.hash(formData.password, 10);
                dataToSave.mustChangePassword = true;
            }

            await onSave(student.id, dataToSave);
            setOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(true)}>
                <Edit className="h-4 w-4" />
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>แก้ไขข้อมูลนักเรียน</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="studentCode">รหัสนักเรียน</Label>
                        <Input
                            id="studentCode"
                            required
                            value={formData.studentCode}
                            onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
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
                            <Label htmlFor="username" className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4" /> Username
                            </Label>
                            <Input
                                id="username"
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="flex items-center gap-2">
                                <Key className="h-4 w-4" /> Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="เว้นว่างไว้หากไม่เปลี่ยน"
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
                    <div className="space-y-2">
                        <Label htmlFor="status">สถานะ</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(val) => setFormData({ ...formData, status: val as Student['status'] })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
