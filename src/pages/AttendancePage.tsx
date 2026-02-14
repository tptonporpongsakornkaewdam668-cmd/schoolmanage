import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Search, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentsByClassroom, getClassrooms, getSubjects, saveAttendanceRecords } from '@/lib/services';
import { Student, Classroom, Subject, AttendanceStatus, STATUS_CONFIG } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTerm } from '@/lib/termContext';
import { QuickCheckDialog } from '@/components/QuickCheckDialog';
import { QRAttendanceDialog } from '@/components/QRAttendanceDialog';

const statusKeys: AttendanceStatus[] = ['present', 'late', 'absent', 'leave', 'sick', 'activity', 'online'];

export default function AttendancePage() {
  const { toast } = useToast();
  const { activeTerm } = useTerm();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [loading, setLoading] = useState(true);
  const [isQuickCheckMode, setIsQuickCheckMode] = useState(false);

  // Load Classrooms and Subjects
  useEffect(() => {
    async function loadResources() {
      if (!activeTerm) {
        setLoading(false);
        return;
      }

      try {
        const [cls, sub] = await Promise.all([
          getClassrooms(activeTerm.id),
          getSubjects(activeTerm.id)
        ]);
        setClassrooms(cls);
        setSubjects(sub);
        if (sub.length > 0) setSelectedSubject(sub[0].id);
      } catch (e) {
        console.error("Failed to load resources", e);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, [activeTerm]);

  // Load Students when subject changes
  useEffect(() => {
    if (!selectedSubject) return;

    async function loadStudents() {
      try {
        // Find the selected subject
        const subject = subjects.find(s => s.id === selectedSubject);
        if (!subject || !subject.classrooms || subject.classrooms.length === 0) {
          setStudents([]);
          setAttendanceData({});
          toast({
            title: 'ไม่พบห้องเรียน',
            description: 'วิชานี้ยังไม่ได้กำหนดห้องเรียน',
            variant: 'destructive'
          });
          return;
        }

        // Load students from all classrooms in this subject
        const allStudents = await Promise.all(
          subject.classrooms.map(classroomId => getStudentsByClassroom(classroomId))
        );

        // Flatten and deduplicate students
        const uniqueStudents = allStudents.flat().reduce((acc, student) => {
          if (!acc.find(s => s.id === student.id)) {
            acc.push(student);
          }
          return acc;
        }, [] as Student[]);

        setStudents(uniqueStudents);

        // Initialize attendance data (default present)
        // Only if NOT in quick check mode (or just reset it)
        const initial: Record<string, { status: AttendanceStatus; note: string }> = {};
        uniqueStudents.forEach((s) => {
          initial[s.id] = { status: 'present', note: '' };
        });
        setAttendanceData(initial);
        setIsQuickCheckMode(false); // Reset mode when subject changes
      } catch (e) {
        console.error("Failed to load students", e);
      }
    }
    loadStudents();
  }, [selectedSubject, subjects]);


  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        !searchQuery ||
        s.fullName.includes(searchQuery) ||
        s.studentCode.includes(searchQuery)
    );
  }, [students, searchQuery]);

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      sick: 0,
      activity: 0,
      online: 0,
    };
    students.forEach((s) => {
      let status = attendanceData[s.id]?.status;
      if (!status) {
        if (isQuickCheckMode) return; // Don't count if waiting for quick check
        status = 'present';
      }
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [students, attendanceData, isQuickCheckMode]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData((prev) => {
      const current = prev[studentId] || { status: 'present', note: '' };
      return {
        ...prev,
        [studentId]: { ...current, status },
      };
    });
  };

  const setNote = (studentId: string, note: string) => {
    setAttendanceData((prev) => {
      const current = prev[studentId] || { status: 'present', note: '' };
      return {
        ...prev,
        [studentId]: { ...current, note },
      };
    });
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      toast({ title: 'กรุณาเลือกวิชา', variant: 'destructive' });
      return;
    }

    if (!activeTerm) {
      toast({ title: 'กรุณาเลือกเทอมก่อน', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const records = students.map(student => {
        const data = attendanceData[student.id];
        // If no data (Quick Check mode & unscanned), return null to skip
        if (isQuickCheckMode && !data) return null;

        const recordStatus = data ? data.status : 'present';
        const recordNote = data ? data.note : '';

        return {
          studentId: student.id,
          studentName: student.fullName,
          date: date,
          period: parseInt(selectedPeriod),
          classroomId: student.classroomId,
          subjectId: selectedSubject,
          status: recordStatus,
          note: recordNote,
          termId: activeTerm.id
        };
      }).filter((r): r is NonNullable<typeof r> => r !== null);

      if (records.length === 0) {
        toast({ title: 'ไม่มีข้อมูลให้บันทึก', variant: 'destructive' });
        setSaving(false);
        return;
      }

      await saveAttendanceRecords(records);
      toast({ title: 'บันทึกสำเร็จ', description: 'อัปเดตสถานะเรียบร้อยแล้ว' });

      // Keep mode as is, or reset? User probably wants to stay in loop or reset?
      // Usually after save, we might want to stay to see the results.
      // But clearing "Quick Check Mode" visual state (empty for unset) might be confusing if we just saved "Present".
      // Let's keep it as is.

    } catch (e) {
      console.error(e);
      toast({ title: 'บันทึกไม่สำเร็จ', description: 'เกิดข้อผิดพลาดในการบันทึก', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">เช็คชื่อ</h1>
        <div className="flex gap-2">
          {selectedSubject && (
            <>
              <QRAttendanceDialog
                subject={subjects.find(s => s.id === selectedSubject)!}
                period={parseInt(selectedPeriod)}
              />
              <QuickCheckDialog
                subjectId={selectedSubject}
                subjectName={subjects.find(s => s.id === selectedSubject)?.name || ''}
                period={parseInt(selectedPeriod)}
                students={students}
                onScan={(student, status) => {
                  if (!isQuickCheckMode) {
                    setIsQuickCheckMode(true);
                    setAttendanceData({
                      [student.id]: { status, note: 'เช็คชื่อด่วน' }
                    });
                  } else {
                    setAttendanceData(prev => ({
                      ...prev,
                      [student.id]: { status, note: '' }
                    }));
                  }
                }}
              />
            </>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || students.length === 0}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            อัปเดตสถานะ
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap gap-3 p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...</div>
          ) : (
            <>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="เลือกวิชา" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => {
                    const roomNames = s.classrooms
                      ?.map(id => classrooms.find(c => c.id === id)?.name)
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} - {s.name} {roomNames ? `(ห้อง ${roomNames})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="relative w-[150px]">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  className="h-9 pl-9 text-[11px] bg-background rounded-lg border-muted-foreground/20"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {statusKeys.map((key) => {
          const config = STATUS_CONFIG[key];
          const count = summary[key];
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-black font-bold',
                config.bgClass
              )}
            >
              <div className={cn('h-3 w-3 rounded-full', config.dotClass)} />
              <span className="font-medium">{config.label}</span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหานักเรียน (ชื่อหรือรหัส)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Student List */}
      <Card>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {students.length === 0 ? 'เลือกวิชาเพื่อแสดงรายชื่อนักเรียน' : 'ไม่พบนักเรียน'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredStudents.map((student) => {
                const data = attendanceData[student.id];
                // Display Logic:
                // Normal Mode: data exists (present) -> use data. If somehow undefined, use present.
                // Quick Mode: data exists (scanned) -> use data. If undefined -> EMPTY (null).

                const currentStatus = data ? data.status : (isQuickCheckMode ? null : 'present');
                const currentNote = data ? data.note : '';

                const btnConfig = currentStatus ? STATUS_CONFIG[currentStatus] : null; // For display row summary if needed? No need.

                return (
                  <div key={student.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <p className="font-medium">{student.fullName}</p>
                      <p className="text-sm text-muted-foreground">{student.studentCode}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                      {statusKeys.map((status) => {
                        const btnConfig = STATUS_CONFIG[status];
                        const isActive = currentStatus === status;
                        return (
                          <button
                            key={status}
                            onClick={() => setStatus(student.id, status)}
                            className={cn(
                              'rounded-md border py-1.5 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm transition-all',
                              isActive
                                ? `${btnConfig.bgClass} border-transparent ring-2 ring-primary/20 shadow-sm text-black`
                                : 'border-border bg-background hover:bg-secondary'
                            )}
                          >
                            {btnConfig.label}
                          </button>
                        );
                      })}
                    </div>

                    <Input
                      placeholder="หมายเหตุ..."
                      value={currentNote}
                      onChange={(e) => setNote(student.id, e.target.value)}
                      className="sm:w-[200px]"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
