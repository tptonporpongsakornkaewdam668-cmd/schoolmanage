import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/lib/termContext';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Loader2, Camera, ShieldCheck, MapPin, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { getClassrooms } from '@/lib/services';
import { Classroom } from '@/lib/types';

export default function ScanQRPage() {
    const { currentUser } = useAuth();
    const { activeTerm } = useTerm();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locError, setLocError] = useState<string | null>(null);

    const qrRegionId = "qr-reader";
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        // Request GPS immediately
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => {
                    console.error("GPS error", err);
                    setLocError("ความล้มเหลวในการดึงตำแหน่ง (GPS): " + err.message);
                }
            );
        } else {
            setLocError("เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง (GPS)");
        }
    }, []);

    const startScanner = async () => {
        if (!location && !locError) {
            toast({ title: "กรุณารอสักครู่", description: "กำลังดึงตำแหน่ง GPS ของคุณ...", variant: "default" });
        }

        if (locError) {
            toast({ title: "ข้อผิดพลาด GPS", description: locError, variant: "destructive" });
            // The prompt says "ถ้าไม่อนุญาตตำแหน่ง → ไม่สามารถเช็คชื่อได้"
            // So we strictly enforce GPS
            return;
        }

        setScanning(true);
        setResult(null);
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
                setScanning(false);
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
    };

    useEffect(() => {
        if (scanning && !scannerRef.current) {
            // Wait for next tick to ensure DOM element with id is rendered
            const timer = setTimeout(async () => {
                try {
                    const html5QrCode = new Html5Qrcode(qrRegionId);
                    scannerRef.current = html5QrCode;

                    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            handleScanSuccess(decodedText);
                            stopScanner();
                        },
                        (errorMessage) => {
                            // console.log(errorMessage);
                        }
                    );
                } catch (err: any) {
                    console.error("Scanner start error:", err);
                    setScanning(false);
                    const errorMsg = err?.message || err || "โปรดตรวจสอบสิทธิ์การเข้าถึงกล้องและ HTTPS";
                    toast({
                        title: "ข้อผิดพลาดกล้อง",
                        description: `ไม่สามารถเข้าถึงกล้องได้: ${errorMsg}`,
                        variant: "destructive"
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
        // Cleanup for this specific useEffect when scanning becomes false or component unmounts
        return () => {
            if (scannerRef.current && !scanning) { // Only stop if scanning was true and now it's false
                stopScanner();
            }
        };
    }, [scanning]);

    const handleScanSuccess = async (token: string) => {
        setLoading(true);
        try {
            // 1. Get Device Fingerprint & Device Info
            const fp = await FingerprintJS.load();
            const fpResult = await fp.get();
            const fingerprint = fpResult.visitorId;

            // Collect detailed device information
            const deviceInfo = {
                deviceId: fingerprint, // Use fingerprint as device ID
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                // Browser detection
                browser: (() => {
                    const ua = navigator.userAgent;
                    if (ua.includes('Chrome')) return 'Chrome';
                    if (ua.includes('Safari')) return 'Safari';
                    if (ua.includes('Firefox')) return 'Firefox';
                    if (ua.includes('Edge')) return 'Edge';
                    return 'Unknown';
                })(),
                // OS detection
                os: (() => {
                    const ua = navigator.userAgent;
                    if (ua.includes('Win')) return 'Windows';
                    if (ua.includes('Mac')) return 'macOS';
                    if (ua.includes('Linux')) return 'Linux';
                    if (ua.includes('Android')) return 'Android';
                    if (ua.includes('iOS')) return 'iOS';
                    return 'Unknown';
                })()
            };

            // 2. Validate Token (Session ID) in Firebase
            const sessionRef = doc(db, 'qr_sessions', token);
            const sessionSnap = await getDoc(sessionRef);

            if (!sessionSnap.exists()) {
                setResult({ success: false, message: "QR Code ไม่ถูกต้อง" });
                setLoading(false);
                return;
            }

            const sessionData = sessionSnap.data();
            if (!sessionData.isActive) {
                setResult({ success: false, message: "QR Code นี้ถูกปิดใช้งานแล้ว" });
                setLoading(false);
                return;
            }

            // 3. Check Expiry
            const now = new Date();
            const expiresAt = new Date(sessionData.expiresAt);
            if (now > expiresAt) {
                // Deactivate it
                await updateDoc(doc(db, 'qr_sessions', sessionRef.id), { isActive: false });
                setResult({ success: false, message: "QR Code หมดอายุแล้ว" });
                setLoading(false);
                return;
            }

            // 4. Check if student in this term/classroom
            const studentRef = doc(db, 'students', currentUser!.studentId!);
            const studentSnap = await getDoc(studentRef);

            if (!studentSnap.exists()) {
                setResult({ success: false, message: "ไม่พบข้อมูลนักเรียน" });
                setLoading(false);
                return;
            }

            const studentData = studentSnap.data();

            // Check if student belongs to one of the classrooms allowed in this session
            const allowedClassrooms = sessionData.classrooms || [];
            if (!allowedClassrooms.includes(studentData.classroomId)) {
                setResult({ success: false, message: "คุณไม่ได้อยู่ในกลุ่มเป้าหมายของ QR Code นี้" });
                setLoading(false);
                return;
            }

            // 5. Check if already checked in
            const attendanceRef = collection(db, 'attendance');
            const qAttend = query(
                attendanceRef,
                where('studentId', '==', currentUser!.studentId),
                where('subjectId', '==', sessionData.subjectId),
                where('date', '==', sessionData.date),
                where('period', '==', sessionData.period)
            );
            const attendSnap = await getDocs(qAttend);

            if (!attendSnap.empty) {
                const existing = attendSnap.docs[0].data();
                const allClassrooms = await getClassrooms(activeTerm!.id);
                const room = allClassrooms.find(c => c.id === existing.classroomId)?.name || 'ไม่ทราบห้อง';

                setResult({
                    success: false,
                    message: `คุณได้รับการเช็คชื่อในคาบนี้ไปแล้วเมื่อวันที่ ${new Date(existing.date).toLocaleDateString('th-TH')} เวลา ${existing.checkInTime || 'N/A'} (ห้อง ${room})`
                });
                setLoading(false);
                return;
            }

            // 6. Record Attendance
            const allClassrooms = await getClassrooms(activeTerm!.id);
            const roomName = allClassrooms.find(c => c.id === studentData.classroomId)?.name || 'ไม่ทราบห้อง';

            await addDoc(attendanceRef, {
                studentId: currentUser!.studentId,
                studentName: studentData.fullName,
                subjectId: sessionData.subjectId,
                classroomId: studentData.classroomId,
                date: sessionData.date,
                period: sessionData.period,
                status: 'present',
                termId: activeTerm!.id,
                checkInTime: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                location: location ? { latitude: location.lat, longitude: location.lng } : undefined,
                fingerprint: fingerprint,
                deviceInfo: deviceInfo,
                createdAt: now.toISOString()
            });

            setResult({
                success: true,
                message: `เช็คชื่อสำเร็จ! ประจำวันที่ ${now.toLocaleDateString('th-TH')} คาบที่ ${sessionData.period} (ห้อง ${roomName})`
            });

        } catch (err) {
            console.error(err);
            setResult({ success: false, message: "เกิดข้อผิดพลาดในการเช็คชื่อ" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-150px)] p-4">
            <Card className="w-full max-w-md border-none shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                        <QrCode className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl">เช็คชื่อด้วย QR Code</CardTitle>
                    <CardDescription>
                        {scanning ? "วาง QR Code ให้อยู่ในกรอบ" : "สแกน QR Code เพื่อบันทึกการเข้าเรียน"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!scanning && !loading && !result && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span>{location ? "รับพิกัด GPS เรียบร้อยแล้ว" : (locError || "กำลังตรวจสอบพิกัด GPS...")}</span>
                            </div>
                            <Button className="w-full h-16 text-lg font-bold" onClick={startScanner} disabled={!!locError || (!location && !locError)}>
                                <Camera className="mr-2 h-6 w-6" /> เริ่มสแกน QR
                            </Button>
                        </div>
                    )}

                    {scanning && (
                        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 aspect-square bg-black">
                            <div id={qrRegionId} className="w-full h-full"></div>
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="w-1/2 h-1/2 border-2 border-primary border-dashed rounded-lg opacity-50"></div>
                            </div>
                            <Button
                                variant="secondary"
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-80"
                                onClick={stopScanner}
                            >
                                ยกเลิก
                            </Button>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="font-medium">กำลังประมวลผลการเช็คชื่อ...</p>
                        </div>
                    )}

                    {result && (
                        <div className="text-center py-6 space-y-6">
                            <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center ${result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {result.success ? <ShieldCheck className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${result.success ? 'text-green-600' : 'text-red-600'}`}>{result.message}</h3>
                                {result.success && <p className="text-sm text-muted-foreground mt-2">ประวัติการเข้าเรียนของคุณถูกบันทึกสำเร็จแล้ว</p>}
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>กลับสู่หน้าหลัก</Button>
                                {!result.success && <Button className="flex-1" onClick={() => setResult(null)}>ลองใหม่อีกครั้ง</Button>}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
