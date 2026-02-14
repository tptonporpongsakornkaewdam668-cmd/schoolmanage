import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Upload, Download, MoreHorizontal, Loader2, FileX, Trash, User as UserIcon } from 'lucide-react';
import { getStudentsByClassroom, getClassrooms, addStudent, deleteStudent, getSubjects, getAssignmentsBySubject, getScoresByAssignment, updateStudent } from '@/lib/services';
import { Student, Classroom, Subject, Assignment } from '@/lib/types';
import { ImportStudentsDialog } from '@/components/ImportStudentsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { useTerm } from '@/lib/termContext';

import { StudentDialog } from '@/components/StudentDialog';
import { EditStudentDialog } from '@/components/EditStudentDialog';
import { useToast } from '@/hooks/use-toast';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'กำลังเรียน', variant: 'default' },
  suspended: { label: 'พักการเรียน', variant: 'secondary' },
  resigned: { label: 'ลาออก', variant: 'destructive' },
  graduated: { label: 'จบการศึกษา', variant: 'outline' },
};

export default function StudentsPage() {
  const { toast } = useToast();
  const { activeTerm } = useTerm();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [missingDialogOpen, setMissingDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [missingAssignments, setMissingAssignments] = useState<{ subject: Subject; assignment: Assignment }[]>([]);
  const [loadingMissing, setLoadingMissing] = useState(false);

  useEffect(() => {
    async function initData() {
      if (!activeTerm) {
        setLoading(false);
        return;
      }

      try {
        const classroomData = await getClassrooms(activeTerm.id);
        setClassrooms(classroomData);
        if (classroomData.length > 0) {
          setSelectedClassroom(classroomData[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch classrooms", error);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [activeTerm]);

  async function loadStudents() {
    if (!selectedClassroom || !activeTerm) return;
    try {
      const studentData = await getStudentsByClassroom(selectedClassroom, activeTerm.id);
      setStudents(studentData);
    } catch (error) {
      console.error("Failed to fetch students", error);
    }
  }

  useEffect(() => {
    loadStudents();
  }, [selectedClassroom]);

  const handleAddStudent = async (student: Omit<Student, 'id'>) => {
    try {
      await addStudent(student);
      toast({ title: 'สำเร็จ', description: 'เพิ่มนักเรียนเรียบร้อยแล้ว' });
      loadStudents();
    } catch (error) {
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถเพิ่มนักเรียนได้', variant: 'destructive' });
    }
  };

  const handleEditStudent = async (id: string, data: Partial<Student>) => {
    try {
      await updateStudent(id, data);
      toast({ title: 'สำเร็จ', description: 'แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว' });
      loadStudents();
    } catch (error) {
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถแก้ไขข้อมูลได้', variant: 'destructive' });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบนักเรียนคนนี้?')) return;
    try {
      await deleteStudent(id);
      toast({ title: 'สำเร็จ', description: 'ลบนักเรียนเรียบร้อยแล้ว' });
      loadStudents();
    } catch (error) {
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถลบนักเรียนได้', variant: 'destructive' });
    }
  };

  const handleCheckMissingAssignments = async (student: Student) => {
    setSelectedStudent(student);
    setMissingDialogOpen(true);
    setLoadingMissing(true);
    setMissingAssignments([]);

    if (!activeTerm) {
      setLoadingMissing(false);
      return;
    }

    try {
      // Get all subjects for this student's classroom (filtered by termId)
      const allSubjects = await getSubjects(activeTerm.id);
      const studentSubjects = allSubjects.filter(s => s.classrooms.includes(student.classroomId));

      const missing: { subject: Subject; assignment: Assignment }[] = [];

      // For each subject, get assignments and check if student submitted
      for (const subject of studentSubjects) {
        const assignments = await getAssignmentsBySubject(subject.id);

        for (const assignment of assignments) {
          const scores = await getScoresByAssignment(assignment.id);
          const hasSubmitted = scores.some(score => score.studentId === student.id && score.score !== undefined);

          if (!hasSubmitted) {
            missing.push({ subject, assignment });
          }
        }
      }

      setMissingAssignments(missing);
    } catch (error) {
      console.error("Failed to check missing assignments", error);
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถตรวจสอบงานที่ยังไม่ได้ส่งได้', variant: 'destructive' });
    } finally {
      setLoadingMissing(false);
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) {
      toast({ title: 'ไม่มีข้อมูล', description: 'ไม่มีข้อมูลนักเรียนให้ export', variant: 'destructive' });
      return;
    }

    // Find classroom name
    const classroom = classrooms.find(c => c.id === selectedClassroom);
    const classroomName = classroom?.name || 'Unknown';

    // Prepare data for export
    const exportData = students.map((student, index) => ({
      'ลำดับ': index + 1,
      'รหัสนักเรียน': student.studentCode,
      'ชื่อ-สกุล': student.fullName,
      'ห้องเรียน': classroomName,
      'สถานะ': statusLabels[student.status]?.label || student.status,
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Download
    XLSX.writeFile(wb, `นักเรียน_${classroomName}_${new Date().toLocaleDateString('th-TH')}.xlsx`);

    toast({ title: 'สำเร็จ', description: 'Export ข้อมูลนักเรียนเรียบร้อยแล้ว' });
  };

  const filteredStudents = students.filter(
    (s) =>
      !searchQuery ||
      s.fullName.includes(searchQuery) ||
      s.studentCode.includes(searchQuery)
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการนักเรียน</h1>
          <p className="text-sm text-muted-foreground">เพิ่ม แก้ไข และจัดการข้อมูลนักเรียน</p>
        </div>
        <div className="flex gap-2">
          <ImportStudentsDialog onSuccess={loadStudents} />
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="mr-1.5 h-4 w-4" />
            Export Excel
          </Button>
          <StudentDialog classrooms={classrooms} onSave={handleAddStudent} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {loading ? (
          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="เลือกห้อง" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} คน)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Student Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ลำดับ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รหัส</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {loading ? "กำลังโหลด..." : "ไม่พบข้อมูลนักเรียน"}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, i) => {
                    const statusInfo = statusLabels[student.status] || { label: student.status, variant: 'secondary' };
                    return (
                      <tr key={student.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{student.studentCode}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {student.fullName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{student.fullName}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <UserIcon className="h-2.5 w-2.5" /> {student.username || '-'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => handleCheckMissingAssignments(student)}
                            >
                              <FileX className="mr-1.5 h-4 w-4" />
                              งานที่ยังไม่ส่ง
                            </Button>
                            <EditStudentDialog
                              student={student}
                              classrooms={classrooms}
                              onSave={handleEditStudent}
                            />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteStudent(student.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Missing Assignments Dialog */}
      <Dialog open={missingDialogOpen} onOpenChange={setMissingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>งานที่ยังไม่ได้ส่ง - {selectedStudent?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingMissing ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : missingAssignments.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">🎉 ส่งงานครบทุกรายการแล้ว!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {missingAssignments.map((item, index) => (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.assignment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            วิชา: {item.subject.code} - {item.subject.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            คะแนนเต็ม: {item.assignment.maxScore}
                          </p>
                          {(item.assignment.dueDate || item.assignment.dueTime) && (
                            <p className="text-xs text-red-500 font-medium mt-1">
                              กำหนดส่ง: {item.assignment.dueDate ? new Date(item.assignment.dueDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                              {item.assignment.dueTime && ` เวลา ${item.assignment.dueTime}`}
                            </p>
                          )}
                        </div>
                        <Badge variant="destructive">ยังไม่ส่ง</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
