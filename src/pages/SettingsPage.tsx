import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash, Plus, Save, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  getPeriodConfigs, savePeriodConfigs,
  getGradeConfigs, saveGradeConfigs
} from '@/lib/services';
import { PeriodConfig, GradeConfig } from '@/lib/types';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [periodConfigs, setPeriodConfigs] = useState<PeriodConfig[]>([]);
  const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [periods, grades] = await Promise.all([
        getPeriodConfigs(),
        getGradeConfigs()
      ]);

      // Default period config if empty
      if (periods.length === 0) {
        setPeriodConfigs(Array.from({ length: 8 }, (_, i) => ({
          id: `p-${i + 1}`,
          periodNumber: i + 1,
          startTime: `${8 + i}:00`.padStart(5, '0'),
          endTime: `${9 + i}:00`.padStart(5, '0')
        })));
      } else {
        setPeriodConfigs(periods.sort((a, b) => a.periodNumber - b.periodNumber));
      }

      // Default grade config if empty
      if (grades.length === 0) {
        setGradeConfigs([
          { grade: '4', minScore: 80, maxScore: 100 },
          { grade: '3.5', minScore: 75, maxScore: 79 },
          { grade: '3', minScore: 70, maxScore: 74 },
          { grade: '2.5', minScore: 65, maxScore: 69 },
          { grade: '2', minScore: 60, maxScore: 64 },
          { grade: '1.5', minScore: 55, maxScore: 59 },
          { grade: '1', minScore: 50, maxScore: 54 },
          { grade: '0', minScore: 0, maxScore: 49 }
        ]);
      } else {
        setGradeConfigs(grades.sort((a, b) => b.minScore - a.minScore));
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSavePeriods = async () => {
    try {
      await savePeriodConfigs(periodConfigs);
      toast({ title: "บันทึกสำเร็จ", description: "บันทึกเวลาเรียนแล้ว" });
    } catch (e) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const handleSaveGrades = async () => {
    try {
      await saveGradeConfigs(gradeConfigs);
      toast({ title: "บันทึกสำเร็จ", description: "บันทึกเกณฑ์เกรดแล้ว" });
    } catch (e) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const addPeriod = () => {
    const nextNum = periodConfigs.length + 1;
    setPeriodConfigs([...periodConfigs, {
      id: `p-${nextNum}`,
      periodNumber: nextNum,
      startTime: `${7 + nextNum}:00`.padStart(5, '0'),
      endTime: `${8 + nextNum}:00`.padStart(5, '0')
    }]);
  };

  const deletePeriod = (index: number) => {
    setPeriodConfigs(periodConfigs.filter((_, i) => i !== index));
  };

  const updatePeriod = (index: number, field: keyof PeriodConfig, value: string) => {
    const updated = [...periodConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setPeriodConfigs(updated);
  };

  const addGrade = () => {
    setGradeConfigs([...gradeConfigs, { grade: '', minScore: 0, maxScore: 0 }]);
  };

  const deleteGrade = (index: number) => {
    setGradeConfigs(gradeConfigs.filter((_, i) => i !== index));
  };

  const updateGrade = (index: number, field: keyof GradeConfig, value: string | number) => {
    const updated = [...gradeConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setGradeConfigs(updated);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่าระบบ</h1>
        <p className="text-sm text-muted-foreground">จัดการเวลาเรียนและเกณฑ์การตัดเกรด</p>
      </div>

      <Tabs defaultValue="timetable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timetable">เวลาเรียน (Timetable)</TabsTrigger>
          <TabsTrigger value="grading">เกณฑ์การตัดเกรด (Grading)</TabsTrigger>
        </TabsList>

        <TabsContent value="timetable" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>กำหนดเวลาเรียนในแต่ละคาบ</CardTitle>
              <CardDescription>ตั้งค่าช่วงเวลาสำหรับแต่ละคาบเรียน (เป็นการตั้งค่าทั่วไป ไม่แยกตามเทอม)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {periodConfigs.map((period, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label>คาบที่ {period.periodNumber}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => updatePeriod(index, 'startTime', e.target.value)}
                      />
                      <span className="flex items-center">-</span>
                      <Input
                        type="time"
                        value={period.endTime}
                        onChange={(e) => updatePeriod(index, 'endTime', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deletePeriod(index)}>
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={addPeriod}>
                  <Plus className="mr-1.5 h-4 w-4" /> เพิ่มคาบเรียน
                </Button>
                <Button onClick={handleSavePeriods}>
                  <Save className="mr-1.5 h-4 w-4" /> บันทึก
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>เกณฑ์การตัดเกรด</CardTitle>
              <CardDescription>กำหนดค่าคะแนนขั้นต่ำและสูงสุดสำหรับแต่ละเกรด (เป็นการตั้งค่าทั่วไป ไม่แยกตามเทอม)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gradeConfigs.map((grade, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label>เกรด</Label>
                    <Input
                      value={grade.grade}
                      onChange={(e) => updateGrade(index, 'grade', e.target.value)}
                      placeholder="เช่น 4, 3.5, 3"
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label>คะแนนต่ำสุด</Label>
                    <Input
                      type="number"
                      value={grade.minScore}
                      onChange={(e) => updateGrade(index, 'minScore', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label>คะแนนสูงสุด</Label>
                    <Input
                      type="number"
                      value={grade.maxScore}
                      onChange={(e) => updateGrade(index, 'maxScore', parseInt(e.target.value))}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteGrade(index)}>
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={addGrade}>
                  <Plus className="mr-1.5 h-4 w-4" /> เพิ่มเกรด
                </Button>
                <Button onClick={handleSaveGrades}>
                  <Save className="mr-1.5 h-4 w-4" /> บันทึก
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
