import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, ShieldCheck } from 'lucide-react';
import { updateStudent, updateTeacher, getStudentById, getTeacherById } from '@/lib/services';
import bcrypt from 'bcryptjs';

export default function ChangePasswordPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast({
                title: 'รหัสผ่านไม่ตรงกัน',
                description: 'กรุณาตรวจสอบการยืนยันรหัสผ่านใหม่',
                variant: 'destructive'
            });
            return;
        }

        if (formData.newPassword.length < 4) {
            toast({
                title: 'รหัสผ่านสั้นเกินไป',
                description: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            if (!currentUser) throw new Error('No user');

            // 1. Fetch current user data to get hashed password
            let userData: any = null;
            if (currentUser.role === 'student') {
                userData = await getStudentById(currentUser.id);
            } else {
                userData = await getTeacherById(currentUser.id);
            }

            if (!userData) throw new Error('User data not found');

            // 2. Verify current password
            const isMatch = await bcrypt.compare(formData.currentPassword, userData.password);
            if (!isMatch) {
                toast({
                    title: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
                    description: 'กรุณาตรวจสอบรหัสผ่านปัจจุบันอีกครั้ง',
                    variant: 'destructive'
                });
                setLoading(false);
                return;
            }

            // 3. Hash new password
            const hashedNewPassword = await bcrypt.hash(formData.newPassword, 10);

            // 4. Update in database
            if (currentUser.role === 'student') {
                await updateStudent(currentUser.id, {
                    password: hashedNewPassword,
                    mustChangePassword: false
                });
            } else {
                await updateTeacher(currentUser.id, {
                    password: hashedNewPassword
                });
            }

            toast({
                title: 'สำเร็จ',
                description: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'
            });

            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            console.error(error);
            toast({
                title: 'ผิดพลาด',
                description: 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-[calc(100vh-120px)]">
            <Card className="w-full max-w-md border-none shadow-lg">
                <CardHeader className="space-y-1">
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <Key className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl text-center">เปลี่ยนรหัสผ่าน</CardTitle>
                    <CardDescription className="text-center">
                        รหัสผ่านใหม่ควรมีความปลอดภัยและจำง่าย
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                required
                                value={formData.currentPassword}
                                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                required
                                value={formData.newPassword}
                                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
