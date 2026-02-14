import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Bell,
    Trash,
    Loader2,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    Users,
    AlertTriangle,
    Info,
    CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTerm } from "@/lib/termContext";
import {
    getAnnouncements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getClassrooms,
} from "@/lib/services";
import { Announcement, Classroom } from "@/lib/types";
import { AnnouncementDialog } from "@/components/AnnouncementDialog";

export default function AnnouncementsPage() {
    const { toast } = useToast();
    const { activeTerm } = useTerm();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [activeTerm]);

    async function loadData() {
        setLoading(true);
        try {
            const [annData, classData] = await Promise.all([
                getAnnouncements(),
                activeTerm ? getClassrooms(activeTerm.id) : Promise.resolve([]),
            ]);
            setAnnouncements(annData);
            setClassrooms(classData);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast({ title: "ผิดพลาด", description: "โหลดข้อมูลประกาศไม่สำเร็จ", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = async (data: Omit<Announcement, "id">) => {
        try {
            await addAnnouncement(data);
            toast({ title: "สำเร็จ", description: "เพิ่มประกาศแจ้งเตือนเรียบร้อยแล้ว" });
            loadData();
        } catch (e) {
            toast({ title: "ผิดพลาด", description: "ไม่สามารถเพิ่มประกาศได้", variant: "destructive" });
            throw e;
        }
    };

    const handleUpdate = async (data: Announcement) => {
        try {
            const { id, ...rest } = data;
            await updateAnnouncement(id, rest);
            toast({ title: "สำเร็จ", description: "แก้ไขประกาศเรียบร้อยแล้ว" });
            loadData();
        } catch (e) {
            toast({ title: "ผิดพลาด", description: "ไม่สามารถแก้ไขประกาศได้", variant: "destructive" });
            throw e;
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ต้องการลบประกาศนี้ใช่หรือไม่?")) return;
        try {
            await deleteAnnouncement(id);
            toast({ title: "สำเร็จ", description: "ลบประกาศเรียบร้อยแล้ว" });
            setAnnouncements(announcements.filter((a) => a.id !== id));
        } catch (e) {
            toast({ title: "ผิดพลาด", description: "ไม่สามารถลบประกาศได้", variant: "destructive" });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "important":
                return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case "warning":
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case "success":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "important":
                return <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">สำคัญ</Badge>;
            case "warning":
                return <Badge variant="destructive">เร่งด่วน</Badge>;
            case "success":
                return <Badge variant="default" className="bg-green-500 hover:bg-green-600">เรียบร้อย</Badge>;
            default:
                return <Badge variant="outline">ทั่วไป</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="h-6 w-6 text-primary" /> แจ้งเตือนนักเรียน
                    </h1>
                    <p className="text-sm text-muted-foreground">จัดการประกาศที่จะแสดงในหน้าต่างลอยเมื่อนักเรียนเข้าสู่ระบบ</p>
                </div>
                <AnnouncementDialog classrooms={classrooms} onSave={handleCreate as any} />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : announcements.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <Bell className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium">ยังไม่มีประกาศประกาศ</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-6">
                            คุณสามารถเริ่มส่งแจ้งเตือนให้กับนักเรียนได้โดยกดปุ่ม "เพิ่มประกาศ" มุมขวาบน
                        </p>
                        <AnnouncementDialog classrooms={classrooms} onSave={handleCreate as any} />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {announcements.map((ann) => (
                        <Card key={ann.id} className={`overflow-hidden border-l-4 ${ann.isActive ? 'border-primary' : 'border-muted-foreground'}`}>
                            <CardContent className="p-0">
                                <div className="p-5 flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getTypeBadge(ann.type)}
                                            <h3 className="text-lg font-bold">{ann.title}</h3>
                                            {!ann.isActive && <Badge variant="outline" className="text-muted-foreground">ปิดใช้งาน</Badge>}
                                            <Badge variant="outline" className="text-[10px]">
                                                {ann.displayMode === 'once' ? 'แสดงครั้งเดียว' : 'แสดงทุกครั้งที่เข้าใช้งาน'}
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t text-xs">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {ann.startDate} {ann.startTime} ถึง {ann.endDate} {ann.endTime}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Users className="h-3.5 w-3.5" />
                                                ห้องที่แสดง: {ann.targetClassroomIds.includes('all') ? 'ทั้งหมด' :
                                                    classrooms.filter(c => ann.targetClassroomIds.includes(c.id)).map(c => c.name).join(', ') || 'ไม่พบข้อมูลห้อง'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex md:flex-col gap-2 justify-end">
                                        <AnnouncementDialog
                                            announcement={ann}
                                            classrooms={classrooms}
                                            onSave={handleUpdate as any}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(ann.id)}
                                        >
                                            <Trash className="h-4 w-4 mr-1.5" /> ลบ
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
