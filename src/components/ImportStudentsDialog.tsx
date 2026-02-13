import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { addStudent, getStudents, updateStudent, getClassrooms, addClassroom } from '@/lib/services';
import { Student, Classroom } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useTerm } from '@/lib/termContext';
import bcrypt from 'bcryptjs';

interface ImportStudentsDialogProps {
    onSuccess: () => void;
}

type DuplicateHandling = 'skip' | 'overwrite' | 'new-only';

// Helper function to parse classroom name (e.g., "ม.4/1" → { level: "ม.4", section: 1 })
function parseClassroomName(name: string): { level: string; section: number; fullName: string } {
    const match = name.match(/^(.+?)\/(\d+)$/);
    if (match) {
        return {
            level: match[1].trim(),
            section: parseInt(match[2]),
            fullName: name
        };
    }
    // If no slash format, return as-is
    return {
        level: name,
        section: 1,
        fullName: name
    };
}

export function ImportStudentsDialog({ onSuccess }: ImportStudentsDialogProps) {
    const { toast } = useToast();
    const { activeTerm } = useTerm();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [successCount, setSuccessCount] = useState(0);

    // Duplicate handling states
    const [duplicates, setDuplicates] = useState<{ code: string; name: string }[]>([]);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('new-only');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            readExcel(selectedFile);
        }
    };

    const readExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet);

                // Check if file is empty
                if (json.length === 0) {
                    setError("ไฟล์ Excel ไม่มีข้อมูล กรุณาตรวจสอบไฟล์");
                    setPreviewData([]);
                    toast({
                        title: "ไม่มีข้อมูล",
                        description: "ไฟล์ Excel ที่เลือกไม่มีข้อมูล",
                        variant: "destructive"
                    });
                } else {
                    setPreviewData(json);
                    setError(null);
                }
            } catch (err) {
                console.error(err);
                setError("ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์");
                setPreviewData([]);
            }
        };
        reader.readAsBinaryString(file);
    };

    const checkDuplicates = async () => {
        if (!previewData.length) {
            toast({
                title: "ไม่มีข้อมูล",
                description: "กรุณาเลือกไฟล์ที่มีข้อมูล",
                variant: "destructive"
            });
            return;
        }

        if (!activeTerm) {
            toast({
                title: "กรุณาเลือกเทอมก่อน",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const existingStudents = await getStudents(activeTerm.id);
            const existingCodes = new Set(existingStudents.map(s => s.studentCode));

            const foundDuplicates: { code: string; name: string }[] = [];

            for (const row of previewData) {
                const code = row['student_code'] || row['รหัสนักเรียน'] || row['code'];
                const name = row['full_name'] || row['ชื่อ-สกุล'] || row['name'];

                if (code && existingCodes.has(String(code))) {
                    foundDuplicates.push({ code: String(code), name: String(name) });
                }
            }

            if (foundDuplicates.length > 0) {
                setDuplicates(foundDuplicates);
                setShowDuplicateDialog(true);
            } else {
                // No duplicates, proceed with import
                await performImport('new-only');
            }
        } catch (err) {
            console.error(err);
            setError("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    const performImport = async (handling: DuplicateHandling) => {
        if (!activeTerm) {
            toast({ title: "กรุณาเลือกเทอมก่อน", variant: "destructive" });
            return;
        }

        setLoading(true);
        setSuccessCount(0);
        setError(null);
        setShowDuplicateDialog(false);

        try {
            // Get existing data filtered by current term only
            const existingStudents = await getStudents(activeTerm.id);
            const existingCodesMap = new Map(existingStudents.map(s => [s.studentCode, s]));

            // Get existing classrooms filtered by current term only
            const existingClassrooms = await getClassrooms(activeTerm.id);
            const classroomMap = new Map(existingClassrooms.map(c => [c.name, c]));

            let imported = 0;
            let updated = 0;
            let skipped = 0;

            for (const row of previewData) {
                const code = row['student_code'] || row['รหัสนักเรียน'] || row['code'];
                const name = row['full_name'] || row['ชื่อ-สกุล'] || row['name'];
                const classroomName = row['classroom'] || row['ห้องเรียน'] || row['classroom_name'];
                const username = row['username'] || code;
                const password = row['password'] || code;

                if (!code || !name) {
                    skipped++;
                    continue;
                }

                let classroomId = '';

                // Handle classroom - create if doesn't exist
                if (classroomName) {
                    const classroomNameStr = String(classroomName);

                    if (classroomMap.has(classroomNameStr)) {
                        classroomId = classroomMap.get(classroomNameStr)!.id;
                    } else {
                        // Parse and create new classroom
                        const parsed = parseClassroomName(classroomNameStr);
                        const newClassroom: Omit<Classroom, 'id'> = {
                            name: parsed.fullName,
                            level: parsed.level,
                            section: parsed.section,
                            studentCount: 0,
                            termId: activeTerm!.id
                        };

                        const docRef = await addClassroom(newClassroom);
                        classroomId = docRef.id;

                        // Add to map for subsequent records
                        classroomMap.set(parsed.fullName, { id: docRef.id, ...newClassroom });
                    }
                }

                const codeStr = String(code);
                const isDuplicate = existingCodesMap.has(codeStr);

                if (isDuplicate) {
                    if (handling === 'skip' || handling === 'new-only') {
                        skipped++;
                        continue;
                    } else if (handling === 'overwrite') {
                        // Update existing student
                        const existingStudent = existingCodesMap.get(codeStr)!;
                        const hashedPassword = await bcrypt.hash(String(password), 10);
                        await updateStudent(existingStudent.id, {
                            fullName: String(name),
                            classroomId: classroomId || existingStudent.classroomId,
                            username: String(username),
                            password: hashedPassword,
                        });
                        updated++;
                    }
                } else {
                    // Add new student
                    const hashedPassword = await bcrypt.hash(String(password), 10);
                    const newStudent: Omit<Student, 'id'> = {
                        studentCode: codeStr,
                        fullName: String(name),
                        classroomId: classroomId,
                        status: 'active',
                        termId: activeTerm!.id,
                        username: String(username),
                        password: hashedPassword,
                        mustChangePassword: true,
                        role: 'student'
                    };

                    await addStudent(newStudent);
                    imported++;
                }
            }

            setSuccessCount(imported + updated);

            let message = '';
            if (handling === 'overwrite' && updated > 0) {
                message = `เพิ่มใหม่ ${imported} คน, อัปเดต ${updated} คน`;
                if (skipped > 0) message += `, ข้าม ${skipped} คน`;
            } else if (handling === 'new-only' || handling === 'skip') {
                message = `เพิ่มใหม่ ${imported} คน`;
                if (skipped > 0) message += `, ข้าม ${skipped} คน (ข้อมูลซ้ำหรือไม่ครบ)`;
            }

            toast({ title: "Import เสร็จสิ้น", description: message });
            onSuccess();

            setTimeout(() => {
                setOpen(false);
                setFile(null);
                setPreviewData([]);
                setSuccessCount(0);
                setDuplicates([]);
            }, 2000);

        } catch (err) {
            console.error(err);
            setError("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Upload className="mr-1.5 h-4 w-4" />
                        Import Excel
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>นำเข้าข้อมูลนักเรียนจาก Excel</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                            <p className="text-xs text-muted-foreground mt-1">รองรับไฟล์ .xlsx, .xls</p>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        {file && (
                            <div className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                                <FileSpreadsheet className="h-4 w-4 text-primary" />
                                <span className="truncate flex-1">{file.name}</span>
                                <span className="text-muted-foreground">({previewData.length} รายการ)</span>
                            </div>
                        )}

                        {/* Preview Table */}
                        {previewData.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-secondary/30 p-2 font-semibold text-sm">ตัวอย่างข้อมูล (5 รายการแรก)</div>
                                <div className="overflow-x-auto max-h-[300px]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium">ลำดับ</th>
                                                <th className="px-3 py-2 text-left font-medium">รหัสนักเรียน</th>
                                                <th className="px-3 py-2 text-left font-medium">ชื่อ-สกุล</th>
                                                <th className="px-3 py-2 text-left font-medium">ห้องเรียน</th>
                                                <th className="px-3 py-2 text-left font-medium">สถานะ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.slice(0, 5).map((row, index) => {
                                                const code = row['student_code'] || row['รหัสนักเรียน'] || row['code'];
                                                const name = row['full_name'] || row['ชื่อ-สกุล'] || row['name'];
                                                const classroom = row['classroom'] || row['ห้องเรียน'] || row['classroom_name'] || '-';

                                                return (
                                                    <tr key={index} className="border-t hover:bg-muted/20">
                                                        <td className="px-3 py-2">{index + 1}</td>
                                                        <td className="px-3 py-2 font-mono text-xs">{code || '-'}</td>
                                                        <td className="px-3 py-2">{name || '-'}</td>
                                                        <td className="px-3 py-2">{classroom}</td>
                                                        <td className="px-3 py-2">
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">กำลังเรียน</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {previewData.length > 5 && (
                                    <div className="bg-muted/30 p-2 text-xs text-center text-muted-foreground">
                                        และอีก {previewData.length - 5} รายการ...
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>ข้อผิดพลาด</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {successCount > 0 && (
                            <Alert className="border-green-500 bg-green-50 text-green-700">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle>สำเร็จ</AlertTitle>
                                <AlertDescription>นำเข้าข้อมูลเรียบร้อยแล้ว {successCount} รายการ</AlertDescription>
                            </Alert>
                        )}

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>ไฟล์ต้องมีคอลัมน์: <strong>student_code (หรือ รหัสนักเรียน), full_name (หรือ ชื่อ-สกุล)</strong></p>
                            <p>คอลัมน์เสริม: <strong>classroom (หรือ ห้องเรียน)</strong> - รูปแบบ: ม.4/1 (จะแยกเป็น ม.4 ห้อง 1 อัตโนมัติ)</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
                        <Button onClick={checkDuplicates} disabled={!file || loading || previewData.length === 0}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {loading ? 'กำลังตรวจสอบ...' : 'เริ่มนำเข้าข้อมูล'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate Handling Dialog */}
            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            พบข้อมูลซ้ำ {duplicates.length} รายการ
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Alert variant="default" className="border-orange-500 bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-700">ข้อมูลที่ซ้ำกัน</AlertTitle>
                            <AlertDescription className="text-orange-600">
                                พบรหัสนักเรียนที่มีอยู่ในระบบแล้ว กรุณาเลือกวิธีการจัดการ
                            </AlertDescription>
                        </Alert>

                        <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto bg-muted/30">
                            <p className="text-sm font-semibold mb-2">รายการที่ซ้ำ:</p>
                            <div className="space-y-1">
                                {duplicates.map((dup, index) => (
                                    <Card key={index} className="border-l-4 border-l-orange-500">
                                        <CardContent className="p-2">
                                            <p className="text-sm">
                                                <span className="font-mono font-bold">{dup.code}</span> - {dup.name}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base font-semibold">เลือกวิธีการจัดการข้อมูลซ้ำ:</Label>
                            <RadioGroup value={duplicateHandling} onValueChange={(value) => setDuplicateHandling(value as DuplicateHandling)}>
                                <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-secondary/50 cursor-pointer">
                                    <RadioGroupItem value="new-only" id="new-only" />
                                    <Label htmlFor="new-only" className="cursor-pointer flex-1">
                                        <div className="font-medium">บันทึกเฉพาะข้อมูลใหม่</div>
                                        <div className="text-xs text-muted-foreground">ข้ามข้อมูลที่ซ้ำ เพิ่มเฉพาะข้อมูลใหม่เท่านั้น</div>
                                    </Label>
                                </div>

                                <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-secondary/50 cursor-pointer">
                                    <RadioGroupItem value="skip" id="skip" />
                                    <Label htmlFor="skip" className="cursor-pointer flex-1">
                                        <div className="font-medium">ข้ามทั้งหมด</div>
                                        <div className="text-xs text-muted-foreground">ไม่บันทึกข้อมูลที่ซ้ำ (เหมือนกับตัวเลือกแรก)</div>
                                    </Label>
                                </div>

                                <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-secondary/50 cursor-pointer border-orange-200">
                                    <RadioGroupItem value="overwrite" id="overwrite" />
                                    <Label htmlFor="overwrite" className="cursor-pointer flex-1">
                                        <div className="font-medium text-orange-700">อัปเดตข้อมูลเดิม</div>
                                        <div className="text-xs text-orange-600">บันทึกทับข้อมูลที่มีอยู่แล้วด้วยข้อมูลใหม่</div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>ยกเลิก</Button>
                        <Button onClick={() => performImport(duplicateHandling)} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {loading ? 'กำลังนำเข้า...' : 'ดำเนินการต่อ'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
