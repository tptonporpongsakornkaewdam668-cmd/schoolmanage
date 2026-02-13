import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Save, Trash, FileDown, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
    getSubjects, getStudentsByClassroom, getAssignmentsBySubject,
    addAssignment, deleteAssignment, getScoresByAssignment, saveScore,
    getGradeConfigs, updateSubject, getClassrooms, getStudents // Added getClassrooms, getStudents
} from '@/lib/services';
import { Subject, Student, Assignment, StudentScore, GradeConfig, Classroom } from '@/lib/types'; // Added Classroom
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTerm } from '@/lib/termContext';

// Helper Component for Subject Grading
function SubjectGradingSettings({ subject, defaultGrades, onSave }: { subject: Subject; defaultGrades: GradeConfig[]; onSave: (config: GradeConfig[] | undefined) => Promise<void> }) {
    // If subject has config, use it. Else use defaultGrades (but keep state as "using defaults" technically?
    // Actually, we want to allow editing. If we edit, we save as subject config.

    const [grades, setGrades] = useState<GradeConfig[]>(
        (subject.gradingConfig && subject.gradingConfig.length > 0) ? subject.gradingConfig : defaultGrades
    );
    const { toast } = useToast();
    const isCustom = !!(subject.gradingConfig && subject.gradingConfig.length > 0);

    useEffect(() => {
        // If we switched subjects or defaults changed (though defaults shouldn't change often)
        if (subject.gradingConfig && subject.gradingConfig.length > 0) {
            setGrades(subject.gradingConfig);
        } else {
            setGrades(defaultGrades);
        }
    }, [subject.gradingConfig, defaultGrades]);

    const handleSave = async () => {
        try {
            await onSave(grades);
            toast({ title: "บันทึกเกณฑ์การตัดเกรดสำเร็จ" });
        } catch (e) {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        }
    };

    const handleReset = async () => {
        if (!confirm("ต้องการรีเซ็ตเป็นเกณฑ์กลางของระบบ?")) return;
        try {
            await onSave(undefined); // undefined means remove custom config
            setGrades(defaultGrades);
            toast({ title: "รีเซ็ตเกณฑ์สำเร็จ" });
        } catch (e) {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        }
    };

    const addGrade = () => {
        setGrades([...grades, { grade: '', minScore: 0, maxScore: 100 }]);
    };

    const updateGrade = (index: number, field: keyof GradeConfig, value: any) => {
        const newGrades = [...grades];
        newGrades[index] = { ...newGrades[index], [field]: value };
        setGrades(newGrades);
    };

    const removeGrade = (index: number) => {
        const newGrades = [...grades];
        newGrades.splice(index, 1);
        setGrades(newGrades);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>เกณฑ์การตัดเกรดเฉพาะรายวิชา</CardTitle>
                <CardDescription>
                    กำหนดช่วงคะแนนสำหรับตัดเกรดวิชานี้
                    {isCustom ? <span className="text-blue-600 font-bold ml-2">(กำหนดเอง)</span> : <span className="text-muted-foreground ml-2">(อิงเกณฑ์กลาง)</span>}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {grades.map((g, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="grid w-20 items-center gap-1.5">
                            <Label>เกรด</Label>
                            <Input value={g.grade} onChange={e => updateGrade(i, 'grade', e.target.value)} placeholder="A" />
                        </div>
                        <div className="grid w-24 items-center gap-1.5">
                            <Label>คะแนนต่ำสุด</Label>
                            <Input type="number" value={g.minScore} onChange={e => updateGrade(i, 'minScore', Number(e.target.value))} />
                        </div>
                        <div className="flex items-center pt-6">-</div>
                        <div className="grid w-24 items-center gap-1.5">
                            <Label>คะแนนสูงสุด</Label>
                            <Input type="number" value={g.maxScore} onChange={e => updateGrade(i, 'maxScore', Number(e.target.value))} />
                        </div>
                        <div className="pt-6">
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeGrade(i)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
            <div className="flex gap-2 p-6 pt-0 justify-between">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={addGrade}><Plus className="mr-2 h-4 w-4" /> เพิ่มเกรด</Button>
                    <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> บันทึกเกณฑ์รายวิชา</Button>
                </div>
                {isCustom && (
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={handleReset}>
                        รีเซ็ตเป็นเกณฑ์กลาง
                    </Button>
                )}
            </div>
        </Card>
    );
}

export default function SubjectDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { activeTerm } = useTerm();
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [students, setStudents] = useState<{ student: Student; classroomName: string }[]>([]);

    // Assignment States
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<StudentScore[]>([]);

    // Add Assignment Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newAssignment, setNewAssignment] = useState({ title: '', maxScore: '', startDate: '', dueDate: '', dueTime: '' });
    const [savingAssignment, setSavingAssignment] = useState(false);

    const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>([]);
    const [globalGradeConfigs, setGlobalGradeConfigs] = useState<GradeConfig[]>([]);

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    async function loadData() {
        if (!activeTerm) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [allSubjects, allClassrooms, allStudents, subjectAssignments, globalGrades] = await Promise.all([
                getSubjects(activeTerm.id),
                getClassrooms(activeTerm.id),
                getStudents(activeTerm.id),
                getAssignmentsBySubject(id!),
                getGradeConfigs()
            ]);

            setGlobalGradeConfigs(globalGrades);

            const sub = allSubjects.find(s => s.id === id);
            if (sub) {
                setSubject(sub);
                setAssignments(subjectAssignments);

                // Determine active grade config for display
                if (sub.gradingConfig && sub.gradingConfig.length > 0) {
                    setGradeConfigs(sub.gradingConfig);
                } else {
                    setGradeConfigs(globalGrades);
                }

                // Students Logic
                const subjectClassrooms = allClassrooms.filter(c => sub.classrooms.includes(c.id));
                setClassrooms(subjectClassrooms);
                const relevantStudents = allStudents.filter(s => sub.classrooms.includes(s.classroomId));
                const studentsWithClass = relevantStudents.map(s => {
                    const room = allClassrooms.find(c => c.id === s.classroomId);
                    return {
                        student: s,
                        classroomName: room ? room.name : 'Unknown'
                    };
                });
                studentsWithClass.sort((a, b) => a.classroomName.localeCompare(b.classroomName) || a.student.studentCode.localeCompare(b.student.studentCode));
                setStudents(studentsWithClass);

                // Load Scores
                const allScores: StudentScore[] = [];
                for (const asm of subjectAssignments) {
                    const asmScores = await getScoresByAssignment(asm.id);
                    allScores.push(...asmScores);
                }
                setScores(allScores);
            }
        } catch (e) {
            console.error("Failed to load subject details", e);
        } finally {
            setLoading(false);
        }
    }

    const calculateGrade = (score: number) => {
        const config = gradeConfigs.find(g => score >= g.minScore && score <= g.maxScore);
        return config ? config.grade : '-';
    };

    const handleAddAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !newAssignment.title || !newAssignment.maxScore || !activeTerm) return;

        setSavingAssignment(true);
        try {
            await addAssignment({
                subjectId: id,
                title: newAssignment.title,
                maxScore: Number(newAssignment.maxScore),
                termId: activeTerm.id,
                startDate: newAssignment.startDate || undefined,
                dueDate: newAssignment.dueDate || undefined,
                dueTime: newAssignment.dueTime || undefined
            });
            toast({ title: "เพิ่มงานสำเร็จ" });
            setIsAddOpen(false);
            setNewAssignment({ title: '', maxScore: '', startDate: '', dueDate: '', dueTime: '' });
            loadData(); // Reload to show new column
        } catch (e) {
            toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        } finally {
            setSavingAssignment(false);
        }
    };

    const handleScoreChange = (studentId: string, assignmentId: string, value: string) => {
        const numValue = Number(value);
        if (value !== '' && isNaN(numValue)) return; // Validate number, allow empty

        const existingScoreIndex = scores.findIndex(s => s.assignmentId === assignmentId && s.studentId === studentId);
        let newScores = [...scores];

        if (value === '') {
            if (existingScoreIndex >= 0) {
                // Mark for removal or just set to 0/null? 
                // Simple approach: set to 0 or hidden. 
                // Let's keep it simple: local update to 0 but maybe don't delete yet.
                // Actually, let's just let it be 0.
                newScores[existingScoreIndex] = { ...newScores[existingScoreIndex], score: 0 };
            }
        } else {
            if (existingScoreIndex >= 0) {
                newScores[existingScoreIndex] = { ...newScores[existingScoreIndex], score: numValue };
            } else {
                newScores.push({ id: 'temp_' + Date.now(), assignmentId, studentId, score: numValue });
            }
        }
        setScores(newScores);
    };

    const handleSaveScores = async () => {
        if (!activeTerm) {
            toast({ title: "กรุณาเลือกเทอมก่อน", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Only save scores that are valid numbers or 0.
            const promises = scores.filter(s => !isNaN(s.score)).map(s => saveScore({
                assignmentId: s.assignmentId,
                studentId: s.studentId,
                score: s.score,
                termId: activeTerm.id
            }));
            await Promise.all(promises);
            toast({ title: "บันทึกคะแนนเรียบร้อย", className: "bg-green-600 text-white" });
            // Reload to get real IDs back from DB if needed
            loadData();
        } catch (e) {
            console.error(e);
            toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
            setLoading(false);
        }
    };

    const getScore = (studentId: string, assignmentId: string) => {
        const s = scores.find(sc => sc.studentId === studentId && sc.assignmentId === assignmentId);
        return s ? s.score.toString() : '';
    };

    const handleExportExcel = () => {
        if (!subject || students.length === 0) return;

        // 1. Prepare Headers
        const headers = [
            "ลำดับ",
            "ห้องเรียน",
            "รหัสนักเรียน",
            "ชื่อ-สกุล",
            ...assignments.map(a => `${a.title} (${a.maxScore})`),
            "รวม",
            "เกรด"
        ];

        // 2. Prepare Data Rows
        const data = students.map((item, index) => {
            const row: any = {
                "ลำดับ": index + 1,
                "ห้องเรียน": item.classroomName,
                "รหัสนักเรียน": item.student.studentCode,
                "ชื่อ-สกุล": item.student.fullName
            };

            let total = 0;
            assignments.forEach(asm => {
                const s = scores.find(sc => sc.studentId === item.student.id && sc.assignmentId === asm.id);
                const scoreVal = s ? s.score : 0;
                row[`${asm.title} (${asm.maxScore})`] = s ? scoreVal : '-';
                total += scoreVal;
            });

            row["รวม"] = total;
            row["เกรด"] = calculateGrade(total);

            return row;
        });

        // 3. Create Worksheet
        const ws = XLSX.utils.json_to_sheet(data, { header: headers });

        // 4. Create Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scores");

        // 5. Download
        XLSX.writeFile(wb, `${subject.code}_${subject.name}_Scores.xlsx`);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!subject) {
        return <div className="p-8 text-center">ไม่พบหัวข้อวิชา</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/subjects')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{subject.code} - {subject.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            นักเรียน {students.length} คน • งานที่มอบหมาย {assignments.length} งาน
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadData} disabled={loading}>
                        <Loader2 className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> รีเฟรช
                    </Button>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> เพิ่มงาน
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>เพิ่มงานใหม่</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddAssignment} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">ชื่องาน</Label>
                                    <Input
                                        id="title"
                                        value={newAssignment.title}
                                        onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxScore">คะแนนเต็ม</Label>
                                    <Input
                                        id="maxScore"
                                        type="number"
                                        value={newAssignment.maxScore}
                                        onChange={e => setNewAssignment({ ...newAssignment, maxScore: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">วันที่สั่งงาน</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={newAssignment.startDate}
                                            onChange={e => setNewAssignment({ ...newAssignment, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dueDate">กำหนดส่ง (วันที่)</Label>
                                        <Input
                                            id="dueDate"
                                            type="date"
                                            value={newAssignment.dueDate}
                                            onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dueTime">กำหนดส่ง (เวลา)</Label>
                                    <Input
                                        id="dueTime"
                                        type="time"
                                        value={newAssignment.dueTime}
                                        onChange={e => setNewAssignment({ ...newAssignment, dueTime: e.target.value })}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={savingAssignment}>
                                        {savingAssignment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} บันทึก
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={handleSaveScores} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        <Save className="mr-2 h-4 w-4" /> บันทึกคะแนน
                    </Button>
                    <Button onClick={handleExportExcel} disabled={loading} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                        <FileDown className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="scores" className="w-full">
                <TabsList>
                    <TabsTrigger value="scores">คะแนน & เกรด</TabsTrigger>
                    <TabsTrigger value="settings">ตั้งค่าตัดเกรด</TabsTrigger>
                </TabsList>

                <TabsContent value="scores">
                    <Card>
                        <CardHeader>
                            <CardTitle>รายชื่อนักเรียนและคะแนน</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* ... Existing Score Table ... */}
                            <div className="border rounded-lg overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-3 text-left font-medium">เลขที่</th>
                                            <th className="px-4 py-3 text-left font-medium">รหัสนักเรียน</th>
                                            <th className="px-4 py-3 text-left font-medium">ชื่อ-นามสกุล</th>
                                            {assignments.map(asm => (
                                                <th key={asm.id} className="px-4 py-3 text-center font-medium min-w-[120px]">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold">{asm.title}</span>
                                                        <span className="text-xs text-muted-foreground">({asm.maxScore} คะแนน)</span>
                                                        {asm.dueDate && (
                                                            <span className="text-[10px] text-red-500 mt-1">
                                                                ส่ง: {new Date(asm.dueDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                                                {asm.dueTime && ` ${asm.dueTime}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 text-center font-medium min-w-[100px] border-l bg-muted/30">รวม</th>
                                            <th className="px-4 py-3 text-center font-medium min-w-[80px] border-l bg-muted/30">เกรด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((item, index) => {
                                            const totalScore = assignments.reduce((sum, asm) => {
                                                const s = scores.find(sc => sc.studentId === item.student.id && sc.assignmentId === asm.id);
                                                return sum + (s ? s.score : 0);
                                            }, 0);
                                            const grade = calculateGrade(totalScore);
                                            return (
                                                <tr key={item.student.id} className="border-b last:border-0 hover:bg-muted/5">
                                                    <td className="px-4 py-3">{index + 1}</td> {/* Assuming 'number' maps to index + 1 */}
                                                    <td className="px-4 py-3">{item.student.studentCode}</td> {/* Assuming 'studentId' maps to studentCode */}
                                                    <td className="px-4 py-3">{item.student.fullName}</td> {/* Assuming 'name' maps to fullName */}
                                                    {assignments.map(asm => {
                                                        const score = getScore(item.student.id, asm.id); // Using existing getScore
                                                        return (
                                                            <td key={asm.id} className="px-4 py-2 text-center">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    max={asm.maxScore}
                                                                    className="w-16 text-center mx-auto h-8"
                                                                    value={score !== undefined ? score : ''}
                                                                    onChange={(e) => handleScoreChange(item.student.id, asm.id, e.target.value)}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-3 text-center font-bold border-l bg-muted/30">
                                                        {totalScore}
                                                    </td>
                                                    <td className={`px-4 py-3 text-center font-bold border-l ${totalScore < 50 ? 'text-red-500' : 'text-green-600'}`}>
                                                        {grade}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {students.length === 0 && (
                                            <tr>
                                                <td colSpan={4 + assignments.length + 2} className="p-8 text-center text-muted-foreground">ไม่มีนักเรียนในรายวิชานี้</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <SubjectGradingSettings
                        subject={subject}
                        // We need the global grades here. 
                        // But wait, 'gradeConfigs' state in SubjectDetailsPage might be holding the *subject-specific* ones IF we set it so in loadData?
                        // Let's check loadData logic. 
                        // Ah, I need to store the *global* defaults separately in state to pass them here.
                        // For now, I'll fetch them or use a new state variable. 
                        // Actually, I can just use a new state: globalGradeConfigs
                        defaultGrades={globalGradeConfigs}
                        onSave={async (newGrades) => {
                            const updatedSubject = { ...subject, gradingConfig: newGrades };
                            setSubject(updatedSubject);
                            setGradeConfigs(newGrades || globalGradeConfigs); // If newGrades is undefined (reset), use global
                            await updateSubject(subject.id, { gradingConfig: newGrades });
                        }}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
