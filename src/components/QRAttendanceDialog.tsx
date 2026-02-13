import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2, Clock, Users, MapPin, ShieldCheck, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { createQRSession, deactivateQRSessions } from '@/lib/services';
import { QRSession, Subject } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface QRAttendanceDialogProps {
    subject: Subject;
    period: number;
    onSessionCreated?: (sessionId: string) => void;
}

export function QRAttendanceDialog({ subject, period, onSessionCreated }: QRAttendanceDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');

    // Update time left every second
    useEffect(() => {
        if (!expiresAt) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = expiresAt.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('หมดเวลา');
                clearInterval(timer);
                // Optionally deactivate session? 
                // In reality, the student check will fail based on expiry time.
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    const handleStartSession = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const expiry = new Date(now.getTime() + 10 * 60000); // 10 minutes from now

            // 1. Deactivate old sessions first
            await deactivateQRSessions(subject.id, dateStr, period);

            // 2. Create new session
            const newSession: Omit<QRSession, 'id'> = {
                subjectId: subject.id,
                classrooms: subject.classrooms,
                date: dateStr,
                period: period,
                expiresAt: expiry.toISOString(),
                isActive: true,
                createdAt: now.toISOString()
            };

            const id = await createQRSession(newSession);
            setSessionId(id);
            setExpiresAt(expiry);
            onSessionCreated?.(id);

            toast({
                title: 'เริ่มการเช็คชื่อด้วย QR Code',
                description: 'สแนก QR Code นี้เพื่อเช็คชื่อ (ใช้งานได้ 10 นาที)',
            });
        } catch (error) {
            console.error('Failed to create QR session:', error);
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถสร้าง QR Code ได้',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSessionId(null);
        setExpiresAt(null);
        setTimeLeft('');
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) handleReset();
        }}>
            <DialogTrigger asChild>
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                    <QrCode className="mr-2 h-4 w-4" />
                    เช็คชื่อด้วย QR Code
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-blue-600" />
                        เช็คชื่อเข้าเรียนผ่าน QR Code
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    {!sessionId ? (
                        <div className="text-center space-y-4">
                            <div className="p-12 border-2 border-dashed rounded-xl bg-muted/30 flex flex-col items-center gap-4">
                                <QrCode className="h-16 w-16 text-muted-foreground/50" />
                                <p className="text-muted-foreground max-w-[250px]">
                                    ยังไม่มีเซสชันการเช็คชื่อ กดปุ่มด้านล่างเพื่อเริ่มสร้าง QR Code
                                </p>
                            </div>
                            <Button
                                onClick={handleStartSession}
                                disabled={loading}
                                size="lg"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                                สร้าง QR Code
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 text-center">
                                <h3 className="text-xl font-bold">{subject.name}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <Badge variant="outline">คาบที่ {period}</Badge>
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                        กำลังเปิดรับข้อมูล
                                    </Badge>
                                </div>
                            </div>

                            <Card className="p-6 bg-white shadow-xl border-2 border-blue-100">
                                <QRCodeSVG
                                    value={sessionId}
                                    size={250}
                                    level="H"
                                    includeMargin={true}
                                />
                            </Card>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="flex flex-col items-center p-3 rounded-lg bg-red-50 border border-red-100">
                                    <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium mb-1">
                                        <Clock className="h-4 w-4" />
                                        เวลาที่เหลือ
                                    </div>
                                    <span className="text-2xl font-bold font-mono text-red-700">
                                        {timeLeft}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center p-3 rounded-lg bg-green-50 border border-green-100">
                                    <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium mb-1">
                                        <ShieldCheck className="h-4 w-4" />
                                        มาตรการความปลอดภัย
                                    </div>
                                    <span className="text-xs text-center text-green-700">
                                        GPS + ลายนิ้วมือเบราว์เซอร์
                                    </span>
                                </div>
                            </div>

                            <div className="text-center space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    ให้นักเรียนใช้แอป <b>Class Companion</b> สแกน
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                    Session ID: {sessionId}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="sm:justify-center border-t pt-4">
                    {sessionId && (
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            ยกเลิกและสร้างใหม่
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
