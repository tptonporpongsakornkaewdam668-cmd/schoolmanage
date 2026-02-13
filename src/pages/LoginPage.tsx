import { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const success = await login(username, password);
            if (success) {
                toast({
                    title: 'ยินดีต้อนรับกลับมา!',
                    description: 'เข้าสู่ระบบสำเร็จ',
                    className: 'bg-green-50 border-green-200'
                });
                navigate('/');
            } else {
                toast({
                    title: 'เข้าสู่ระบบไม่สำเร็จ',
                    description: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 p-4 animate-fade-in">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="space-y-2 text-center pb-6">
                    <div className="flex justify-center mb-2">
                        <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
                            <GraduationCap className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-primary">Class Companion</CardTitle>
                    <CardDescription className="text-base">เข้าสู่ระบบเพื่อจัดการชั้นเรียนของคุณ</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">ชื่อผู้ใช้</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="h-11"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">รหัสผ่าน</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                                autoComplete="current-password"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pt-2 pb-6">
                        <Button className="w-full h-11 text-base font-medium transition-all hover:shadow-md" type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังตรวจสอบ...
                                </>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </Button>
                    </CardFooter>
                </form>
                <div className="pb-6 text-center text-sm text-muted-foreground">
                    <p>หากไม่มีบัญชี กรุณาติดต่อผู้ดูแลระบบ</p>
                </div>
            </Card>

            <div className="fixed bottom-4 text-center w-full text-xs text-muted-foreground">
                © {new Date().getFullYear()} Class Companion. All rights reserved.
            </div>
        </div>
    );
}
