import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/lib/termContext';
import { getSubjects, getAttendanceRecords, getClassrooms } from '@/lib/services';
import { Subject, AttendanceRecord, STATUS_CONFIG, AttendanceStatus, Classroom } from '@/lib/types';
import { Search, Filter, MapPin, Loader2, Download, GraduationCap, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AttendanceHistoryPage() {
    const { currentUser } = useAuth();
    const { activeTerm } = useTerm();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (currentUser?.studentId && activeTerm) {
            loadData();
        }
    }, [currentUser, activeTerm]);

    useEffect(() => {
        filterData();
    }, [records, searchQuery, selectedSubject, startDate, endDate]);

    async function loadData() {
        setLoading(true);
        try {
            const [allAttendance, allSubjects, allClassrooms] = await Promise.all([
                getAttendanceRecords(activeTerm!.id, { studentId: currentUser!.studentId }),
                getSubjects(activeTerm!.id),
                getClassrooms(activeTerm!.id)
            ]);
            setRecords(allAttendance.sort((a, b) => b.date.localeCompare(a.date)));
            setSubjects(allSubjects);
            setClassrooms(allClassrooms);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    }

    function filterData() {
        let filtered = records;

        if (selectedSubject !== 'all') {
            filtered = filtered.filter(r => r.subjectId === selectedSubject);
        }

        if (startDate) {
            filtered = filtered.filter(r => r.date >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter(r => r.date <= endDate);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(r => {
                const subject = subjects.find(s => s.id === r.subjectId);
                return (
                    subject?.name.toLowerCase().includes(q) ||
                    subject?.code.toLowerCase().includes(q) ||
                    r.note?.toLowerCase().includes(q)
                );
            });
        }

        setFilteredRecords(filtered);
    }

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">ประวัติการเข้าเรียน</h1>
                    <p className="text-sm text-muted-foreground">ตรวจสอบประวัติการเช็คชื่อทั้งหมดของคุณ</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาวิชาหรือหมายเหตุ..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger>
                                <SelectValue placeholder="ทุกวิชา" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกวิชา</SelectItem>
                                {subjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-2">
                            <div className="space-y-1 w-[140px]">
                                <label className="text-[10px] font-bold uppercase text-primary/60 ml-1">จากวันที่</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="date"
                                        className="h-9 pl-9 text-[11px] bg-background rounded-xl border-muted-foreground/20 focus:ring-1 focus:ring-primary/20 shadow-sm w-full"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 w-[140px]">
                                <label className="text-[10px] font-bold uppercase text-primary/60 ml-1">ถึงวันที่</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="date"
                                        className="h-9 pl-9 text-[11px] bg-background rounded-xl border-muted-foreground/20 focus:ring-1 focus:ring-primary/20 shadow-sm w-full"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Records List */}
            <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            ไม่พบข้อมูลประวัติการเช็คชื่อตามเงื่อนไขที่กำหนด
                        </CardContent>
                    </Card>
                ) : (
                    filteredRecords.map(record => {
                        const subject = subjects.find(s => s.id === record.subjectId);
                        const config = STATUS_CONFIG[record.status];
                        return (
                            <Card key={record.id} className="border-none shadow-sm hover:ring-1 hover:ring-primary/20 transition-all">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 h-10 w-10 rounded-lg flex items-center justify-center ${config.bgClass} text-primary-foreground`}>
                                                <span className="text-xl">{config.icon}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold">{subject?.name || 'Unknown'}</p>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    <span>{new Date(record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    <span>•</span>
                                                    <span>คาบที่ {record.period}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <GraduationCap className="h-3 w-3" />
                                                        ห้อง {classrooms.find(c => c.id === record.classroomId)?.name || 'N/A'}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="text-primary/70">{record.checkInTime || 'เช็คโดยครู'}</span>
                                                </div>
                                                {record.location && (
                                                    <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-1">
                                                        <MapPin className="h-3 w-3" />
                                                        <span>บันทึกพิกัด GPS แล้ว</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className={`${config.bgClass} h-6 text-black border-opacity-50`}>
                                                {config.label}
                                            </Badge>
                                            {record.note && (
                                                <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] truncate">
                                                    {record.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
