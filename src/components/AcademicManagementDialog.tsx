import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    getAcademicYears,
    getTerms,
    addAcademicYear,
    addTerm,
    setActiveAcademicYear,
    setActiveTerm,
    deleteAcademicYear,
    deleteTerm,
} from '@/lib/services';
import { AcademicYear, Term } from '@/lib/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function AcademicManagementDialog() {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [loading, setLoading] = useState(false);

    // Academic Year form
    const [newYear, setNewYear] = useState('');

    // Term form
    const [termYear, setTermYear] = useState('');
    const [termSemester, setTermSemester] = useState('');
    const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [yearsData, termsData] = await Promise.all([
                getAcademicYears(),
                getTerms(),
            ]);
            setAcademicYears(yearsData);
            setTerms(termsData);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถโหลดข้อมูลได้',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddAcademicYear = async () => {
        if (!newYear.trim()) {
            toast({
                title: 'กรุณากรอกข้อมูล',
                description: 'กรุณากรอกปีการศึกษา',
                variant: 'destructive',
            });
            return;
        }

        try {
            await addAcademicYear({
                year: newYear,
                name: `ปีการศึกษา ${newYear}`,
                isActive: academicYears.length === 0, // First year is active by default
                createdAt: new Date().toISOString(),
            });

            toast({ title: 'สำเร็จ', description: 'เพิ่มปีการศึกษาเรียบร้อยแล้ว' });
            setNewYear('');
            loadData();
        } catch (error) {
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถเพิ่มปีการศึกษาได้',
                variant: 'destructive',
            });
        }
    };

    const handleAddTerm = async () => {
        if (!termYear.trim() || !termSemester.trim()) {
            toast({
                title: 'กรุณากรอกข้อมูล',
                description: 'กรุณากรอกปีการศึกษาและเทอม',
                variant: 'destructive',
            });
            return;
        }

        try {
            const termName = `ภาคเรียนที่ ${termSemester}/${termYear}`;

            await addTerm({
                name: termName,
                semester: termSemester,
                academicYearId: selectedAcademicYear || undefined,
                isActive: terms.length === 0, // First term is active by default
                createdAt: new Date().toISOString(),
            });

            toast({ title: 'สำเร็จ', description: 'เพิ่มเทอมเรียบร้อยแล้ว' });
            setTermYear('');
            setTermSemester('');
            setSelectedAcademicYear('');
            await loadData();

            // Notify TermSelector to reload after data is loaded
            window.dispatchEvent(new Event('termsUpdated'));
        } catch (error) {
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถเพิ่มเทอมได้',
                variant: 'destructive',
            });
        }
    };

    const handleSetActiveYear = async (id: string) => {
        try {
            await setActiveAcademicYear(id);
            toast({ title: 'สำเร็จ', description: 'เปลี่ยนปีการศึกษาที่ใช้งานแล้ว' });
            loadData();
        } catch (error) {
            toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
        }
    };

    const handleSetActiveTerm = async (id: string) => {
        try {
            await setActiveTerm(id);
            toast({ title: 'สำเร็จ', description: 'เปลี่ยนเทอมที่ใช้งานแล้ว' });
            await loadData();

            // Notify TermSelector to reload after data is loaded
            window.dispatchEvent(new Event('termsUpdated'));
        } catch (error) {
            toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
        }
    };

    const handleDeleteYear = async (id: string, year: string) => {
        if (!confirm(`ต้องการลบปีการศึกษา ${year} หรือไม่?`)) return;

        try {
            await deleteAcademicYear(id);
            toast({ title: 'สำเร็จ', description: 'ลบปีการศึกษาแล้ว' });
            loadData();
        } catch (error) {
            toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
        }
    };

    const handleDeleteTerm = async (id: string, name: string) => {
        if (
            !confirm(
                `⚠️ คำเตือน!\n\nการลบเทอม "${name}" จะลบข้อมูลทั้งหมด ได้แก่:\n- นักเรียน\n- ห้องเรียน\n- วิชา\n- งานที่มอบหมาย\n- คะแนน\n- บันทึกการเช็คชื่อ\n\nต้องการดำเนินการต่อหรือไม่?`
            )
        )
            return;

        try {
            const result = await deleteTerm(id);
            toast({
                title: 'สำเร็จ',
                description: `ลบเทอมและข้อมูล ${result.deletedCounts?.students || 0} คน แล้ว`,
            });
            await loadData();

            // Notify TermSelector to reload after data is loaded
            window.dispatchEvent(new Event('termsUpdated'));
        } catch (error) {
            toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    จัดการปีการศึกษา/เทอม
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>จัดการปีการศึกษาและเทอม</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="terms" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="terms">เทอม</TabsTrigger>
                        <TabsTrigger value="years">ปีการศึกษา</TabsTrigger>
                    </TabsList>

                    {/* Terms Tab */}
                    <TabsContent value="terms" className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label>ปีการศึกษา</Label>
                                            <Input
                                                placeholder="เช่น 2568"
                                                value={termYear}
                                                onChange={(e) => setTermYear(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>เทอม</Label>
                                            <Select value={termSemester} onValueChange={setTermSemester}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="เลือกเทอม" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1</SelectItem>
                                                    <SelectItem value="2">2</SelectItem>
                                                    <SelectItem value="ฤดูร้อน">ฤดูร้อน</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>ปีการศึกษา (ถ้ามี)</Label>
                                            <Select value={selectedAcademicYear || undefined} onValueChange={setSelectedAcademicYear}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="ไม่เลือก" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {academicYears.map((year) => (
                                                        <SelectItem key={year.id} value={year.id}>
                                                            {year.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button onClick={handleAddTerm} className="w-full">
                                        <Plus className="mr-2 h-4 w-4" />
                                        เพิ่มเทอม
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <h3 className="font-semibold">เทอมทั้งหมด</h3>
                            {terms.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    ยังไม่มีเทอม
                                </p>
                            ) : (
                                terms.map((term) => (
                                    <Card key={term.id}>
                                        <CardContent className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="font-medium">{term.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        เทอม {term.semester}
                                                    </p>
                                                </div>
                                                {term.isActive && (
                                                    <Badge variant="default" className="bg-green-600">
                                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        ใช้งานอยู่
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {!term.isActive && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSetActiveTerm(term.id)}
                                                    >
                                                        ใช้งาน
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteTerm(term.id, term.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Academic Years Tab */}
                    <TabsContent value="years" className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div>
                                        <Label>ปีการศึกษา</Label>
                                        <Input
                                            placeholder="เช่น 2568"
                                            value={newYear}
                                            onChange={(e) => setNewYear(e.target.value)}
                                        />
                                    </div>
                                    <Button onClick={handleAddAcademicYear} className="w-full">
                                        <Plus className="mr-2 h-4 w-4" />
                                        เพิ่มปีการศึกษา
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <h3 className="font-semibold">ปีการศึกษาทั้งหมด</h3>
                            {academicYears.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    ยังไม่มีปีการศึกษา
                                </p>
                            ) : (
                                academicYears.map((year) => (
                                    <Card key={year.id}>
                                        <CardContent className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="font-medium">{year.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        ปี {year.year}
                                                    </p>
                                                </div>
                                                {year.isActive && (
                                                    <Badge variant="default" className="bg-green-600">
                                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        ใช้งานอยู่
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {!year.isActive && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSetActiveYear(year.id)}
                                                    >
                                                        ใช้งาน
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteYear(year.id, year.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
