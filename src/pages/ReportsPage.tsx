import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTerm } from '@/lib/termContext';
import { getAttendanceRecords, getSubjects, getClassrooms, getStudents, updateAttendanceRecord, deleteAttendanceRecord } from '@/lib/services';
import { AttendanceRecord, Subject, Classroom, Student, AttendanceStatus, STATUS_CONFIG } from '@/lib/types';
import { format as formatDate, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Loader2, Save, PenLine, Filter, X, Eye, ArrowUpDown, Trash, Download, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ReportsPage() {
  const { activeTerm } = useTerm();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Data
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(''); // Default empty to show Grid View
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing State (List View)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus | null>(null);

  useEffect(() => {
    if (activeTerm) {
      loadInitialData();
      // Default select today is REMOVED to satisfy "if date not selected, show all"
      // But we can let user choose. Initial state is empty.
    }
  }, [activeTerm]);

  useEffect(() => {
    if (activeTerm) {
      loadAttendance();
    }
  }, [activeTerm, selectedDate, selectedSubject, selectedClassroom]);

  async function loadInitialData() {
    if (!activeTerm) return;
    try {
      const [subs, classes, studs] = await Promise.all([
        getSubjects(activeTerm.id),
        getClassrooms(activeTerm.id),
        getStudents(activeTerm.id)
      ]);
      setSubjects(subs);
      setClassrooms(classes);
      setStudents(studs);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadAttendance() {
    if (!activeTerm) return;
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedDate) filters.date = selectedDate;
      if (selectedSubject !== 'all') filters.subjectId = selectedSubject;
      if (selectedClassroom !== 'all') filters.classroomId = selectedClassroom;

      const records = await getAttendanceRecords(activeTerm.id, filters);

      // Sort by Date (desc) -> Period -> Room
      records.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.period - b.period;
      });

      setAttendanceData(records);
    } catch (error) {
      console.error(error);
      toast({ title: "เกิดข้อผิดพลาดในการโหลดข้อมูล", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const clearFilters = () => {
    setSelectedDate('');
    setSelectedSubject('all');
    setSelectedClassroom('all');
    setSearchQuery('');
  };

  // --- Helper Functions ---
  const getStudentName = (id: string) => students.find(s => s.id === id)?.fullName || 'Unknown';
  const getStudentCode = (id: string) => students.find(s => s.id === id)?.studentCode || '-';
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown Subject';
  const getClassroomName = (id: string) => classrooms.find(c => c.id === id)?.name || 'Unknown Classroom';
  const getStatusInfo = (status: AttendanceStatus) => STATUS_CONFIG[status] || STATUS_CONFIG['present'];

  const formatDisplayDate = (dateStr: string) => {
    try {
      return formatDate(parseISO(dateStr), 'd MMM yy', { locale: th });
    } catch (e) {
      return dateStr;
    }
  };

  // --- Grid View Logic (Memoized) ---
  const gridViewData = useMemo(() => {
    if (selectedDate) return null; // Only for "All Dates" view

    // 1. Get Unique Dates (Sorted ASC for Columns)
    const uniqueDates = Array.from(new Set(attendanceData.map(r => r.date))).sort();

    // Find selected subject info used for filtering students by eligible classrooms
    const currentSubject = subjects.find(s => s.id === selectedSubject);

    // 2. Filter Students
    const filteredStudents = students.filter(s => {
      // A. Filter by Explicit Classroom Selection
      if (selectedClassroom !== 'all' && s.classroomId !== selectedClassroom) {
        return false;
      }

      // B. Filter by Subject's Classrooms (If subject is selected)
      // Only show students who are in classrooms that learn this subject
      if (selectedSubject !== 'all' && currentSubject) {
        if (!currentSubject.classrooms.includes(s.classroomId)) {
          return false;
        }
      }

      // C. Filter by Search Query
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(lowerQuery);
        const matchCode = s.studentCode.toLowerCase().includes(lowerQuery);
        if (!matchName && !matchCode) return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.classroomId !== b.classroomId) return a.classroomId.localeCompare(b.classroomId);
      return a.studentCode.localeCompare(b.studentCode);
    });

    // 3. Map Attendance: studentId -> date -> records[]
    const map: Record<string, Record<string, AttendanceRecord[]>> = {};

    attendanceData.forEach(record => {
      if (!map[record.studentId]) map[record.studentId] = {};
      if (!map[record.studentId][record.date]) map[record.studentId][record.date] = [];
      map[record.studentId][record.date].push(record);
    });

    return { uniqueDates, filteredStudents, map };
  }, [attendanceData, students, selectedClassroom, selectedSubject, selectedDate, subjects, searchQuery]);


  // Determine Status Priority for Grid Cell (Absent > Sick > Leave > Late > Present)
  const getWorstStatus = (records: AttendanceRecord[]): AttendanceStatus => {
    if (records.some(r => r.status === 'absent')) return 'absent';
    if (records.some(r => r.status === 'sick')) return 'sick';
    if (records.some(r => r.status === 'leave')) return 'leave';
    if (records.some(r => r.status === 'late')) return 'late';
    if (records.some(r => r.status === 'activity')) return 'activity';
    return 'present';
  };

  // --- List View Handlers ---
  const handleEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setEditStatus(record.status);
  };

  const handleSave = async (id: string) => {
    if (!editStatus) return;
    try {
      await updateAttendanceRecord(id, { status: editStatus });
      toast({ title: "บันทึกการแก้ไขเรียบร้อย" });
      setEditingId(null);
      setEditStatus(null);
      setAttendanceData(prev => prev.map(r => r.id === id ? { ...r, status: editStatus } : r));
    } catch (error) {
      toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStatus(null);
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการเช็คชื่อนี้?')) return;
    try {
      await deleteAttendanceRecord(id);
      toast({ title: 'ลบรายการเช็คชื่อเรียบร้อยแล้ว' });
      setAttendanceData(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      toast({ title: 'ไม่สามารถลบรายการได้', variant: 'destructive' });
    }
  };

  // Calculate Summary
  const summary: Record<string, number> = {};
  attendanceData.forEach(curr => {
    const s = curr.status;
    summary[s] = (summary[s] || 0) + 1;
  });

  // Validated Data for List View (Filtered by Search)
  const filteredAttendanceList = attendanceData.filter(record => {
    if (!searchQuery) return true;
    const student = students.find(s => s.id === record.studentId);
    if (!student) return false;
    const lowerQuery = searchQuery.toLowerCase();
    return student.fullName.toLowerCase().includes(lowerQuery) ||
      student.studentCode.toLowerCase().includes(lowerQuery);
  });

  const handleExport = () => {
    if (!gridViewData && !selectedDate) return; // If gridViewData is null and no specific date is selected, there's nothing to export.

    let csvContent = "";

    if (!selectedDate) {
      // --- Export Grid View ---
      const headers = ['ลำดับ', 'รหัสนักเรียน', 'ชื่อ-สกุล', ...gridViewData.uniqueDates.map(d => formatDisplayDate(d)), 'มา', 'สาย', 'ลา', 'ป่วย', 'ขาด', 'กิจกรรม'].join(',');
      csvContent += "\uFEFF" + headers + "\n"; // Add BOM

      gridViewData.filteredStudents.forEach((student, index) => {
        const row = [
          index + 1,
          `"${student.studentCode}"`, // Quote to prevent Excel formating as number
          `"${student.fullName}"`
        ];

        const stats = { present: 0, late: 0, leave: 0, sick: 0, absent: 0, activity: 0 };

        // Dates
        gridViewData.uniqueDates.forEach(date => {
          const records = gridViewData.map[student.id]?.[date] || [];
          if (records.length > 0) {
            const worstStatus = getWorstStatus(records);
            stats[worstStatus as keyof typeof stats] = (stats[worstStatus as keyof typeof stats] || 0) + 1;
            const label = getStatusInfo(worstStatus).label;
            // Add note if exists
            const note = records.map(r => r.note).filter(Boolean).join(' ');
            row.push(`"${label}${note ? ` (${note})` : ''}"`);
          } else {
            row.push("-");
          }
        });

        // Summary Stats
        row.push(stats.present, stats.late, stats.leave, stats.sick, stats.absent, stats.activity);

        csvContent += row.join(',') + "\n";
      });

    } else {
      // --- Export List View ---
      const headers = ['วันที่', 'รหัสนักเรียน', 'ชื่อ-สกุล', 'วิชา', 'ห้องเรียน', 'สถานะ', 'หมายเหตุ', 'พิกัด GPS'].join(',');
      csvContent += "\uFEFF" + headers + "\n";

      filteredAttendanceList.forEach(record => {
        const lat = record.location?.latitude ?? (record.location as any)?.lat;
        const lng = record.location?.longitude ?? (record.location as any)?.lng;
        const locationStr = lat !== undefined && lng !== undefined ? `${lat},${lng}` : '';
        const row = [
          `"${formatDisplayDate(record.date)}"`,
          `"${getStudentCode(record.studentId)}"`,
          `"${getStudentName(record.studentId)}"`,
          `"${getSubjectName(record.subjectId)}"`,
          `"${getClassroomName(record.classroomId)}"`,
          `"${getStatusInfo(record.status).label}"`,
          `"${record.note || ''}"`,
          `"${locationStr}"`
        ];
        csvContent += row.join(',') + "\n";
      });
    }

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">รายงานและสถิติ (Reports)</h1>
          <p className="text-sm text-muted-foreground">ดูสรุปและแก้ไขข้อมูลการเช็คชื่อ</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> ตัวเลือกการแสดงผล
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1 w-[150px]">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">วันที่</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  className="h-9 pl-9 text-[11px] bg-background rounded-lg border-muted-foreground/20"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ห้องเรียน</label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {classrooms.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">วิชา</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {subjects.map(s => {
                    const roomNames = s.classrooms
                      ?.map(id => classrooms.find(c => c.id === id)?.name)
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code}) {roomNames ? `- ห้อง ${roomNames}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ค้นหา</label>
              <Input
                placeholder="ชื่อ หรือ รหัสนักเรียน..."
                className="w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={clearFilters} className="w-full">
              ล้างตัวกรอง
            </Button>
            <Button variant="default" onClick={handleExport} className="w-full lg:col-span-3 bg-green-600 hover:bg-green-700 text-white">
              <Download className="mr-2 h-4 w-4" /> ส่งออก Excel (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="list">
            {selectedDate ? `รายการเช็คชื่อ (${filteredAttendanceList.length})` : 'ตารางสรุปการเข้าเรียน'}
          </TabsTrigger>
          <TabsTrigger value="summary">สรุปสถิติ</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 pt-2">
          <Card>
            <CardContent className="p-0 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
              ) : !selectedDate && gridViewData ? (
                // --- GRID VIEW (All Dates) ---
                <div className="relative">
                  <ScrollArea className="w-full h-[600px]">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[80px] sticky left-0 z-20 bg-muted/90 border-r text-center font-bold">ลำดับ</TableHead>
                            <TableHead className="w-[200px] sticky left-[80px] z-20 bg-muted/90 border-r font-bold">ชื่อ-สกุล</TableHead>
                            {gridViewData.uniqueDates.length === 0 && <TableHead className="text-center text-muted-foreground w-full">ไม่มีข้อมูลการเช็คชื่อ</TableHead>}
                            {gridViewData.uniqueDates.map(date => (
                              <TableHead
                                key={date}
                                className="text-center min-w-[70px] border-r p-1 hover:bg-muted/80 cursor-pointer transition-colors"
                                onClick={() => setSelectedDate(date)}
                                title="คลิกเพื่อดูรายละเอียดรายวัน"
                              >
                                <div className="flex flex-col items-center justify-center text-xs py-1">
                                  <span className="font-semibold text-primary">{formatDisplayDate(date).split(' ')[0]}</span>
                                  <span className="text-[10px] text-muted-foreground">{formatDisplayDate(date).split(' ').slice(1).join(' ')}</span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="min-w-[100px] text-center font-bold">รวมมา/ขาด</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gridViewData.filteredStudents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={gridViewData.uniqueDates.length + 3} className="text-center h-32 text-muted-foreground">
                                ไม่พบนักเรียน
                              </TableCell>
                            </TableRow>
                          ) : gridViewData.filteredStudents.map((student, idx) => {
                            const summaryStats = { present: 0, absent: 0, late: 0, other: 0 };

                            return (
                              <TableRow key={student.id} className="hover:bg-muted/10">
                                <TableCell className="sticky left-0 z-10 bg-background border-r text-center font-mono text-xs text-muted-foreground">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="sticky left-[80px] z-10 bg-background border-r font-medium text-sm">
                                  <div className="flex flex-col">
                                    <span>{student.fullName}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{student.studentCode}</span>
                                  </div>
                                </TableCell>

                                {gridViewData.uniqueDates.map(date => {
                                  const dayRecords = gridViewData.map[student.id]?.[date] || [];

                                  let content = <span className="text-gray-200 text-xs">-</span>;

                                  if (dayRecords.length > 0) {
                                    const worstStatus = getWorstStatus(dayRecords);
                                    const statusInfo = getStatusInfo(worstStatus);

                                    // Count stats
                                    if (worstStatus === 'present') summaryStats.present++;
                                    else if (worstStatus === 'absent') summaryStats.absent++;
                                    else if (worstStatus === 'late') summaryStats.late++;
                                    else summaryStats.other++;

                                    const notePreview = dayRecords.map(r => r.note).filter(Boolean).join(', ');

                                    // If multiple periods, show count badge? No, keep simple dot.
                                    content = (
                                      <div className="flex flex-col items-center">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${statusInfo.bgClass} cursor-default relative group`}>
                                                <span className={`${statusInfo.color.replace('bg-', 'text-')} font-bold text-xs`}>
                                                  {statusInfo.icon}
                                                </span>
                                                {dayRecords.some(r => r.location || (r as any).lat) && (
                                                  <div className="absolute -top-1 -right-1">
                                                    <MapPin className="h-2.5 w-2.5 text-blue-500 fill-blue-500" />
                                                  </div>
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{statusInfo.label} ({dayRecords.length} คาบ)</p>
                                              {dayRecords.some(r => r.location || (r as any).lat) && (
                                                <p className="text-[10px] text-blue-600 font-medium">✓ มีข้อมูลพิกัด GPS</p>
                                              )}
                                              {notePreview && <p className="text-xs text-muted-foreground mt-1 max-w-[200px] break-words">หมายเหตุ: {notePreview}</p>}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        {notePreview && (
                                          <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[60px] truncate text-center leading-tight" title={notePreview}>
                                            {notePreview}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <TableCell key={date} className="text-center p-1 border-r h-12">
                                      {content}
                                    </TableCell>
                                  );
                                })}

                                <TableCell className="text-center text-xs">
                                  <div className="flex flex-col gap-1 items-center justify-center">
                                    <span className="text-green-600 font-medium">{summaryStats.present}</span>
                                    {summaryStats.absent > 0 && <span className="text-red-500 font-medium">-{summaryStats.absent}</span>}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              ) : (
                // --- LIST VIEW (Selected Date) ---
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[140px] whitespace-nowrap">วัน/เวลา</TableHead>
                        <TableHead className="w-[100px] whitespace-nowrap">รหัสนักเรียน</TableHead>
                        <TableHead className="min-w-[150px] whitespace-nowrap">ชื่อ-สกุล</TableHead>
                        <TableHead className="whitespace-nowrap">วิชา</TableHead>
                        <TableHead className="whitespace-nowrap">ห้อง</TableHead>
                        <TableHead className="w-[120px] whitespace-nowrap">สถานะ</TableHead>
                        <TableHead className="whitespace-nowrap">หมายเหตุ</TableHead>
                        <TableHead className="whitespace-nowrap">พิกัด (GPS)</TableHead>
                        <TableHead className="text-right w-[100px] whitespace-nowrap">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendanceList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                            ไม่พบข้อมูลการเช็คชื่อตามเงื่อนไขที่เลือก
                          </TableCell>
                        </TableRow>
                      ) : filteredAttendanceList.map((record) => {
                        const statusInfo = getStatusInfo(record.status);
                        const isEditing = editingId === record.id;
                        const dateDisplay = formatDisplayDate(record.date);

                        return (
                          <TableRow key={record.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs">
                              <span className="font-semibold">{dateDisplay}</span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{getStudentCode(record.studentId)}</TableCell>
                            <TableCell className="font-medium">{getStudentName(record.studentId)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{getSubjectName(record.subjectId)}</TableCell>
                            <TableCell className="text-xs">{getClassroomName(record.classroomId)}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Select
                                  value={editStatus || record.status}
                                  onValueChange={(val) => setEditStatus(val as AttendanceStatus)}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                      <SelectItem key={key} value={key}>
                                        <span className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${config.dotClass}`}></span>
                                          {config.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className={`${statusInfo.bgClass} text-xs font-bold text-black border-opacity-50`}>
                                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${statusInfo.dotClass}`}></span>
                                  {statusInfo.label}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={record.note}>
                              {record.note || '-'}
                            </TableCell>
                            <TableCell className="text-[10px] py-1 font-mono leading-tight">
                              {record.location ? (
                                <div className="flex flex-col text-blue-700 bg-blue-50/50 p-1.5 rounded-md border border-blue-100">
                                  <div className="flex items-center gap-1 font-bold mb-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>GPS</span>
                                  </div>
                                  <span>L: {record.location.latitude ?? (record.location as any).lat}</span>
                                  <span>G: {record.location.longitude ?? (record.location as any).lng}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="default" onClick={() => handleSave(record.id)} className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white">
                                    <Save className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => handleEdit(record)} className="h-7 w-7 text-muted-foreground hover:bg-muted">
                                    <PenLine className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => handleDeleteRecord(record.id, e)}
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="pt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = summary[key] || 0;
              const total = attendanceData.length;
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

              return (
                <Card key={key} className={`border-l-4 ${config.bgClass.replace('bg-', 'bg-opacity-30 ')}`} style={{ borderLeftColor: config.dotClass.replace('bg-', 'var(--') }}>
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-3xl mb-3 p-2 bg-white rounded-full shadow-sm">{config.icon}</div>
                    <h3 className="font-bold text-lg text-black">{config.label}</h3>
                    <div className="text-4xl font-bold mt-2 text-black">{count}</div>
                    <p className="text-xs text-muted-foreground mt-1 text-center bg-white/50 px-2 py-0.5 rounded-full font-bold">{percentage}%</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
