import { useState, useEffect } from 'react';
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
      // Need updating service to handle update
      // Services.ts updated to handle schedules in updateSubject
      const { updateSubject } = await import('@/lib/services');
      await updateSubject(id, { ...subject, termId: activeTerm?.id }); // Ensure termId is passed
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการรายวิชา</h1>
          <p className="text-sm text-muted-foreground">เพิ่ม แก้ไข และจัดการรายวิชา</p>
        </div>
        <SubjectDialog classrooms={classrooms} periods={periods} onSave={handleAddSubject} />
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              ไม่พบข้อมูลรายวิชา
            </div>
          )}
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="border-0 shadow-sm transition-shadow hover:shadow-md cursor-pointer hover:bg-secondary/10"
              onClick={() => navigate(`/subjects/${subject.id}`)}
            >
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <EditSubjectDialog
                      subject={subject}
                      classrooms={classrooms}
                      onSave={handleEditSubject}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteSubject(subject.id, e)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{subject.code}</p>
                <h3 className="mt-0.5 text-base font-semibold">{subject.name}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {subject.classrooms.map((cId) => {
                    const classroom = classrooms.find((c) => c.id === cId);
                    return (
                      <Badge key={cId} variant="secondary" className="text-xs">
                        {classroom ? classroom.name : cId}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
