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
  getGradeConfigs, saveGradeConfigs,
  getSystemSettings, saveSystemSettings,
  getAdmins, addUser, deleteUser
} from '@/lib/services';
import { PeriodConfig, GradeConfig, SystemSettings, AppUser } from '@/lib/types';
import { Globe, UserPlus, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [periodConfigs, setPeriodConfigs] = useState<PeriodConfig[]>([]);
  const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    schoolName: 'School Companion',
    logoUrl: 'https://placehold.co/200x200?text=LOGO'
  });
  const [admins, setAdmins] = useState<AppUser[]>([]);
  const [newAdmin, setNewAdmin] = useState({ name: '', username: '', password: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [periods, grades, settings, adminList] = await Promise.all([
        getPeriodConfigs(),
        getGradeConfigs(),
        getSystemSettings(),
        getAdmins()
      ]);

      if (settings) setSystemSettings(settings);
      setAdmins(adminList);

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
        <TabsList className="grid grid-cols-3 w-full lg:w-[600px]">
          <TabsTrigger value="timetable">เวลาเรียน (Timetable)</TabsTrigger>
          <TabsTrigger value="grading">เกณฑ์การตัดเกรด (Grading)</TabsTrigger>
          <TabsTrigger value="website">จัดการเว็บไซต์ (Website)</TabsTrigger>
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

        <TabsContent value="website" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" /> ข้อมูลทั่วไปของเว็บไซต์
                </CardTitle>
                <CardDescription>จัดการโลโก้และชื่อที่จะแสดงในหน้าต่างระดับสูง</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ชื่อโรงเรียน / ระบบ</Label>
                  <Input
                    value={systemSettings.schoolName}
                    onChange={(e) => setSystemSettings({ ...systemSettings, schoolName: e.target.value })}
                    placeholder="เช่น โรงเรียนสาธิต..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>ลิงก์ Logo (URL)</Label>
                  <div className="flex gap-4">
                    <Input
                      value={systemSettings.logoUrl}
                      onChange={(e) => setSystemSettings({ ...systemSettings, logoUrl: e.target.value })}
                      placeholder="https://..."
                    />
                    <div className="w-12 h-12 border rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {systemSettings.logoUrl && <img src={systemSettings.logoUrl} alt="Preview" className="w-full h-full object-contain" />}
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    setSavingSettings(true);
                    try {
                      await saveSystemSettings(systemSettings);
                      toast({ title: "บันทึกข้อมูลเรียบร้อย" });
                    } catch (e) {
                      toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
                    } finally {
                      setSavingSettings(false);
                    }
                  }}
                  disabled={savingSettings}
                >
                  {savingSettings ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  บันทึกข้อมูลเว็บไซต์
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> จัดการแอดมิน (Admins)
                </CardTitle>
                <CardDescription>เพิ่มหรือลบบัญชีผู้ดูแลระบบ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 p-3 border rounded-lg bg-muted/30">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">เพิ่มแอดมินใหม่</Label>
                  <Input
                    placeholder="ชื่อ-นามสกุล"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Username"
                      value={newAdmin.username}
                      onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!newAdmin.name || !newAdmin.username || !newAdmin.password) return;
                      setAddingAdmin(true);
                      try {
                        await addUser({
                          name: newAdmin.name,
                          username: newAdmin.username,
                          role: 'admin',
                          password: newAdmin.password
                        } as any);
                        toast({ title: "เพิ่มแอดมินเรียบร้อย" });
                        setNewAdmin({ name: '', username: '', password: '' });
                        const updated = await getAdmins();
                        setAdmins(updated);
                      } catch (e) {
                        toast({ title: "เพิ่มไม่สำเร็จ", variant: "destructive" });
                      } finally {
                        setAddingAdmin(false);
                      }
                    }}
                    disabled={addingAdmin}
                  >
                    {addingAdmin ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    เพิ่มแอดมิน
                  </Button>
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium text-xs">{admin.name}</TableCell>
                          <TableCell className="text-xs">{admin.username}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={async () => {
                                if (admin.username === 'admin') {
                                  toast({ title: "ไม่สามารถลบ admin หลักได้", variant: "destructive" });
                                  return;
                                }
                                if (confirm(`ต้องการลบแอดมิน ${admin.name} ใช่หรือไม่?`)) {
                                  await deleteUser(admin.id);
                                  setAdmins(admins.filter(a => a.id !== admin.id));
                                  toast({ title: 'ลบเรียบร้อย' });
                                }
                              }}
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
