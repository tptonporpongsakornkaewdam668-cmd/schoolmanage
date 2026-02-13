import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2, Clock, Users, MapPin, ShieldCheck, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { createQRSession, deactivateQRSessions, getClassrooms } from '@/lib/services';
import { QRSession, Subject, Classroom, AttendanceRecord } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const [classroomNames, setClassroomNames] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [sessionDate, setSessionDate] = useState<string | null>(null);
    const [checkedInStudents, setCheckedInStudents] = useState<any[]>([]);
    const [teacherLocation, setTeacherLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const [locError, setLocError] = useState<string>('');

    // Fetch GPS for teacher
    useEffect(() => {
        if (open && !sessionId) {
            setLocStatus('loading');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setTeacherLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setLocStatus('success');
                    },
                    (err) => {
                        console.error("GPS error", err);
                        setLocStatus('error');
                        setLocStatus('error');
                        setLocError(err.message);
                    }
                );
            } else {
                setLocStatus('error');
                setLocError("GPS not supported");
            }
        }
    }, [open, sessionId]);

    // Real-time listener for attendance
    useEffect(() => {
        if (!sessionId || !sessionDate) return;

        const q = query(
            collection(db, 'attendance'),
            where('subjectId', '==', subject.id),
            where('date', '==', sessionDate),
            where('period', '==', period)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by check-in time descending
            list.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setCheckedInStudents(list);
        });

        return () => unsubscribe();
    }, [sessionId, sessionDate, subject.id, period]);

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
            const dateStr = selectedDate; // Use selected date instead of current date
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
                location: teacherLocation ? { latitude: teacherLocation.lat, longitude: teacherLocation.lng } : undefined,
                createdAt: now.toISOString()
            };

            const id = await createQRSession(newSession);
            setSessionId(id);
            setExpiresAt(expiry);
            setSessionDate(dateStr);

            // Fetch classroom names for display
            const allClassrooms = await getClassrooms(subject.termId);
            const names = subject.classrooms
                .map(cid => allClassrooms.find(c => c.id === cid)?.name)
                .filter(Boolean)
                .join(', ');
            setClassroomNames(names);

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
            <DialogContent className={sessionId ? "sm:max-w-4xl" : "sm:max-w-md"}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-blue-600" />
                        เช็คชื่อเข้าเรียนผ่าน QR Code
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    {!sessionId ? (
                        <div className="text-center space-y-6 w-full">
                            <div className="p-8 border-2 border-dashed rounded-xl bg-muted/30 flex flex-col items-center gap-4">
                                <QrCode className="h-12 w-12 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground max-w-[250px]">
                                    ยังไม่มีเซสชันการเช็คชื่อ กรุณาระบุวันที่และกดสร้าง QR Code
                                </p>
                            </div>

                            <div className="space-y-2 text-left bg-muted/20 p-4 rounded-lg border">
                                <Label htmlFor="attendance-date" className="text-sm font-bold">วันที่ต้องการเช็คชื่อ</Label>
                                <Input
                                    id="attendance-date"
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-white"
                                />
                            </div>

                            <div className={`p-3 rounded-lg border text-sm flex items-center gap-3 ${locStatus === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                                <MapPin className="h-4 w-4" />
                                {locStatus === 'loading' && <span>กำลังตรวจสอบพิกัด GPS...</span>}
                                {locStatus === 'success' && <span>พิกัด GPS ของคุณพร้อมใช้งาน</span>}
                                {locStatus === 'error' && <span className="text-red-600">พิกัด GPS ขัดข้อง: {locError}</span>}
                                {locStatus === 'idle' && <span>ยังไม่มีพิกัด GPS</span>}
                            </div>

                            <Button
                                onClick={handleStartSession}
                                disabled={loading}
                                size="lg"
                                className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                                สร้าง QR Code
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full h-[500px]">
                            {/* Left Side: QR Info */}
                            <div className="md:col-span-5 flex flex-col items-center justify-between py-2 border-r pr-4">
                                <div className="space-y-4 text-center w-full">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg leading-tight">{subject.name}</h3>
                                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px] h-5 border-blue-200 text-blue-700">
                                                {sessionDate ? new Date(sessionDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '...'}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] h-5">คาบ {period}</Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">{classroomNames}</p>
                                    </div>

                                    <Card className="p-4 bg-white shadow-md border-2 border-blue-100 mx-auto w-fit">
                                        <QRCodeSVG
                                            value={sessionId}
                                            size={200}
                                            level="L"
                                            includeMargin={false}
                                        />
                                    </Card>

                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <div className="flex flex-col items-center p-2 rounded-lg bg-red-50 border border-red-100">
                                            <span className="text-[10px] text-red-600 font-medium tracking-tight">เวลาที่เหลือ</span>
                                            <span className="text-lg font-bold font-mono text-red-700 leading-none mt-1">{timeLeft}</span>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded-lg bg-green-50 border border-green-100">
                                            <span className="text-[10px] text-green-600 font-medium tracking-tight">เช็คชื่อแล้ว</span>
                                            <span className="text-lg font-bold text-green-700 leading-none mt-1">{checkedInStudents.length} คน</span>
                                        </div>
                                    </div>

                                    {teacherLocation && (
                                        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                                            <MapPin className="h-3 w-3 text-blue-500" />
                                            <span>ศูนย์กลาง: {teacherLocation.lat.toFixed(4)}, {teacherLocation.lng.toFixed(4)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full text-center py-2 bg-slate-50 rounded-lg">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Session: {sessionId.slice(0, 8)}...</p>
                                </div>
                            </div>

                            {/* Right Side: Real-time List */}
                            <div className="md:col-span-7 flex flex-col h-full bg-slate-50/50 rounded-xl overflow-hidden border">
                                <div className="p-3 border-b bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <Users className="h-4 w-4 text-blue-600" />
                                        <span>รายงานการเช็คชื่อ (Real-time)</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 font-medium text-[10px]">
                                        กำลังบันทึก...
                                    </Badge>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-2">
                                        {checkedInStudents.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
                                                <Loader2 className="h-8 w-8 animate-spin opacity-20 mb-2" />
                                                <p className="text-xs">รอนักเรียนสแกน QR Code...</p>
                                            </div>
                                        ) : (
                                            checkedInStudents.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">
                                                            {item.studentName?.charAt(0) || <Users className="h-3 w-3" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold leading-none">{item.studentName || 'Unknown Student'}</span>
                                                            <span className="text-[9px] text-muted-foreground mt-0.5">{item.checkInTime}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {item.location && <MapPin className="h-3 w-3 text-blue-400" />}
                                                        {item.fingerprint && <ShieldCheck className="h-3 w-3 text-green-400" />}
                                                        <Badge className="bg-green-500 text-[9px] h-4 py-0 px-1 hover:bg-green-500">มาครับ/ค่ะ</Badge>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
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
