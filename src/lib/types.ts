export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'sick' | 'activity' | 'online';

export interface AppUser {
    id: string;
    username: string;
    name: string;
    role: 'admin' | 'teacher' | 'student';
    studentId?: string;
    mustChangePassword?: boolean;
    avatarUrl?: string;
}

export interface SystemSettings {
    schoolName: string;
    logoUrl: string;
    address?: string;
    phone?: string;
}

export const STATUS_CONFIG: Record<AttendanceStatus, {
    label: string;
    color: string;
    icon: string;
    bgClass: string;
    dotClass: string;
}> = {
    present: { label: 'มา', color: 'bg-status-present', icon: '✓', bgClass: 'bg-green-50 border-green-200', dotClass: 'bg-green-500' },
    late: { label: 'สาย', color: 'bg-status-late', icon: '⏰', bgClass: 'bg-yellow-50 border-yellow-200', dotClass: 'bg-yellow-500' },
    absent: { label: 'ขาด', color: 'bg-status-absent', icon: '✗', bgClass: 'bg-red-50 border-red-200', dotClass: 'bg-red-500' },
    leave: { label: 'ลา', color: 'bg-status-leave', icon: '📋', bgClass: 'bg-blue-50 border-blue-200', dotClass: 'bg-blue-500' },
    sick: { label: 'ป่วย', color: 'bg-status-sick', icon: '🏥', bgClass: 'bg-purple-50 border-purple-200', dotClass: 'bg-purple-500' },
    activity: { label: 'กิจกรรม', color: 'bg-status-activity', icon: '🎯', bgClass: 'bg-orange-50 border-orange-200', dotClass: 'bg-orange-500' },
    online: { label: 'ออนไลน์', color: 'bg-status-online', icon: '💻', bgClass: 'bg-cyan-50 border-cyan-200', dotClass: 'bg-cyan-500' },
};



// Academic Year (ปีการศึกษา) - Independent entity
export interface AcademicYear {
    id: string;
    year: string; // e.g. "2568", "2024"
    name: string; // e.g. "ปีการศึกษา 2568", "Academic Year 2024"
    isActive: boolean; // Only one can be active
    createdAt: string;
}

// Term (ภาคเรียน/เทอม) - Independent entity, can optionally link to Academic Year
export interface Term {
    id: string;
    name: string; // e.g. "ภาคเรียนที่ 1/2568", "Term 1/2024"
    semester: string; // e.g. "1", "2", "ฤดูร้อน"
    academicYearId?: string; // Optional reference to Academic Year
    isActive: boolean; // Only one term can be active at a time
    createdAt: string;
}

export interface Student {
    id: string;
    studentCode: string;
    fullName: string;
    photoUrl?: string;
    classroomId: string;
    status: 'active' | 'suspended' | 'resigned' | 'graduated';
    termId: string; // Required - data is separated by term
    username?: string;
    password?: string; // Hashed in real app
    mustChangePassword?: boolean;
    role: 'student';
}

export interface Classroom {
    id: string;
    name: string;
    level: string;
    studentCount: number;
    section?: number;
    termId: string; // Required - data is separated by term
}

export interface Subject {
    id: string;
    code: string;
    name: string;
    logoUrl?: string;
    classrooms: string[];

    teachers?: string[]; // Teacher names or IDs
    schedules?: SubjectSchedule[];
    gradingConfig?: GradeConfig[]; // Custom grading for this subject
    termId: string; // Required - data is separated by term
}

export interface SubjectSchedule {
    classroomId: string;
    dayOfWeek: number;
    period: number;
    startTime?: string;
    endTime?: string;
}

export interface TimetableEntry {
    id: string;
    subjectId: string;
    subjectName: string;
    classroomId: string; // The classroom being taught
    classroomName: string;
    dayOfWeek: number;
    period: number;
    startTime: string;
    endTime: string;
    termId: string; // Required - data is separated by term
}

export interface AttendanceSummary {
    classroomName: string;
    present: number;
    late: number;
    absent: number;
    leave: number;
    sick: number;
    activity: number;
    online: number;
    total: number;
}

export interface PeriodConfig {
    id: string;
    periodNumber: number;
    startTime: string; // "08:00"
    endTime: string;   // "09:00"
    // No termId - Period configs are global settings
}

export interface Assignment {
    id: string;
    subjectId: string;
    title: string;
    maxScore: number;
    description?: string;
    link?: string;
    createdAt?: string;
    termId: string; // Required - data is separated by term
    startDate?: string;
    dueDate?: string;
    dueTime?: string;
}

export interface StudentScore {
    id: string;
    assignmentId: string;
    studentId: string;
    score: number;
    termId: string; // Required - data is separated by term
}

// Grade Config - GLOBAL, not separated by term
export interface GradeConfig {
    id?: string;
    grade: string;
    minScore: number;
    maxScore: number;
    // No termId - Grade configs are global settings
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName?: string; // Optional - for quick lookup
    subjectId: string;
    classroomId: string;
    date: string;
    period: number; // Added - which period of the day
    status: AttendanceStatus;
    note?: string;
    termId: string; // Required - data is separated by term
    location?: {
        latitude: number;
        longitude: number;
    };
    fingerprint?: string;
    checkInTime?: string;
}

export interface QRSession {
    id: string;
    subjectId: string;
    classrooms: string[]; // Subject can have multiple classrooms
    date: string;
    period: number;
    expiresAt: string;
    isActive: boolean;
    location?: {
        latitude: number;
        longitude: number;
    };
    createdAt: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'important' | 'warning' | 'success';
    targetClassroomIds: string[]; // ['all'] for all classrooms
    startDate: string; // ISO date string (YYYY-MM-DD)
    startTime: string; // HH:mm
    endDate: string; // ISO date string (YYYY-MM-DD)
    endTime: string; // HH:mm
    isActive: boolean;
    displayMode: 'once' | 'always';
    createdAt: string;
}


