import { AttendanceStatus, STATUS_CONFIG, Student, Classroom, Subject, TimetableEntry, AttendanceSummary } from './types';

export { STATUS_CONFIG, type AttendanceStatus };

export const mockClassrooms: Classroom[] = [
  { id: '1', name: 'ม.1/1', level: 'ม.1', studentCount: 35 },
  { id: '2', name: 'ม.1/2', level: 'ม.1', studentCount: 34 },
  { id: '3', name: 'ม.2/1', level: 'ม.2', studentCount: 36 },
  { id: '4', name: 'ม.2/2', level: 'ม.2', studentCount: 33 },
  { id: '5', name: 'ม.3/1', level: 'ม.3', studentCount: 38 },
];

export const mockStudents: Student[] = [
  { id: '1', studentCode: '65001', fullName: 'กมลชนก สุขสวัสดิ์', classroomId: '1', status: 'active' },
  { id: '2', studentCode: '65002', fullName: 'กิตติศักดิ์ วงศ์ประเสริฐ', classroomId: '1', status: 'active' },
  { id: '3', studentCode: '65003', fullName: 'จิราพร แก้วมณี', classroomId: '1', status: 'active' },
  { id: '4', studentCode: '65004', fullName: 'ชัยวัฒน์ ทองดี', classroomId: '1', status: 'active' },
  { id: '5', studentCode: '65005', fullName: 'ณัฐธิดา พรหมเสน', classroomId: '1', status: 'active' },
  { id: '6', studentCode: '65006', fullName: 'ธนภัทร ศรีสุข', classroomId: '1', status: 'active' },
  { id: '7', studentCode: '65007', fullName: 'นภัสสร จันทร์เพ็ญ', classroomId: '1', status: 'active' },
  { id: '8', studentCode: '65008', fullName: 'ปิยะวัฒน์ รัตนโชติ', classroomId: '1', status: 'active' },
  { id: '9', studentCode: '65009', fullName: 'พิชญาภา อินทร์แก้ว', classroomId: '1', status: 'active' },
  { id: '10', studentCode: '65010', fullName: 'ภูมิพัฒน์ สมบูรณ์', classroomId: '1', status: 'active' },
  { id: '11', studentCode: '65011', fullName: 'มนัสนันท์ วิชัยดิษฐ', classroomId: '1', status: 'active' },
  { id: '12', studentCode: '65012', fullName: 'วรินทร์ธร เจริญผล', classroomId: '1', status: 'active' },
];

export const mockSubjects: Subject[] = [
  { id: '1', code: 'ค21101', name: 'คณิตศาสตร์ 1', classrooms: ['1', '2'] },
  { id: '2', code: 'ว21101', name: 'วิทยาศาสตร์ 1', classrooms: ['1', '2'] },
  { id: '3', code: 'ท21101', name: 'ภาษาไทย 1', classrooms: ['3', '4'] },
  { id: '4', code: 'อ21101', name: 'ภาษาอังกฤษ 1', classrooms: ['1', '3'] },
  { id: '5', code: 'ส21101', name: 'สังคมศึกษา 1', classrooms: ['1', '2', '3'] },
];

export const mockTimetable: TimetableEntry[] = [
  { id: '1', subjectId: '1', subjectName: 'คณิตศาสตร์ 1', classroomId: '1', classroomName: 'ม.1/1', dayOfWeek: 1, period: 1, startTime: '08:30', endTime: '09:20' },
  { id: '2', subjectId: '2', subjectName: 'วิทยาศาสตร์ 1', classroomId: '1', classroomName: 'ม.1/1', dayOfWeek: 1, period: 2, startTime: '09:20', endTime: '10:10' },
  { id: '3', subjectId: '4', subjectName: 'ภาษาอังกฤษ 1', classroomId: '3', classroomName: 'ม.2/1', dayOfWeek: 1, period: 3, startTime: '10:30', endTime: '11:20' },
  { id: '4', subjectId: '5', subjectName: 'สังคมศึกษา 1', classroomId: '2', classroomName: 'ม.1/2', dayOfWeek: 1, period: 5, startTime: '13:00', endTime: '13:50' },
  { id: '5', subjectId: '1', subjectName: 'คณิตศาสตร์ 1', classroomId: '2', classroomName: 'ม.1/2', dayOfWeek: 2, period: 1, startTime: '08:30', endTime: '09:20' },
  { id: '6', subjectId: '3', subjectName: 'ภาษาไทย 1', classroomId: '3', classroomName: 'ม.2/1', dayOfWeek: 2, period: 2, startTime: '09:20', endTime: '10:10' },
];

export const mockAttendanceSummary: AttendanceSummary[] = [
  { classroomName: 'ม.1/1', present: 28, late: 3, absent: 2, leave: 1, sick: 1, activity: 0, online: 0, total: 35 },
  { classroomName: 'ม.1/2', present: 30, late: 1, absent: 1, leave: 0, sick: 2, activity: 0, online: 0, total: 34 },
  { classroomName: 'ม.2/1', present: 32, late: 2, absent: 0, leave: 1, sick: 0, activity: 1, online: 0, total: 36 },
  { classroomName: 'ม.2/2', present: 25, late: 3, absent: 3, leave: 1, sick: 1, activity: 0, online: 0, total: 33 },
  { classroomName: 'ม.3/1', present: 34, late: 1, absent: 1, leave: 0, sick: 1, activity: 0, online: 1, total: 38 },
];
