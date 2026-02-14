import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BookOpen,
    Users,
    LayoutDashboard,
    ClipboardCheck,
    Settings,
    GraduationCap,
    Calendar,
    FileText,
    Plus,
    ArrowRight,
    Shield,
    QrCode
} from 'lucide-react';

export default function AdminGuidePage() {
    const sections = [
        {
            title: '1. เริ่มต้นใช้งาน (Academic Setup)',
            icon: Calendar,
            description: 'ก่อนเริ่มใช้งาน ระบบจำเป็นต้องมีการตั้งค่าปีการศึกษาและเทอม',
            steps: [
                'กดปุ่ม "จัดการปีการศึกษา" ที่แถบด้านบน (Header)',
                'เพิ่ม "ปีการศึกษา" (เช่น 2568) และกดเครื่องหมายดาวเพื่อเปิดใช้งาน (Active)',
                'เพิ่ม "เทอม/ภาคเรียน" (เช่น ภาคเรียนที่ 1/2568) และเปิดใช้งานเพื่อให้ระบบเริ่มเก็บข้อมูลในเทอมนั้น',
                '**หมายเหตุ:** ข้อมูลนักเรียนและรายวิชาจะแยกตามเทอม หากเปลี่ยนเทอม ข้อมูลจะถูกรีเซ็ตตามเทอมใหม่ทันที'
            ]
        },
        {
            title: '2. จัดการห้องเรียน (Classroom)',
            icon: GraduationCap,
            description: 'สร้างห้องเรียนเพื่อเป็นกลุ่มของนักเรียน',
            steps: [
                'ไปที่เมนู "ห้องเรียน" -> กดปุ่ม "เพิ่มห้องเรียน"',
                'ระบุชื่อห้อง (เช่น ม.1/1) และระดับชั้น',
                'ห้องเรียนจะถูกสร้างขึ้นในเทอมที่กำลังเปิดใช้งานอยู่เท่านั้น'
            ]
        },
        {
            title: '3. จัดการนักเรียน (Student Management)',
            icon: Users,
            description: 'เพิ่มรายชื่อนักเรียนเข้าระบบ',
            steps: [
                'ไปที่เมนู "นักเรียน" -> เลือกปุ่ม "Import นักเรียน"',
                '**วิธีที่ 1 (Excel):** ดาวน์โหลดไฟล์ตัวอย่าง ใส่ข้อมูลแล้วอัปโหลดกลับเข้าระบบ',
                '**วิธีที่ 2 (วางข้อมูล):** คัดลอกข้อมูลจาก Excel (คอลัมน์: รหัส, ชื่อ, ห้อง) แล้ววางในช่อง "วางข้อมูล" ระบบจะแยกให้โดยอัตโนมัติ',
                'ระบบจะสร้างบัญชีผู้ใช้ให้นักเรียนอัตโนมัติ (Username: รหัสนักเรียน, Password: รหัสนักเรียน)',
                'นักเรียนจะถูกบังคับให้เปลี่ยนรหัสผ่านในการเข้าใช้งานครั้งแรก'
            ]
        },
        {
            title: '4. จัดการรายวิชา (Subject Management)',
            icon: BookOpen,
            description: 'สร้างวิชาและกำหนดห้องที่เรียนวิชานั้น',
            steps: [
                'ไปที่เมนู "รายวิชา" -> กด "เพิ่มรายวิชา"',
                'ระบุรหัสวิชา ชื่อวิชา และ **เลือกห้องเรียน** ที่เรียนวิชานี้',
                'หากต้องการใส่คะแนนเก็บหรือตารางสอน ให้กดเข้าไปที่ "ดูรายละเอียด" ของวิชานั้นๆ'
            ]
        },
        {
            title: '5. การเช็คชื่อ (Attendance)',
            icon: ClipboardCheck,
            description: 'การบันทึกการเข้าเรียนมี 3 วิธีหลัก',
            steps: [
                '**วิธีที่ 1 (Manual):** เลือกวิชา เลือกวันที่ แล้วติ๊กสถานะ มา/สาย/ขาด/ลา รายคน',
                '**วิธีที่ 2 (QR Code):** กดปุ่ม "QR Code" ในหน้าเช็คชื่อ ระบบจะสร้างคิวอาร์โค้ดให้นักเรียนสแกน (สแกนได้เฉพาะนักเรียนที่อยู่ในห้องที่เรียนวิชานั้นๆ)',
                '**วิธีที่ 3 (เช็คชื่อด่วน):** กดปุ่ม "เช็คชื่อด่วน" เพื่อสแกนบาร์โค้ดหรือรหัสนักเรียนทีละคนด้วยกล้องหรือเครื่องสแกน'
            ]
        },
        {
            title: '6. รายงานและสถิติ (Reports)',
            icon: FileText,
            description: 'ตรวจสอบและส่งออกข้อมูล',
            steps: [
                'ไปที่เมนู "รายงาน" เพื่อดูสถิติภาพรวม',
                '**Grid View:** ดูสรุปการมาเรียนทั้งเทอมในรูปแบบตาราง (มีสัญลักษณ์ มา/ขาด/ลา ครบถ้วน)',
                '**List View:** ดูรายละเอียดรายวัน และสามารถแก้ไขสถานะย้อนหลังได้',
                '**Export:** สามารถกดปุ่ม "ส่งออก Excel (CSV)" เพื่อนำไปใช้ในโปรแกรม Excel ได้ทันที'
            ]
        },
        {
            title: '7. การตั้งค่าระบบ (Admin Settings)',
            icon: Settings,
            description: 'เฉพาะ Admin เท่านั้นที่เข้าถึงส่วนนี้ได้',
            steps: [
                '**จัดการเว็บไซต์:** เปลี่ยนชื่อระบบ และใส่ลิงก์โลโก้ของคุณเอง',
                '**เวลาเรียน:** กำหนดช่วงเวลาของคาบเรียนที่ 1-8',
                '**เกณฑ์เกรด:** ตั้งค่าช่วงคะแนนสำหรับการตัดเกรด',
                '**จัดการแอดมิน:** เพิ่มหรือลบบัญชีผู้ดูแลระบบท่านอื่น'
            ]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
                    คู่มือการใช้งานสำหรับแอดมิน
                </h1>
                <p className="text-xl text-muted-foreground">
                    เรียนรู้วิธีจัดการระบบ Class Companion อย่างมืออาชีพ
                </p>
            </div>

            <div className="grid gap-6">
                {sections.map((section, idx) => (
                    <Card key={idx} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="bg-primary/5 border-b border-primary/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                                    <section.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">{section.title}</CardTitle>
                                    <CardDescription className="text-primary/70">{section.description}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ul className="space-y-4">
                                {section.steps.map((step, sIdx) => (
                                    <li key={sIdx} className="flex gap-3 text-gray-700">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                                            {sIdx + 1}
                                        </div>
                                        <span className="leading-relaxed">{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-blue-600 text-white border-none shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Shield className="h-40 w-40" />
                </div>
                <CardContent className="p-8 relative z-10 text-center space-y-4">
                    <h2 className="text-2xl font-bold italic">"ตัวช่วยจัดการห้องเรียน ให้เป็นเรื่องง่าย"</h2>
                    <p className="text-blue-100 max-w-2xl mx-auto">
                        หากคุณครูมีข้อสงสัยเพิ่มเติมเกี่ยวกับการใช้งาน หรือพบเจอปัญหาในระบบ
                        สามารถติดต่อทีมพัฒนาได้ตลอดเวลาครับ
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
