import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/lib/termContext';
import { getSubjects, getAssignmentsBySubject, getScoresByAssignment, getStudents } from '@/lib/services';
import { Subject, Assignment, StudentScore } from '@/lib/types';
import { ClipboardList, BookOpen, Clock, CheckCircle2, AlertCircle, Loader2, Calendar, ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function AssignmentsPage() {
    const { currentUser } = useAuth();
    const { activeTerm } = useTerm();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignmentsData, setAssignmentsData] = useState<Record<string, (Assignment & { score?: number })[]>>({});
    const [stats, setStats] = useState({ total: 0, submitted: 0 });
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedAssignment, setSelectedAssignment] = useState<(Assignment & { score?: number }) | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        if (currentUser?.studentId && activeTerm) {
            loadAssignments();
        }
    }, [currentUser, activeTerm]);

    async function loadAssignments() {
        setLoading(true);
        try {
            const [allSubjects, students] = await Promise.all([
                getSubjects(activeTerm!.id),
                getStudents(activeTerm!.id)
            ]);

            const student = students.find(s => s.id === currentUser!.studentId);
            if (student) {
                const studentSubjects = allSubjects.filter(s => s.classrooms.includes(student.classroomId));
                setSubjects(studentSubjects);

                const assignmentGroup: Record<string, (Assignment & { score?: number })[]> = {};
                let totalCount = 0;
                let submittedCount = 0;

                for (const sub of studentSubjects) {
                    const assignments = await getAssignmentsBySubject(sub.id);
                    totalCount += assignments.length;

                    const enrichedAssignments = await Promise.all(assignments.map(async (asm) => {
                        const scores = await getScoresByAssignment(asm.id);
                        const studentScore = scores.find(sc => sc.studentId === currentUser!.studentId);
                        if (studentScore) submittedCount++;
                        return { ...asm, score: studentScore?.score };
                    }));

                    assignmentGroup[sub.id] = enrichedAssignments;
                }

                setAssignmentsData(assignmentGroup);
                setStats({ total: totalCount, submitted: submittedCount });
            }
        } catch (error) {
            console.error("Failed to load assignments", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    const progress = stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0;
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    const selectedAssignments = selectedSubjectId ? assignmentsData[selectedSubjectId] || [] : [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Stats */}
            {!selectedSubjectId ? (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">งานและคะแนน</h1>
                        <p className="text-sm text-muted-foreground">เลือกวิชาเพื่อดูรายละเอียดงานและคะแนน</p>
                    </div>
                    <Card className="w-full md:w-72 bg-primary/5 border-primary/10">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between text-sm font-bold">
                                <span>ความคืบหน้าภาพรวม</span>
                                <span className="text-primary">{stats.submitted}/{stats.total} งาน</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-[10px] text-muted-foreground text-center">ส่งงานแล้ว {Math.round(progress)}% ของงานทั้งหมด</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => setSelectedSubjectId(null)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{selectedSubject?.name}</h1>
                        <p className="text-sm text-muted-foreground">{selectedSubject?.code} • รายการงานที่มอบหมาย</p>
                    </div>
                </div>
            )}

            {subjects.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>ไม่พบข้อมูลรายวิชาที่คุณลงทะเบียนไว้</p>
                    </CardContent>
                </Card>
            ) : !selectedSubjectId ? (
                /* Subject Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map(subject => {
                        const assignments = assignmentsData[subject.id] || [];
                        const submitted = assignments.filter(a => a.score !== undefined).length;
                        const total = assignments.length;
                        const subProgress = total > 0 ? (submitted / total) * 100 : 0;

                        return (
                            <Card
                                key={subject.id}
                                className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => setSelectedSubjectId(subject.id)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            {subject.logoUrl ? (
                                                <img src={subject.logoUrl} alt={subject.name} className="w-full h-full object-cover rounded-2xl" />
                                            ) : (
                                                <BookOpen className="h-6 w-6" />
                                            )}
                                        </div>
                                        <Badge variant={submitted === total && total > 0 ? "secondary" : "outline"} className={submitted === total && total > 0 ? "bg-green-100 text-green-700 border-green-200" : ""}>
                                            {total > 0 ? `${submitted}/${total} งาน` : 'ไม่มีงาน'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 mb-4">
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{subject.code}</p>
                                        <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">{subject.name}</CardTitle>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                            <span>ความคืบหน้าวิชา</span>
                                            <span>{Math.round(subProgress)}%</span>
                                        </div>
                                        <Progress value={subProgress} className="h-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* Detailed Assignments View */
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">รายการงานและคะแนน</CardTitle>
                            <Badge variant="secondary" className="font-bold">
                                {selectedAssignments.length} รายการ
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {selectedAssignments.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>วืชายังไม่มีการมอบหมายงาน</p>
                                </div>
                            ) : selectedAssignments.map(asm => (
                                <div
                                    key={asm.id}
                                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/5 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setSelectedAssignment(asm);
                                        setIsDetailOpen(true);
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${asm.score !== undefined ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {asm.score !== undefined ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{asm.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                {asm.dueDate && (
                                                    <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {(asm.dueDate)} {asm.dueTime || ''}
                                                    </span>
                                                )}
                                                <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                                                    <ClipboardList className="h-3 w-3" />
                                                    คะแนนเต็ม {asm.maxScore}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full sm:w-auto text-right">
                                        {asm.score !== undefined ? (
                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                                <span className="text-xs text-muted-foreground">คะแนนที่ได้</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-black text-primary">{asm.score}</span>
                                                    <span className="text-xs text-muted-foreground">/ {asm.maxScore}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 text-amber-600">
                                                <AlertCircle className="h-4 w-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">ยังไม่ได้ส่ง</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Assignment Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${selectedAssignment?.score !== undefined ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                {selectedAssignment?.score !== undefined ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                                {selectedAssignment?.score !== undefined ? 'ส่งแล้ว' : 'รอดำเนินการ'}
                            </Badge>
                        </div>
                        <DialogTitle className="text-xl font-bold">{selectedAssignment?.title}</DialogTitle>
                        <DialogDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-xs">
                                <FileText className="h-3.5 w-3.5" />
                                คะแนนเต็ม: {selectedAssignment?.maxScore}
                            </span>
                            {selectedAssignment?.dueDate && (
                                <span className="flex items-center gap-1.5 text-xs text-red-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    กำหนดส่ง: {new Date(selectedAssignment.dueDate).toLocaleDateString('th-TH')} {selectedAssignment.dueTime || ''}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {selectedAssignment?.description && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
                                    รายละเอียดงาน
                                </h4>
                                <div className="p-4 rounded-xl bg-muted/50 text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedAssignment.description}
                                </div>
                            </div>
                        )}

                        {selectedAssignment?.link && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-primary">ลิงก์แนบ</h4>
                                <a
                                    href={selectedAssignment.link.startsWith('http') ? selectedAssignment.link : `https://${selectedAssignment.link}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors group"
                                >
                                    <span className="text-xs font-medium truncate max-w-[300px]">{selectedAssignment.link}</span>
                                    <ExternalLink className="h-4 w-4 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </a>
                            </div>
                        )}

                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">สถานะการให้คะแนน</p>
                                <p className="text-sm font-bold">
                                    {selectedAssignment?.score !== undefined ? 'อาจารย์ตรวจแล้ว' : 'รอการตรวจสอบ/ยังไม่ส่ง'}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-primary">{selectedAssignment?.score ?? '-'}</span>
                                <span className="text-sm text-muted-foreground ml-1">/ {selectedAssignment?.maxScore}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="secondary" className="w-full font-bold" onClick={() => setIsDetailOpen(false)}>
                            ปิดหน้าต่าง
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
