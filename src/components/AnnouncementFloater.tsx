import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Bell,
    AlertTriangle,
    Info,
    CheckCircle,
    X,
    XCircle
} from "lucide-react";
import { getActiveAnnouncements } from "@/lib/services";
import { Announcement } from "@/lib/types";

interface AnnouncementFloaterProps {
    classroomId: string;
}

export function AnnouncementFloater({ classroomId }: AnnouncementFloaterProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [open, setOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        async function fetchAnnouncements() {
            try {
                const active = await getActiveAnnouncements(classroomId);
                if (active.length > 0) {
                    const sessionShown = JSON.parse(sessionStorage.getItem('shown_announcements') || '[]');
                    const permanentShown = JSON.parse(localStorage.getItem('seen_announcements') || '[]');

                    const newToShow = active.filter(a => {
                        if (a.displayMode === 'once') {
                            return !permanentShown.includes(a.id);
                        }
                        // Default to 'always' (session-based)
                        return !sessionShown.includes(a.id);
                    });

                    if (newToShow.length > 0) {
                        setAnnouncements(newToShow);
                        setOpen(true);

                        // Mark as shown in appropriate storage
                        const newSessionIds = [...sessionShown];
                        const newPermanentIds = [...permanentShown];

                        newToShow.forEach(a => {
                            if (a.displayMode === 'once') {
                                newPermanentIds.push(a.id);
                            } else {
                                newSessionIds.push(a.id);
                            }
                        });

                        sessionStorage.setItem('shown_announcements', JSON.stringify(newSessionIds));
                        localStorage.setItem('seen_announcements', JSON.stringify(newPermanentIds));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch announcements for floater", error);
            }
        }

        if (classroomId) {
            fetchAnnouncements();
        }
    }, [classroomId]);

    const currentAnn = announcements[currentIndex];

    if (!currentAnn) return null;

    const handleNext = () => {
        if (currentIndex < announcements.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setOpen(false);
        }
    };

    const getStyle = (type: string) => {
        switch (type) {
            case "important":
                return {
                    icon: <AlertTriangle className="h-10 w-10 text-orange-500" />,
                    bg: "bg-orange-50",
                    border: "border-orange-200",
                    badge: <Badge variant="secondary" className="bg-orange-100 text-orange-700">สำคัญ</Badge>
                };
            case "warning":
                return {
                    icon: <XCircle className="h-10 w-10 text-red-500" />,
                    bg: "bg-red-50",
                    border: "border-red-200",
                    badge: <Badge variant="destructive">เร่งด่วน</Badge>
                };
            case "success":
                return {
                    icon: <CheckCircle className="h-10 w-10 text-green-500" />,
                    bg: "bg-green-50",
                    border: "border-green-200",
                    badge: <Badge variant="default" className="bg-green-500">เรียบร้อย</Badge>
                };
            default:
                return {
                    icon: <Info className="h-10 w-10 text-blue-500" />,
                    bg: "bg-blue-50",
                    border: "border-blue-200",
                    badge: <Badge variant="outline">แจ้งให้ทราบ</Badge>
                };
        }
    };

    const style = getStyle(currentAnn.type);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
                <div className={`p-8 ${style.bg} flex flex-col items-center text-center space-y-4`}>
                    <div className="bg-white p-4 rounded-full shadow-sm">
                        {style.icon}
                    </div>
                    <div className="space-y-1">
                        {style.badge}
                        <DialogTitle className="text-xl font-bold pt-2">{currentAnn.title}</DialogTitle>
                    </div>
                </div>

                <div className="p-6 bg-white">
                    <DialogDescription className="text-base text-foreground leading-relaxed whitespace-pre-wrap text-center">
                        {currentAnn.content}
                    </DialogDescription>

                    <div className="mt-8">
                        <Button
                            className="w-full h-12 text-lg font-bold"
                            onClick={handleNext}
                        >
                            {currentIndex < announcements.length - 1 ? "ดูประกาศต่อไป" : "รับทราบ"}
                        </Button>
                        {announcements.length > 1 && (
                            <p className="text-center text-xs text-muted-foreground mt-3">
                                ประกาศที่ {currentIndex + 1} จาก {announcements.length}
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
