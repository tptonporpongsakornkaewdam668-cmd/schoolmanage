import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Student, Classroom, Subject, TimetableEntry, AttendanceSummary, AttendanceStatus, AcademicYear, PeriodConfig, Term, Assignment, StudentScore, AttendanceRecord, QRSession, SystemSettings, AppUser, Announcement } from './types';

// Collection references
const studentsRef = collection(db, 'students');
const classroomsRef = collection(db, 'classrooms');
const subjectsRef = collection(db, 'subjects');
const timetableRef = collection(db, 'timetable');
const attendanceRef = collection(db, 'attendance');
const academicYearsRef = collection(db, 'academic_years');
const periodConfigsRef = collection(db, 'period_configs');
const termsRef = collection(db, 'terms');
const assignmentsRef = collection(db, 'assignments');
const scoresRef = collection(db, 'scores');
const usersRef = collection(db, 'users');
const settingsRef = collection(db, 'settings');
const announcementsRef = collection(db, 'announcements');


// Students
export const getStudentById = async (id: string): Promise<Student | null> => {
    const docRef = doc(db, 'students', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() as any } as Student;
};

export const getTeacherById = async (id: string): Promise<any | null> => {
    const docRef = doc(db, 'users', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() as any };
};

// Academic Years (ปีการศึกษา) - Independent from Terms
export const getAcademicYears = async (): Promise<AcademicYear[]> => {
    const snapshot = await getDocs(academicYearsRef);
    const years = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as AcademicYear));
    // Sort by year descending
    return years.sort((a, b) => b.year.localeCompare(a.year));
};

export const getActiveAcademicYear = async (): Promise<AcademicYear | null> => {
    const q = query(academicYearsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() as any } as AcademicYear;
};

export const addAcademicYear = async (year: Omit<AcademicYear, 'id'>) => {
    // If this is set as active, deactivate all other years first
    if (year.isActive) {
        const allYears = await getAcademicYears();
        const batch = writeBatch(db);
        allYears.forEach((y) => {
            const yearRef = doc(db, 'academic_years', y.id);
            batch.update(yearRef, { isActive: false });
        });
        await batch.commit();
    }

    return await addDoc(academicYearsRef, {
        ...year,
        createdAt: new Date().toISOString()
    });
};

export const updateAcademicYear = async (id: string, data: Partial<AcademicYear>) => {
    const docRef = doc(db, 'academic_years', id);
    return await updateDoc(docRef, data);
};

export const setActiveAcademicYear = async (id: string) => {
    // Deactivate all years first
    const allYears = await getAcademicYears();
    const batch = writeBatch(db);

    allYears.forEach((y) => {
        const yearRef = doc(db, 'academic_years', y.id);
        batch.update(yearRef, { isActive: y.id === id });
    });

    await batch.commit();
};

export const deleteAcademicYear = async (id: string) => {
    const docRef = doc(db, 'academic_years', id);
    return await deleteDoc(docRef);
};

// Terms (Semesters)
export const getTerms = async (academicYearId?: string): Promise<Term[]> => {
    let q;
    if (academicYearId) {
        q = query(termsRef, where('academicYearId', '==', academicYearId));
    } else {
        q = termsRef;
    }
    const snapshot = await getDocs(q);
    const terms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Term));
    // Sort by name descending (most recent first)
    return terms.sort((a, b) => b.name.localeCompare(a.name));
};

export const getActiveTerm = async (): Promise<Term | null> => {
    const q = query(termsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() as any } as Term;
};

export const addTerm = async (term: Omit<Term, 'id'>) => {
    // If this is set as active, deactivate all other terms first
    if (term.isActive) {
        const allTerms = await getTerms();
        const batch = writeBatch(db);
        allTerms.forEach((t) => {
            const termRef = doc(db, 'terms', t.id);
            batch.update(termRef, { isActive: false });
        });
        await batch.commit();
    }

    return await addDoc(termsRef, {
        ...term,
        createdAt: new Date().toISOString()
    });
};

export const updateTerm = async (id: string, term: Partial<Term>) => {
    const docRef = doc(db, 'terms', id);
    return await updateDoc(docRef, term);
};

export const setActiveTerm = async (id: string) => {
    // Deactivate all terms first
    const allTerms = await getTerms();
    const batch = writeBatch(db);

    allTerms.forEach((t) => {
        const termRef = doc(db, 'terms', t.id);
        batch.update(termRef, { isActive: t.id === id });
    });

    await batch.commit();
};

export const deleteTerm = async (id: string) => {
    // Delete all data related to this term
    try {
        // Get term info first
        const termDoc = await getDoc(doc(db, 'terms', id));
        if (!termDoc.exists()) {
            throw new Error('Term not found');
        }

        const batch = writeBatch(db);
        let batchCount = 0;
        const maxBatchSize = 500; // Firestore limit

        // Helper function to commit batch when it gets too large
        const commitIfNeeded = async () => {
            if (batchCount >= maxBatchSize) {
                await batch.commit();
                batchCount = 0;
            }
        };

        // 1. Delete all students in this term
        const studentsQuery = query(studentsRef, where('termId', '==', id));
        const studentsSnapshot = await getDocs(studentsQuery);
        for (const studentDoc of studentsSnapshot.docs) {
            batch.delete(studentDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // 2. Delete all classrooms in this term
        const classroomsQuery = query(classroomsRef, where('termId', '==', id));
        const classroomsSnapshot = await getDocs(classroomsQuery);
        for (const classroomDoc of classroomsSnapshot.docs) {
            batch.delete(classroomDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // 3. Delete all subjects in this term
        const subjectsQuery = query(subjectsRef, where('termId', '==', id));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        for (const subjectDoc of subjectsSnapshot.docs) {
            batch.delete(subjectDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // 4. Delete all assignments in this term
        const assignmentsQuery = query(assignmentsRef, where('termId', '==', id));
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        for (const assignmentDoc of assignmentsSnapshot.docs) {
            batch.delete(assignmentDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // 5. Delete all scores in this term
        const scoresQuery = query(scoresRef, where('termId', '==', id));
        const scoresSnapshot = await getDocs(scoresQuery);
        for (const scoreDoc of scoresSnapshot.docs) {
            batch.delete(scoreDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // 6. Delete all attendance records in this term
        const attendanceQuery = query(attendanceRef, where('termId', '==', id));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        for (const attendanceDoc of attendanceSnapshot.docs) {
            batch.delete(attendanceDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // 7. Delete all timetable entries in this term
        const timetableQuery = query(timetableRef, where('termId', '==', id));
        const timetableSnapshot = await getDocs(timetableQuery);
        for (const timetableDoc of timetableSnapshot.docs) {
            batch.delete(timetableDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // 8. Finally, delete the term itself
        const termRef = doc(db, 'terms', id);
        batch.delete(termRef);

        // Commit any remaining operations
        await batch.commit();

        return {
            success: true,
            deletedCounts: {
                students: studentsSnapshot.size,
                classrooms: classroomsSnapshot.size,
                subjects: subjectsSnapshot.size,
                assignments: assignmentsSnapshot.size,
                scores: scoresSnapshot.size,
                attendance: attendanceSnapshot.size,
                timetable: timetableSnapshot.size
            }
        };
    } catch (error) {
        console.error('Error deleting term:', error);
        throw error;
    }
};

// Period Configs
export const getPeriodConfigs = async (): Promise<PeriodConfig[]> => {
    const snapshot = await getDocs(periodConfigsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as PeriodConfig));
};

export const savePeriodConfigs = async (configs: PeriodConfig[]) => {
    // This is simple replace or update. For simplicity, we might just assume we update specific IDs or re-create.
    // Let's assume we update each doc if it has ID, or add new.
    // Better strategy for array-like config: Delete all and re-add OR update individual.
    // Let's just create add/update functions for individual config for flexibility.
    // Or bulk implementation:
    const batch = writeBatch(db);
    configs.forEach(c => {
        if (c.id) {
            const ref = doc(db, 'period_configs', c.id);
            batch.set(ref, c);
        } else {
            const ref = doc(periodConfigsRef);
            batch.set(ref, c);
        }
    });
    await batch.commit();
};

export const updatePeriodConfig = async (id: string, data: Partial<PeriodConfig>) => {
    const docRef = doc(db, 'period_configs', id);
    return await updateDoc(docRef, data);
};


// Attendance Stats
export const getStudentAttendanceStats = async (classroomId: string) => {
    // 1. Get all students in classroom
    const students = await getStudentsByClassroom(classroomId);

    // 2. Get all attendance records for this classroom (this might be slow if large, index needed)
    const q = query(attendanceRef, where('classroomId', '==', classroomId));
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => doc.data());

    // 3. Aggregate
    const stats: Record<string, Record<AttendanceStatus, number>> = {};

    // Initialize
    students.forEach(s => {
        stats[s.id] = { present: 0, late: 0, absent: 0, leave: 0, sick: 0, activity: 0, online: 0 };
    });

    records.forEach((r: any) => {
        if (stats[r.studentId] && r.status) {
            if (stats[r.studentId][r.status] !== undefined) {
                stats[r.studentId][r.status]++;
            }
        }
    });

    return students.map(s => ({
        student: s,
        stats: stats[s.id]
    }));
};

export const getStudents = async (termId?: string): Promise<Student[]> => {
    let q;
    if (termId) {
        q = query(studentsRef, where('termId', '==', termId));
    } else {
        q = studentsRef;
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Student));
};

export const getStudentsByClassroom = async (classroomId: string, termId?: string): Promise<Student[]> => {
    let q;
    if (termId) {
        q = query(studentsRef, where('classroomId', '==', classroomId), where('termId', '==', termId));
    } else {
        q = query(studentsRef, where('classroomId', '==', classroomId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Student));
};

export const addStudent = async (student: Omit<Student, 'id'>) => {
    const docRef = await addDoc(studentsRef, student);

    // Update classroom student count if classroomId is provided
    if (student.classroomId) {
        const classroomRef = doc(db, 'classrooms', student.classroomId);
        const classroomDoc = await getDoc(classroomRef);

        if (classroomDoc.exists()) {
            const currentCount = classroomDoc.data().studentCount || 0;
            await updateDoc(classroomRef, {
                studentCount: currentCount + 1
            });
        }
    }

    return docRef;
};

export const updateStudent = async (id: string, student: Partial<Student>) => {
    const docRef = doc(db, 'students', id);

    // If changing classroom, update both old and new classroom counts
    if (student.classroomId !== undefined) {
        // Get current student data to find old classroom
        const currentDoc = await getDoc(docRef);
        if (currentDoc.exists()) {
            const oldClassroomId = currentDoc.data().classroomId;

            // Decrement old classroom count
            if (oldClassroomId && oldClassroomId !== student.classroomId) {
                const oldClassroomRef = doc(db, 'classrooms', oldClassroomId);
                const oldClassroomDoc = await getDoc(oldClassroomRef);
                if (oldClassroomDoc.exists()) {
                    const oldCount = oldClassroomDoc.data().studentCount || 0;
                    await updateDoc(oldClassroomRef, {
                        studentCount: Math.max(0, oldCount - 1)
                    });
                }
            }

            // Increment new classroom count
            if (student.classroomId) {
                const newClassroomRef = doc(db, 'classrooms', student.classroomId);
                const newClassroomDoc = await getDoc(newClassroomRef);
                if (newClassroomDoc.exists()) {
                    const newCount = newClassroomDoc.data().studentCount || 0;
                    await updateDoc(newClassroomRef, {
                        studentCount: newCount + 1
                    });
                }
            }
        }
    }

    return await updateDoc(docRef, { ...student } as any);
};

export const deleteStudent = async (id: string) => {
    const docRef = doc(db, 'students', id);

    // Get student data to update classroom count
    const studentDoc = await getDoc(docRef);
    if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        const classroomId = studentData.classroomId;

        // Decrement classroom count
        if (classroomId) {
            const classroomRef = doc(db, 'classrooms', classroomId);
            const classroomDoc = await getDoc(classroomRef);
            if (classroomDoc.exists()) {
                const currentCount = classroomDoc.data().studentCount || 0;
                await updateDoc(classroomRef, {
                    studentCount: Math.max(0, currentCount - 1)
                });
            }
        }
    }

    return await deleteDoc(docRef);
};

// Utility function to recalculate all classroom student counts
export const recalculateAllClassroomCounts = async () => {
    try {
        const classrooms = await getClassrooms();
        const students = await getStudents();

        // Count students per classroom
        const counts: Record<string, number> = {};
        students.forEach(student => {
            if (student.classroomId) {
                counts[student.classroomId] = (counts[student.classroomId] || 0) + 1;
            }
        });

        // Update each classroom with correct count
        const batch = writeBatch(db);
        classrooms.forEach(classroom => {
            const classroomRef = doc(db, 'classrooms', classroom.id);
            const count = counts[classroom.id] || 0;
            batch.update(classroomRef, { studentCount: count });
        });

        await batch.commit();
        console.log('Classroom counts recalculated successfully!');
        return { success: true, updatedClassrooms: classrooms.length };
    } catch (error) {
        console.error('Error recalculating classroom counts:', error);
        throw error;
    }
};

// Classrooms
export const getClassrooms = async (termId?: string): Promise<Classroom[]> => {
    let q;
    if (termId) {
        q = query(classroomsRef, where('termId', '==', termId));
    } else {
        q = classroomsRef;
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Classroom));
};

export const addClassroom = async (classroom: Omit<Classroom, 'id'>) => {
    return await addDoc(classroomsRef, classroom);
};

export const updateClassroom = async (id: string, classroom: Partial<Classroom>) => {
    const docRef = doc(db, 'classrooms', id);
    return await updateDoc(docRef, classroom);
};

export const deleteClassroom = async (id: string) => {
    // First, get all students in this classroom
    const q = query(studentsRef, where('classroomId', '==', id));
    const studentsSnapshot = await getDocs(q);

    // Delete all students in this classroom using batch
    const batch = writeBatch(db);
    studentsSnapshot.docs.forEach(studentDoc => {
        batch.delete(studentDoc.ref);
    });

    // Also delete the classroom itself
    const classroomRef = doc(db, 'classrooms', id);
    batch.delete(classroomRef);

    // Commit all deletions
    await batch.commit();

    return { deletedStudents: studentsSnapshot.size };
};

// Subjects
export const getSubjects = async (termId?: string): Promise<Subject[]> => {
    let q;
    if (termId) {
        q = query(subjectsRef, where('termId', '==', termId));
    } else {
        q = subjectsRef;
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Subject));
};

export const addSubject = async (subject: Omit<Subject, 'id'>) => {
    const docRef = await addDoc(subjectsRef, subject);
    const subjectId = docRef.id;

    // Create Timetable Entries
    if (subject.schedules && subject.schedules.length > 0) {
        const periods = await getPeriodConfigs();

        const batch = writeBatch(db);

        subject.schedules.forEach(sch => {
            // Since classroomId is now a room name string (not an ID), use it directly
            const roomName = sch.classroomId || 'ไม่ระบุห้อง';

            // Prioritize manually Start/End times, fallback to period config
            let startTime = sch.startTime;
            let endTime = sch.endTime;
            let periodNumber = sch.period;

            if ((!startTime || !endTime) && periodNumber > 0) {
                const periodConfig = periods.find(p => p.periodNumber === periodNumber);
                if (periodConfig) {
                    startTime = periodConfig.startTime;
                    endTime = periodConfig.endTime;
                }
            }

            if (startTime && endTime) {
                const entry: any = {
                    subjectId,
                    subjectName: subject.name,
                    classroomId: sch.classroomId, // Keep original for reference
                    classroomName: roomName,
                    gradeLevel: (sch as any).gradeLevel || '',
                    dayOfWeek: sch.dayOfWeek,
                    period: periodNumber, // Can be 0 if manual time
                    startTime: startTime,
                    endTime: endTime,
                    termId: subject.termId // Add termId from subject
                };
                const ttRef = doc(timetableRef);
                batch.set(ttRef, entry);
            }
        });

        await batch.commit();
    }

    return docRef;
};

export const updateSubject = async (id: string, subject: Partial<Subject>) => {
    const docRef = doc(db, 'subjects', id);
    await updateDoc(docRef, subject);

    // If schedules are provided, we need to rebuild timetable entries
    if (subject.schedules) {
        // 1. Delete old timetable entries for this subject
        const q = query(timetableRef, where('subjectId', '==', id));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 2. Add new entries
        let subjectName = subject.name;
        let termId = subject.termId;

        // Fetch if missing critical info
        if (!subjectName || !termId) {
            const snap = await getDoc(docRef);
            const data = snap.data() as Subject;
            subjectName = subjectName || data.name;
            termId = termId || data.termId;
        }

        subject.schedules.forEach(sch => {
            const roomName = sch.classroomId || 'ไม่ระบุห้อง';
            if (sch.startTime && sch.endTime) {
                const entry: any = {
                    subjectId: id,
                    subjectName: subjectName!,
                    classroomId: sch.classroomId,
                    classroomName: roomName,
                    gradeLevel: (sch as any).gradeLevel || '',
                    dayOfWeek: sch.dayOfWeek,
                    period: 0,
                    startTime: sch.startTime,
                    endTime: sch.endTime,
                    termId: termId!
                };
                const ttRef = doc(timetableRef);
                batch.set(ttRef, entry);
            }
        });

        await batch.commit();
    }
};

export const deleteSubject = async (id: string) => {
    // Delete subject document
    const docRef = doc(db, 'subjects', id);
    await deleteDoc(docRef);

    const batch = writeBatch(db);

    // Delete associated timetable entries
    const qTimetable = query(timetableRef, where('subjectId', '==', id));
    const snapshotTimetable = await getDocs(qTimetable);
    snapshotTimetable.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete associated attendance records
    const qAttendance = query(attendanceRef, where('subjectId', '==', id));
    const snapshotAttendance = await getDocs(qAttendance);
    snapshotAttendance.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};

// Timetable
export const getTimetable = async (termId?: string): Promise<TimetableEntry[]> => {
    let q;
    if (termId) {
        q = query(timetableRef, where('termId', '==', termId));
    } else {
        q = timetableRef;
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as TimetableEntry));
};

// Attendance
export const getAttendanceRecords = async (termId: string, filters?: {
    date?: string;
    classroomId?: string;
    subjectId?: string;
    studentId?: string;
}): Promise<AttendanceRecord[]> => {
    let q = query(attendanceRef, where('termId', '==', termId));

    if (filters?.date) q = query(q, where('date', '==', filters.date));
    if (filters?.classroomId) q = query(q, where('classroomId', '==', filters.classroomId));
    if (filters?.subjectId) q = query(q, where('subjectId', '==', filters.subjectId));
    if (filters?.studentId) q = query(q, where('studentId', '==', filters.studentId));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as AttendanceRecord));
};

export const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>) => {
    const docRef = doc(db, 'attendance', id);
    return await updateDoc(docRef, updates);
};

export const deleteAttendanceRecord = async (id: string) => {
    const docRef = doc(db, 'attendance', id);
    return await deleteDoc(docRef);
};

// Dashboard Data Interface
export interface DashboardData {
    stats: {
        totalStudents: number;
        present: number;
        late: number;
        absent: number;
        leave: number;
        sick: number;
    };
    classroomSummary: AttendanceSummary[];
}

export const getDashboardData = async (termId: string, date: string): Promise<DashboardData> => {
    // 1. Get all students count (and list for classroom mapping)
    const students = await getStudents(termId);
    const totalStudents = students.length;

    // 2. Get attendance for today
    const q = query(attendanceRef, where('termId', '==', termId), where('date', '==', date));
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(d => d.data() as AttendanceRecord);

    // 3. Process Attendance by Student (Worst Status Logic)
    const studentStatusMap = new Map<string, AttendanceStatus[]>();
    records.forEach(r => {
        const list = studentStatusMap.get(r.studentId) || [];
        list.push(r.status);
        studentStatusMap.set(r.studentId, list);
    });

    let present = 0, late = 0, absent = 0, leave = 0, sick = 0;

    // Helper to determine worst status
    const getWorst = (statuses: AttendanceStatus[]) => {
        if (statuses.includes('absent')) return 'absent';
        if (statuses.includes('sick')) return 'sick';
        if (statuses.includes('leave')) return 'leave';
        if (statuses.includes('late')) return 'late';
        if (statuses.includes('activity')) return 'activity';
        return 'present'; // Default to present if only present records
    };

    studentStatusMap.forEach((statuses) => {
        const worst = getWorst(statuses);
        if (worst === 'present') present++;
        else if (worst === 'late') late++;
        else if (worst === 'absent') absent++;
        else if (worst === 'leave') leave++;
        else if (worst === 'sick') sick++;
        // activity count? User stat cards has no activity but we can add if needed.
    });

    // 4. Classroom Summary
    const classrooms = await getClassrooms(termId);
    const classroomSummary: AttendanceSummary[] = classrooms.map(c => {
        const classStudents = students.filter(s => s.classroomId === c.id);
        const classStudentIds = new Set(classStudents.map(s => s.id));

        let cPresent = 0, cLate = 0, cAbsent = 0, cLeave = 0, cSick = 0;

        classStudentIds.forEach(sid => {
            const statuses = studentStatusMap.get(sid);
            if (statuses) {
                const worst = getWorst(statuses);
                if (worst === 'present') cPresent++;
                else if (worst === 'late') cLate++;
                else if (worst === 'absent') cAbsent++;
                else if (worst === 'leave') cLeave++;
                else if (worst === 'sick') cSick++;
            }
        });

        return {
            classroomId: c.id,
            classroomName: c.name,
            present: cPresent,
            late: cLate,
            absent: cAbsent,
            leave: cLeave,
            sick: cSick,
            total: cPresent + cLate + cAbsent + cLeave + cSick,
            activity: 0,
            online: 0
        };
    }).sort((a, b) => a.classroomName.localeCompare(b.classroomName));

    return {
        stats: { totalStudents, present, late, absent, leave, sick },
        classroomSummary
    };
};

export const getAttendanceSummary = async (): Promise<AttendanceSummary[]> => {
    // Deprecated or redirect to new logic if needed, but keeping for backward compatibility if any
    return [];
};

// Save multiple attendance records
// Save multiple attendance records (Prevent Duplicates)
export const saveAttendanceRecords = async (records: { studentId: string; date: string; period: number; status: AttendanceStatus; note: string; classroomId: string; subjectId: string; termId: string }[]) => {
    if (records.length === 0) return;

    const sample = records[0];
    // Query existing records for this specific context (Term, Date, Subject, Classroom, Period)
    const q = query(
        attendanceRef,
        where('termId', '==', sample.termId),
        where('date', '==', sample.date),
        where('subjectId', '==', sample.subjectId),
        where('classroomId', '==', sample.classroomId),
        where('period', '==', sample.period)
    );

    const snapshot = await getDocs(q);
    const existingMap = new Map<string, string>(); // studentId -> docId
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        existingMap.set(data.studentId, doc.id);
    });

    const batch = writeBatch(db);

    records.forEach(record => {
        if (existingMap.has(record.studentId)) {
            // Update existing
            const docId = existingMap.get(record.studentId)!;
            const ref = doc(db, 'attendance', docId);
            batch.update(ref, {
                status: record.status,
                note: record.note,
                // period, date, etc. are same
            });
        } else {
            // Create new
            const ref = doc(attendanceRef);
            batch.set(ref, { ...record, createdAt: new Date().toISOString() });
        }
    });

    await batch.commit();
};


// Helper to seed data if needed (User can call this manually if they want to restore demo data to DB)
import { mockStudents, mockClassrooms, mockSubjects, mockTimetable } from './mockData';

export const seedDatabase = async () => {
    // Check if empty to avoid duplicates
    const existing = await getDocs(classroomsRef);
    if (!existing.empty) return;

    for (const c of mockClassrooms) {
        await addDoc(classroomsRef, c);
    }
    for (const s of mockStudents) {
        // Ensure status is valid
        await addDoc(studentsRef, s);
    }
    for (const sub of mockSubjects) {
        await addDoc(subjectsRef, sub);
    }
    for (const t of mockTimetable) {
        await addDoc(timetableRef, t);
    }
    console.log("Database seeded!");
};

// Assignments & Scores (already declared above)

export const getAssignmentsBySubject = async (subjectId: string): Promise<Assignment[]> => {
    const q = query(assignmentsRef, where('subjectId', '==', subjectId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Assignment));
};

export const addAssignment = async (assignment: Omit<Assignment, 'id'>): Promise<string> => {
    const docRef = await addDoc(assignmentsRef, { ...assignment, createdAt: new Date().toISOString() });
    return docRef.id;
};

export const deleteAssignment = async (id: string) => {
    const docRef = doc(db, 'assignments', id);
    return await deleteDoc(docRef);
};

export const updateAssignment = async (id: string, assignment: Partial<Assignment>): Promise<void> => {
    const docRef = doc(db, 'assignments', id);
    await updateDoc(docRef, assignment as any);
};

export const getScoresBySubject = async (subjectId: string): Promise<StudentScore[]> => {
    // Ideally filter by assignments of subject. But for simplicity, we might filter client side or query differently.
    // If we want efficient query: get assignments -> get scores for those assignments.
    // Or simpler: get all scores, filter. (Not scalable)
    // Better: Query scores by assignmentId. The calling page will iterate assignments and fetch scores?
    // Or we keep scores collection flat.

    // Let's rely on getting all scores for relevant assignments.
    const assignments = await getAssignmentsBySubject(subjectId);
    if (assignments.length === 0) return [];

    // Firestore 'in' query supports up to 10 items. If more, we need multiple queries.
    // For now, let's just fetch all scores and filter in memory if the dataset is smallish (MVP).
    // OR fetch per assignment.
    // Let's implement fetchScoresByAssignment
    return []; // Placeholder if not used directly
};

export const getScoresByAssignment = async (assignmentId: string): Promise<StudentScore[]> => {
    const q = query(scoresRef, where('assignmentId', '==', assignmentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as StudentScore));
};

export const saveScore = async (score: Omit<StudentScore, 'id'>) => {
    // Check if exists
    const q = query(scoresRef, where('assignmentId', '==', score.assignmentId), where('studentId', '==', score.studentId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        return await updateDoc(doc(db, 'scores', docId), { score: score.score });
    } else {
        return await addDoc(scoresRef, score);
    }
};

// Grade Config
import { GradeConfig } from './types';
const gradeConfigRef = collection(db, 'grade_configs');

export const getGradeConfigs = async (): Promise<GradeConfig[]> => {
    const snapshot = await getDocs(gradeConfigRef);
    const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as GradeConfig));
    return configs.sort((a, b) => b.minScore - a.minScore);
};

export const saveGradeConfigs = async (configs: GradeConfig[]) => {
    const snapshot = await getDocs(gradeConfigRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));

    configs.forEach(config => {
        const ref = doc(gradeConfigRef);
        batch.set(ref, config);
    });

    await batch.commit();
};

export const updateTeacher = async (id: string, data: any): Promise<void> => {
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, { ...data } as any);
};

export const createQRSession = async (session: Omit<QRSession, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'qr_sessions'), { ...session, createdAt: new Date().toISOString() } as any);
    return docRef.id;
};

export const deactivateQRSessions = async (subjectId: string, date: string, period: number): Promise<void> => {
    const q = query(
        collection(db, 'qr_sessions'),
        where('subjectId', '==', subjectId),
        where('date', '==', date),
        where('period', '==', period),
        where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => updateDoc(doc(db, 'qr_sessions', d.id), { isActive: false }));
    await Promise.all(promises);
};

// System Settings
export const getSystemSettings = async (): Promise<SystemSettings | null> => {
    const docRef = doc(db, 'settings', 'global');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as SystemSettings;
};

export const saveSystemSettings = async (settings: SystemSettings) => {
    const docRef = doc(db, 'settings', 'global');
    await updateDoc(docRef, settings as any).catch(async (err) => {
        if (err.code === 'not-found') {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(docRef, settings);
        } else {
            throw err;
        }
    });
};

// User Management
export const getAllUsers = async (): Promise<AppUser[]> => {
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as AppUser));
};

export const getAdmins = async (): Promise<AppUser[]> => {
    const q = query(usersRef, where('role', '==', 'admin'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as AppUser));
};

export const addUser = async (user: Omit<AppUser, 'id'> & { password?: string }) => {
    const userData = { ...user, createdAt: new Date().toISOString() };
    if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
    }
    return await addDoc(usersRef, userData);
};

export const deleteUser = async (id: string) => {
    const docRef = doc(db, 'users', id);
    return await deleteDoc(docRef);
};

export const updateUser = async (id: string, data: Partial<AppUser>): Promise<void> => {
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, data as any);
};

import bcrypt from 'bcryptjs';
import { setDoc } from 'firebase/firestore';

// Announcements
export const getAnnouncements = async (): Promise<Announcement[]> => {
    const snapshot = await getDocs(announcementsRef);
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Announcement));
    return announcements.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const addAnnouncement = async (announcement: Omit<Announcement, 'id'>) => {
    return await addDoc(announcementsRef, {
        ...announcement,
        createdAt: new Date().toISOString()
    });
};

export const updateAnnouncement = async (id: string, announcement: Partial<Announcement>) => {
    const docRef = doc(db, 'announcements', id);
    return await updateDoc(docRef, announcement);
};

export const deleteAnnouncement = async (id: string) => {
    const docRef = doc(db, 'announcements', id);
    return await deleteDoc(docRef);
};

export const getActiveAnnouncements = async (classroomId?: string): Promise<Announcement[]> => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    const q = query(announcementsRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Announcement));

    return announcements.filter(a => {
        // Date strings are in YYYY-MM-DD format, so simple comparison works
        const startDate = a.startDate;
        const endDate = a.endDate;

        if (currentDate < startDate || currentDate > endDate) return false;

        // If it's the start date, check time
        if (currentDate === startDate && currentTime < a.startTime) return false;

        // If it's the end date, check time
        if (currentDate === endDate && currentTime > a.endTime) return false;

        // Check classroom target
        if (a.targetClassroomIds.includes('all')) return true;
        if (classroomId && a.targetClassroomIds.includes(classroomId)) return true;

        return false;
    });
};

