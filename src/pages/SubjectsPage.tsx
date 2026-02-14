import {

  useState, useEffect
} from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash, BookOpen, Loader2 } from 'lucide-react';
import { getSubjects, getClassrooms, addSubject, deleteSubject, getPeriodConfigs } from '@/lib/services';
import { Subject, Classroom, PeriodConfig } from '@/lib/types';
import { SubjectDialog } from '@/components/SubjectDialog';
import { EditSubjectDialog } from '@/components/EditSubjectDialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useTerm } from '@/lib/termContext';

export default function SubjectsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { activeTerm } = useTerm();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [periods, setPeriods] = useState<PeriodConfig[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!activeTerm) return;

    try {
      const [subs, classes, prds] = await Promise.all([
        getSubjects(activeTerm.id),
        getClassrooms(activeTerm.id),
        getPeriodConfigs()
      ]);
      setSubjects(subs);
      setClassrooms(classes);
      setPeriods(prds);
    } catch (e) {
      console.error("Failed to load subjects data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTerm) {
      loadData();
    }
  }, [activeTerm]);

  const handleAddSubject = async (subject: Omit<Subject, 'id'>) => {
    try {
      await addSubject(subject);
      toast({ title: 'สำเร็จ', description: 'เพิ่มรายวิชาเรียบร้อยแล้ว' });
      loadData();
    } catch (error) {
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถเพิ่มรายวิชาได้', variant: 'destructive' });
    }
  };

  const handleEditSubject = async (id: string, subject: Partial<Subject>) => {
    try {
      const { updateSubject } = await import('@/lib/services');
      await updateSubject(id, { ...subject, termId: activeTerm?.id });
      toast({ title: 'สำเร็จ', description: 'แก้ไขรายวิชาเรียบร้อยแล้ว' });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถแก้ไขรายวิชาได้', variant: 'destructive' });
    }
  };

  const handleDeleteSubject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายวิชานี้? ข้อมูลการเช็คชื่ออาจหายไป')) return;
    try {
      await deleteSubject(id);
      toast({ title: 'สำเร็จ', description: 'ลบรายวิชาเรียบร้อยแล้ว' });
      loadData();
    } catch (error) {
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถลบรายวิชาได้', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">จัดการรายวิชา</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">เพิ่ม แก้ไข และจัดการรายวิชาทั้งหมด</p>
        </div>
        <SubjectDialog classrooms={classrooms} periods={periods} onSave={handleAddSubject} />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30" />
              </div>
              <p className="text-base sm:text-lg font-bold text-muted-foreground">ยังไม่มีรายวิชา</p>
              <p className="text-xs sm:text-sm text-muted-foreground/70 mt-2 max-w-sm">เริ่มต้นด้วยการเพิ่มรายวิชาใหม่โดยคลิกปุ่มด้านบน</p>
            </div>
          ) : (
            <>
              {/* Stats Badge */}
              <div className="flex items-center gap-2 px-1 mb-2">
                <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                  ทั้งหมด <span className="text-primary">{subjects.length}</span> รายวิชา
                </p>
              </div>

              {/* Subject Grid */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                  <Card
                    key={subject.id}
                    className="border-0 shadow-sm transition-all hover:shadow-lg cursor-pointer group overflow-hidden active:scale-[0.98]"
                  >
                    <div onClick={() => navigate(`/subjects/${subject.id}`)}>
                      <CardContent className="p-4 sm:p-5">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <EditSubjectDialog
                              subject={subject}
                              classrooms={classrooms}
                              onSave={handleEditSubject}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDeleteSubject(subject.id, e)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">{subject.code}</p>
                          <h3 className="text-sm sm:text-base font-bold group-hover:text-primary transition-colors line-clamp-2">{subject.name}</h3>
                        </div>
                        {subject.teachers && subject.teachers.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            <span className="font-medium">อาจารย์:</span> {subject.teachers.join(', ')}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {subject.classrooms.slice(0, 3).map((cId) => {
                            const classroom = classrooms.find((c) => c.id === cId);
                            return (
                              <Badge key={cId} variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5">
                                {classroom ? classroom.name : cId}
                              </Badge>
                            );
                          })}
                          {subject.classrooms.length > 3 && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0.5">
                              +{subject.classrooms.length - 3}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
