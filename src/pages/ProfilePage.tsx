import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { User, Shield, GraduationCap, Key, LogOut, Loader2, Calendar, HardDrive, Image as ImageIcon, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStudentById, getClassrooms, updateStudent, updateUser } from '@/lib/services';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Student, Classroom, AppUser } from '@/lib/types';

export default function ProfilePage() {
    const { currentUser, logout, refreshUserData } = useAuth();
    const [studentData, setStudentData] = useState<Student | null>(null);
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
    const { toast } = useToast();

    useEffect(() => {
        if (currentUser?.role === 'student' && currentUser.studentId) {
            loadStudentData();
        }
    }, [currentUser]);

    async function loadStudentData() {
        setLoading(true);
        try {
            const student = await getStudentById(currentUser!.studentId!);
            if (student) {
                setStudentData(student);
                setAvatarUrl(student.avatarUrl || student.photoUrl || '');
                const classrooms = await getClassrooms();
                const myClass = classrooms.find(c => c.id === student.classroomId);
                if (myClass) setClassroom(myClass);
            }
        } catch (error) {
            console.error("Failed to load student profile", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveAvatar() {
        if (!currentUser) return;
        setSaving(true);
        try {
            if (currentUser.role === 'student' && currentUser.studentId) {
                await updateStudent(currentUser.studentId, { avatarUrl });
            } else {
                await updateUser(currentUser.id, { avatarUrl });
            }
            await refreshUserData();
            toast({
                title: 'สำเร็จ',
                description: 'อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว',
            });
        } catch (error) {
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถอัปเดตรูปโปรไฟล์ได้',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    }

    if (!currentUser) return null;

    const roleLabels: Record<AppUser['role'], { label: string; color: string }> = {
        admin: { label: 'ผู้ดูแลระบบ (Admin)', color: 'bg-red-100 text-red-700 border-red-200' },
        teacher: { label: 'คุณครู (Teacher)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        student: { label: 'นักเรียน (Student)', color: 'bg-green-100 text-green-700 border-green-200' }
    };

    const roleInfo = roleLabels[currentUser.role];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row items-center gap-6 bg-card p-8 rounded-xl shadow-sm border border-border relative overflow-hidden">
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10" />

                <div className="relative z-10">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-4xl font-bold shadow-lg border-4 border-background overflow-hidden">
                        {currentUser.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            currentUser.name.charAt(0)
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-background p-1.5 rounded-full border border-border shadow-md">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
                </div>

                <div className="text-center md:text-left space-y-2 flex-1 z-10">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{currentUser.name}</h1>
                        <Badge variant="outline" className={`${roleInfo.color} font-bold px-3 py-1 border`}>
                            {roleInfo.label}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1.5 text-lg">
                        <User className="h-5 w-5 opacity-70" /> {currentUser.username}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
                    <Button variant="outline" asChild className="gap-2 shadow-sm">
                        <Link to="/change-password">
                            <Key className="h-4 w-4" /> เปลี่ยนรหัสผ่าน
                        </Link>
                    </Button>
                    <Button variant="destructive" onClick={logout} className="gap-2 shadow-sm">
                        <LogOut className="h-4 w-4" /> ออกจากระบบ
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-sm border-border/60 hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" /> ข้อมูลบัญชีผู้ใช้
                        </CardTitle>
                        <CardDescription>รายละเอียดพื้นฐานที่เชื่อมโยงกับบัญชีของคุณ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-muted/50">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Username</p>
                                <p className="font-semibold text-lg">{currentUser.username}</p>
                            </div>
                            <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-muted/50">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Role / สิทธิ์การเข้าถึง</p>
                                <p className="font-semibold text-lg">{roleInfo.label}</p>
                            </div>

                            {currentUser.role === 'student' && (
                                <>
                                    <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-muted/50">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">รหัสนักเรียน</p>
                                        <p className="font-semibold text-lg">{studentData?.studentCode || '-'}</p>
                                    </div>
                                    <div className="space-y-1.5 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                        <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest">สังกัดห้องเรียน</p>
                                        <div className="flex items-center gap-2 font-bold text-xl text-primary">
                                            <GraduationCap className="h-5 w-5" />
                                            {classroom?.name || 'กำลังโหลด...'}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" /> รูปโปรไฟล์
                        </CardTitle>
                        <CardDescription>จัดการลิงก์รูปภาพโปรไฟล์ของคุณ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="avatarUrl">URL รูปภาพ</Label>
                            <Input
                                id="avatarUrl"
                                placeholder="https://example.com/image.jpg"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full gap-2"
                            onClick={handleSaveAvatar}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            บันทึกรูปภาพ
                        </Button>
                        <div className="flex items-center justify-between py-3 border-b border-border/50">
                            <span className="text-sm text-muted-foreground">สถานะบัญชี</span>
                            <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-border/50">
                            <span className="text-sm text-muted-foreground">ชนิดบัญชี</span>
                            <span className="font-medium text-sm">{currentUser.role.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-border/50">
                            <span className="text-sm text-muted-foreground">การเปลี่ยนรหัส</span>
                            <span className="text-xs font-medium text-blue-600">รองรับ</span>
                        </div>
                        <div className="pt-6 text-[10px] font-mono text-muted-foreground/60 break-all bg-muted/20 p-2 rounded">
                            UID: {currentUser.id}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {currentUser.role === 'student' && (
                <Card className="border-primary/20 bg-primary/5 shadow-inner">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-6">
                            <div className="bg-primary shadow-lg p-4 rounded-2xl rotate-3">
                                <Calendar className="h-8 w-8 text-primary-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-xl text-primary uppercase tracking-tight">Student Dashboard Access</h3>
                                <p className="text-muted-foreground max-w-md leading-relaxed">
                                    ท่านสามารถตรวจสอบประวัติการเข้าเรียน (QR) และติดตามคะแนนเก็บรายวิชาได้ตลอด 24 ชั่วโมง ผ่านระบบ Class Companion
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
