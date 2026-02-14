import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Bell, Loader2 } from "lucide-react";
import { Classroom, Announcement } from "@/lib/types";

interface AnnouncementDialogProps {
    classrooms: Classroom[];
    announcement?: Announcement;
    onSave: (announcement: Omit<Announcement, "id"> | Announcement) => Promise<void>;
}

export function AnnouncementDialog({
    classrooms,
    announcement,
    onSave,
}: AnnouncementDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Omit<Announcement, "id">>({
        title: "",
        content: "",
        type: "info",
        targetClassroomIds: ["all"],
        startDate: new Date().toISOString().split("T")[0],
        startTime: "08:00",
        endDate: new Date().toISOString().split("T")[0],
        endTime: "17:00",
        isActive: true,
        displayMode: "always",
        createdAt: new Date().toISOString(),
    });

    useEffect(() => {
        if (announcement) {
            setFormData({
                title: announcement.title,
                content: announcement.content,
                type: announcement.type,
                targetClassroomIds: announcement.targetClassroomIds,
                startDate: announcement.startDate,
                startTime: announcement.startTime,
                endDate: announcement.endDate,
                endTime: announcement.endTime,
                isActive: announcement.isActive,
                displayMode: announcement.displayMode || "always",
                createdAt: announcement.createdAt,
            });
        } else {
            setFormData({
                title: "",
                content: "",
                type: "info",
                targetClassroomIds: ["all"],
                startDate: new Date().toISOString().split("T")[0],
                startTime: "08:00",
                endDate: new Date().toISOString().split("T")[0],
                endTime: "17:00",
                isActive: true,
                displayMode: "always",
                createdAt: new Date().toISOString(),
            });
        }
    }, [announcement, open]);

    const handleToggleClassroom = (id: string) => {
        let newTargets = [...formData.targetClassroomIds];
        if (id === "all") {
            newTargets = ["all"];
        } else {
            // Remove 'all' if present
            newTargets = newTargets.filter((t) => t !== "all");
            if (newTargets.includes(id)) {
                newTargets = newTargets.filter((t) => t !== id);
                if (newTargets.length === 0) newTargets = ["all"];
            } else {
                newTargets.push(id);
            }
        }
        setFormData({ ...formData, targetClassroomIds: newTargets });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (announcement) {
                await onSave({ ...formData, id: announcement.id } as Announcement);
            } else {
                await onSave(formData);
            }
            setOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {announcement ? (
                    <Button variant="ghost" size="sm">แก้ไข</Button>
                ) : (
                    <Button size="sm">
                        <Plus className="mr-1.5 h-4 w-4" /> เพิ่มประกาศ
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        {announcement ? "แก้ไขประกาศ" : "เพิ่มประกาศแจ้งเตือน"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">หัวข้อประกาศ</Label>
                            <Input
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="ระบุหัวข้อที่ต้องการแจ้งเตือน"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">ข้อความประกาศ</Label>
                            <Textarea
                                id="content"
                                required
                                className="min-h-[100px]"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="พิมพ์ข้อความรายละเอียดที่นี่..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>ประเภท</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v: any) => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">ทั่วไป (Info)</SelectItem>
                                        <SelectItem value="important">สำคัญ (Important)</SelectItem>
                                        <SelectItem value="warning">คำเตือน (Warning)</SelectItem>
                                        <SelectItem value="success">เรียบร้อย (Success)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>ความถี่การแสดงผล</Label>
                                <Select
                                    value={formData.displayMode}
                                    onValueChange={(v: any) => setFormData({ ...formData, displayMode: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="always">ทุกครั้งที่ล็อคอิน (ทุก session)</SelectItem>
                                        <SelectItem value="once">แค่ครั้งเดียว (หลังจากนั้นจะไม่แสดงอีก)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="active"
                                checked={formData.isActive}
                                onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                            />
                            <Label htmlFor="active">เปิดใช้งานการแสดงผล</Label>
                        </div>

                        <div className="space-y-3">
                            <Label>แสดงให้ห้องเรียนไหนบ้าง</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="target-all"
                                        checked={formData.targetClassroomIds.includes("all")}
                                        onCheckedChange={() => handleToggleClassroom("all")}
                                    />
                                    <Label htmlFor="target-all" className="font-bold">ทั้งหมด (All)</Label>
                                </div>
                                {classrooms.map((c) => (
                                    <div key={c.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`target-${c.id}`}
                                            checked={formData.targetClassroomIds.includes(c.id)}
                                            onCheckedChange={() => handleToggleClassroom(c.id)}
                                        />
                                        <Label htmlFor={`target-${c.id}`} className="text-xs truncate">{c.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Label className="text-primary font-bold">เริ่มแสดงผล</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase">วันที่เริ่มต้น</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase">เวลา</Label>
                                        <Input
                                            type="time"
                                            required
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-destructive font-bold">สิ้นสุดการแสดงผล</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase">วันที่สิ้นสุด</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase">เวลา</Label>
                                        <Input
                                            type="time"
                                            required
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {announcement ? "บันทึกการแก้ไข" : "สร้างประกาศ"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
