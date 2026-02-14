import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Printer, QrCode as QrCodeIcon } from 'lucide-react';
import { getStudents, getSubjects, getClassrooms } from '@/lib/services';
import { Student, Subject, Classroom } from '@/lib/types';
import { useTerm } from '@/lib/termContext';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function StudentQRCodesPage() {
    const { activeTerm } = useTerm();
    const { toast } = useToast();
    const printAreaRef = useRef<HTMLDivElement>(null);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
    const [barcodes, setBarcodes] = useState<Record<string, string>>({});

    useEffect(() => {
        async function loadData() {
            if (!activeTerm) return;

            setLoading(true);
            try {
                const [subs, cls, stds] = await Promise.all([
                    getSubjects(activeTerm.id),
                    getClassrooms(activeTerm.id),
                    getStudents(activeTerm.id)
                ]);
                setSubjects(subs);
                setClassrooms(cls);
                setStudents(stds);
            } catch (error) {
                console.error('Failed to load data:', error);
                toast({
                    title: 'เกิดข้อผิดพลาด',
                    description: 'ไม่สามารถโหลดข้อมูลได้',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [activeTerm]);

    // Filter students based on selection
    useEffect(() => {
        let filtered = students;

        if (selectedSubject) {
            const subject = subjects.find(s => s.id === selectedSubject);
            if (subject?.classrooms) {
                filtered = filtered.filter(student =>
                    subject.classrooms!.includes(student.classroomId)
                );
            }
        } else if (selectedClassroom) {
            filtered = filtered.filter(student =>
                student.classroomId === selectedClassroom
            );
        }

        setFilteredStudents(filtered);
    }, [selectedSubject, selectedClassroom, students, subjects]);

    // Generate QR Codes and Barcodes
    useEffect(() => {
        async function generateCodes() {
            if (filteredStudents.length === 0) return;

            setGenerating(true);
            const qrCodesMap: Record<string, string> = {};
            const barcodesMap: Record<string, string> = {};

            for (const student of filteredStudents) {
                try {
                    // Generate QR Code (student code)
                    const qrDataUrl = await QRCode.toDataURL(student.studentCode, {
                        width: 200,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    qrCodesMap[student.id] = qrDataUrl;

                    // Generate Barcode
                    const canvas = document.createElement('canvas');
                    JsBarcode(canvas, student.studentCode, {
                        format: 'CODE128',
                        width: 2,
                        height: 50,
                        displayValue: false,
                        margin: 0
                    });
                    barcodesMap[student.id] = canvas.toDataURL();
                } catch (error) {
                    console.error(`Failed to generate codes for ${student.studentCode}:`, error);
                }
            }

            setQrCodes(qrCodesMap);
            setBarcodes(barcodesMap);
            setGenerating(false);
        }

        generateCodes();
    }, [filteredStudents]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = async () => {
        if (!printAreaRef.current) return;

        setGenerating(true);
        toast({
            title: 'กำลังสร้าง PDF',
            description: 'กรุณารอสักครู่...'
        });

        try {
            const element = printAreaRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`student_qrcodes_${new Date().toISOString().split('T')[0]}.pdf`);

            toast({
                title: 'สร้าง PDF สำเร็จ',
                description: 'ดาวน์โหลดไฟล์เรียบร้อยแล้ว'
            });
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถสร้าง PDF ได้',
                variant: 'destructive'
            });
        } finally {
            setGenerating(false);
        }
    };

    const getClassroomName = (classroomId: string) => {
        return classrooms.find(c => c.id === classroomId)?.name || '';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    พิมพ์ QR Code นักเรียน
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    สร้าง QR Code และ Barcode สำหรับนักเรียนในแต่ละวิชาหรือห้องเรียน
                </p>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm print:hidden">
                <CardHeader>
                    <CardTitle className="text-lg">เลือกกลุ่มนักเรียน</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">เลือกจากวิชา</label>
                                <Select
                                    value={selectedSubject}
                                    onValueChange={(value) => {
                                        setSelectedSubject(value === 'all' ? '' : value);
                                        setSelectedClassroom('');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกวิชา" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        {subjects.map(subject => (
                                            <SelectItem key={subject.id} value={subject.id}>
                                                {subject.code} - {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">เลือกจากห้องเรียน</label>
                                <Select
                                    value={selectedClassroom}
                                    onValueChange={(value) => {
                                        setSelectedClassroom(value === 'all' ? '' : value);
                                        setSelectedSubject('');
                                    }}
                                    disabled={!!selectedSubject}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกห้องเรียน" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        {classrooms.map(classroom => (
                                            <SelectItem key={classroom.id} value={classroom.id}>
                                                {classroom.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <Button
                            onClick={handlePrint}
                            disabled={filteredStudents.length === 0 || generating}
                            className="flex-1 min-w-[150px]"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            พิมพ์
                        </Button>
                        <Button
                            onClick={handleExportPDF}
                            disabled={filteredStudents.length === 0 || generating}
                            variant="secondary"
                            className="flex-1 min-w-[150px]"
                        >
                            {generating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            ส่งออก PDF
                        </Button>
                    </div>

                    {filteredStudents.length > 0 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                            <QrCodeIcon className="inline h-4 w-4 mr-1" />
                            พบ {filteredStudents.length} คน
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* QR Codes Grid */}
            {filteredStudents.length > 0 && (
                <div
                    id="qr-print-area"
                    ref={printAreaRef}
                    className="bg-white p-8 qr-codes-container"
                    style={{ breakInside: 'avoid' }}
                >
                    <div className="grid grid-cols-3 gap-6">
                        {filteredStudents.map((student) => (
                            <div
                                key={student.id}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
                                style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                            >
                                {/* QR Code */}
                                {qrCodes[student.id] && (
                                    <div className="mb-3">
                                        <img
                                            src={qrCodes[student.id]}
                                            alt={`QR Code for ${student.studentCode}`}
                                            className="w-full max-w-[200px] mx-auto"
                                        />
                                    </div>
                                )}

                                {/* Student Info */}
                                <div className="space-y-1 mb-3">
                                    <p className="font-bold text-base text-gray-900">{student.fullName}</p>
                                    <p className="text-sm font-semibold text-primary">{student.studentCode}</p>
                                    <p className="text-xs text-gray-600">
                                        {getClassroomName(student.classroomId)}
                                    </p>
                                </div>

                                {/* Barcode */}
                                {barcodes[student.id] && (
                                    <div className="border-t pt-2">
                                        <img
                                            src={barcodes[student.id]}
                                            alt={`Barcode for ${student.studentCode}`}
                                            className="w-full max-w-[180px] mx-auto"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">{student.studentCode}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && filteredStudents.length === 0 && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <QrCodeIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>กรุณาเลือกวิชาหรือห้องเรียนเพื่อแสดง QR Code</p>
                    </CardContent>
                </Card>
            )}

            {/* Print Styles */}
            <style>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          #qr-print-area,
          #qr-print-area * {
            visibility: visible;
          }
          
          #qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
        </div>
    );
}
