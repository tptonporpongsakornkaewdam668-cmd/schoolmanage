import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, AlertTriangle, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { addStudent, getStudents, updateStudent, getClassrooms, addClassroom } from '@/lib/services';
import { Student, Classroom } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { useTerm } from '@/lib/termContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
    const [pastedText, setPastedText] = useState('');
    const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
    const [duplicates, setDuplicates] = useState<{ code: string; name: string }[]>([]);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('new-only');
    const [useCodeAsAuth, setUseCodeAsAuth] = useState(true);

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

    const handlePasteChange = (text: string) => {
        setPastedText(text);
        if (!text.trim()) {
            setPreviewData([]);
            return;
        }

        const lines = text.trim().split('\n');
        const parsed = lines.map(line => {
            const cols = line.split(/\t/).map(c => c.trim());
            return {
                student_code: cols[0] || '',
                full_name: cols[1] || '',
                classroom: cols[2] || '',
            };
        });
        setPreviewData(parsed.filter(p => p.student_code && p.full_name));
    };

    const checkDuplicates = async () => {
        if (!previewData.length) {
            toast({
                title: "ไม่มีข้อมูล",
                description: "กรุณาเลือกไฟล์หรือวางข้อมูลที่มีรายชื่อ",
                variant: "destructive"
            });
            return;
        }

        if (!activeTerm) {
            toast({ title: "กรุณาเลือกเทอมก่อน", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const existingStudents = await getStudents(activeTerm.id);
            const existingCodes = new Set(existingStudents.map(s => s.studentCode));
            const foundDuplicates: { code: string; name: string }[] = [];

            for (const row of previewData) {
                const rawCode = row['student_code'] || row['รหัสนักเรียน'] || row['code'];
                const rawName = row['full_name'] || row['ชื่อ-สกุล'] || row['name'];
                const code = String(rawCode || '').trim();

                if (code && existingCodes.has(code)) {
                    foundDuplicates.push({ code, name: String(rawName || '').trim() });
                }
            }

            if (foundDuplicates.length > 0) {
                setDuplicates(foundDuplicates);
                setShowDuplicateDialog(true);
            } else {
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
        if (!activeTerm) return;

        setLoading(true);
        setSuccessCount(0);
        setError(null);
        setShowDuplicateDialog(false);

        try {
            const existingStudents = await getStudents(activeTerm.id);
            const existingCodesMap = new Map(existingStudents.map(s => [s.studentCode, s]));

            const existingClassrooms = await getClassrooms(activeTerm.id);
            const classroomMap = new Map(existingClassrooms.map(c => [c.name, c]));

            let imported = 0;
            let updated = 0;
            let skipped = 0;

            for (const row of previewData) {
                const rawCode = row['student_code'] || row['รหัสนักเรียน'] || row['code'];
                const rawName = row['full_name'] || row['ชื่อ-สกุล'] || row['name'];
                const classroomName = row['classroom'] || row['ห้องเรียน'] || row['classroom_name'];

                if (!rawCode || !rawName) {
                    skipped++;
                    continue;
                }

                const code = String(rawCode).trim();
                const name = String(rawName).trim();
                const username = useCodeAsAuth ? code : String(row['username'] || code).trim();
                const password = useCodeAsAuth ? code : String(row['password'] || code).trim();

                let classroomId = '';
                if (classroomName) {
                    const classroomNameStr = String(classroomName).trim();
                    if (classroomMap.has(classroomNameStr)) {
                        classroomId = classroomMap.get(classroomNameStr)!.id;
                    } else {
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
                        classroomMap.set(parsed.fullName, { id: docRef.id, ...newClassroom });
                    }
                }

                const isDuplicate = existingCodesMap.has(code);
                if (isDuplicate) {
                    if (handling === 'skip' || handling === 'new-only') {
                        skipped++;
                        continue;
                    } else if (handling === 'overwrite') {
                        const existingStudent = existingCodesMap.get(code)!;
                        const hashedPassword = await bcrypt.hash(password, 10);
                        await updateStudent(existingStudent.id, {
                            fullName: name,
                            classroomId: classroomId || existingStudent.classroomId,
                            username: username,
                            password: hashedPassword,
                        });
                        updated++;
                    }
                } else {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const newStudent: Omit<Student, 'id'> = {
                        studentCode: code,
                        fullName: name,
                        classroomId: classroomId,
                        status: 'active',
                        termId: activeTerm!.id,
                        username: username,
                        password: hashedPassword,
                        mustChangePassword: true,
                        role: 'student'
                    };
                    await addStudent(newStudent);
                    imported++;
                }
            }

            setSuccessCount(imported + updated);
            toast({
                title: "Import เสร็จสิ้น",
                description: `เพิ่มใหม่ ${imported} คน, อัปเดต ${updated} คน` + (skipped > 0 ? `, ข้าม ${skipped} คน` : '')
            });
            onSuccess();

            setTimeout(() => {
                setOpen(false);
                setFile(null);
                setPreviewData([]);
                setSuccessCount(0);
                setDuplicates([]);
                setPastedText('');
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
                        Import นักเรียน
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>นำเข้าข้อมูลนักเรียน</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <Tabs value={importMode} onValueChange={(val: any) => setImportMode(val)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="file">อัปโหลดไฟล์ (Excel)</TabsTrigger>
                                <TabsTrigger value="paste">วางข้อมูล (Paste)</TabsTrigger>
                            </TabsList>

                            <TabsContent value="file" className="pt-4">
                                <div
                                    className="border-2 border-dashed rounded-lg p-10 text-center hover:bg-secondary/50 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                                    <p className="text-sm font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</p>
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
                                    <div className="mt-3 p-2 bg-secondary/30 rounded flex items-center gap-2 text-sm text-secondary-foreground">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>{file.name} (พร้อมนำเข้า {previewData.length} รายการ)</span>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="paste" className="pt-4">
                                <div className="space-y-2">
                                    <Label>วางข้อมูลที่คัดลอกจาก Excel (รหัส, ชื่อ-สกุล, ห้อง)</Label>
                                    <Textarea
                                        placeholder="ตัวอย่าง:&#13;10001	เด็กชายสมชาย ดีมาก	ม.1/1&#13;10002	เด็กชายสมรัก เรียนดี	ม.1/1"
                                        className="min-h-[200px] font-mono text-sm"
                                        value={pastedText}
                                        onChange={(e) => handlePasteChange(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        * ระบบจะแยกข้อมูลด้วยการกด Tab (ค่าเริ่มต้นจาก Excel)
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 flex items-start gap-3">
                            <Checkbox
                                id="useCodeAsAuth"
                                checked={useCodeAsAuth}
                                onCheckedChange={(checked) => setUseCodeAsAuth(checked as boolean)}
                                className="mt-1"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="useCodeAsAuth" className="text-sm font-bold cursor-pointer">
                                    สร้าง Username/Password ให้อัตโนมัติ (ใช้รหัสนักเรียนมารวมกัน)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    นักเรียนจะล็อคอินด้วยรหัสประจำตัว และต้องเปลี่ยนรหัสผ่านในการเข้าใช้งานครั้งแรก
                                </p>
                            </div>
                        </div>

                        {previewData.length > 0 && (
                            <div className="border rounded-md">
                                <div className="bg-muted/50 p-2 text-xs font-semibold border-b">ตัวอย่างข้อมูล 5 รายการแรก</div>
                                <div className="overflow-x-auto max-h-[200px]">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/30 border-b">
                                                <th className="p-2 text-left">รหัส</th>
                                                <th className="p-2 text-left">ชื่อ-สกุล</th>
                                                <th className="p-2 text-left">ห้องเรียน</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="p-2">{row['student_code'] || row['รหัสนักเรียน'] || row['code'] || '-'}</td>
                                                    <td className="p-2">{row['full_name'] || row['ชื่อ-สกุล'] || row['name'] || '-'}</td>
                                                    <td className="p-2">{row['classroom'] || row['ห้องเรียน'] || row['classroom_name'] || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {previewData.length > 5 && (
                                    <div className="p-1.5 text-center text-[10px] text-muted-foreground bg-muted/20">
                                        และอีก {previewData.length - 5} รายการ...
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {successCount > 0 && (
                            <Alert className="bg-green-50 border-green-200 text-green-800">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle>สำเร็จ!</AlertTitle>
                                <AlertDescription>นำเข้าข้อมูลนักเรียนทั้งหมด {successCount} รายการเรียบร้อยแล้ว</AlertDescription>
                            </Alert>
                        )}

                        <div className="text-[10px] text-muted-foreground space-y-1 bg-muted/50 p-3 rounded italic">
                            <p className="font-bold text-secondary-foreground not-italic mb-1">💡 คำแนะนำ:</p>
                            <p>• รูปแบบ Excel: คอลัมน์ "รหัสนักเรียน", "ชื่อ-สกุล" (หรือ student_code, full_name)</p>
                            <p>• หากใช้การวางข้อมูล: คัดลอกจาก Excel มาทั้งแถวและคอลัมน์ได้เลย</p>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>ยกเลิก</Button>
                        <Button
                            onClick={checkDuplicates}
                            disabled={loading || (importMode === 'file' ? !file : !pastedText.trim()) || previewData.length === 0}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {loading ? 'กำลังประมวลผล...' : 'เริ่มนำเข้าข้อมูล'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-5 w-5" />
                            พบรหัสนักเรียนซ้ำในระบบ
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Alert variant="default" className="bg-orange-50 border-orange-200 text-orange-800">
                            <AlertDescription>
                                พบรหัสนักเรียน {duplicates.length} รายการที่ซ้ำกับข้อมูลเดิมในเทอมนี้ กรุณาเลือกวิธีจัดการ:
                            </AlertDescription>
                        </Alert>

                        <RadioGroup value={duplicateHandling} onValueChange={(val) => setDuplicateHandling(val as DuplicateHandling)}>
                            <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-secondary/50 cursor-pointer">
                                <RadioGroupItem value="new-only" id="h-new" />
                                <Label htmlFor="h-new" className="flex-1 cursor-pointer">
                                    <div className="font-semibold">เพิ่มเฉพาะรายชื่อใหม่</div>
                                    <div className="text-xs text-muted-foreground">ข้ามข้อมูลที่ซ้ำไปเลย</div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-secondary/50 cursor-pointer text-orange-700 border-orange-200">
                                <RadioGroupItem value="overwrite" id="h-over" />
                                <Label htmlFor="h-over" className="flex-1 cursor-pointer">
                                    <div className="font-semibold text-orange-800">อัปเดตข้อมูลทับของเดิม</div>
                                    <div className="text-xs text-orange-600">แก้ไขข้อมูลนักเรียนเดิมให้เป็นตามไฟล์ที่นำเข้า</div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>ยกเลิก</Button>
                        <Button
                            onClick={() => performImport(duplicateHandling)}
                            className={duplicateHandling === 'overwrite' ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ตกลงและดำเนินการต่อ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
