import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { AppUser } from '@/lib/types';

// Define User Type for our Custom Auth


interface AuthContextType {
    currentUser: AppUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user from local storage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('app_user');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('app_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            // 1. Check if there are ANY admin/teacher users
            const usersRef = collection(db, 'users');
            const studentsRef = collection(db, 'students');

            const allUsersSnapshot = await getDocs(query(usersRef, limit(1)));

            // 2. TEMPORARY: Admin Bypass for setup (Remove in production)
            if (username.toLowerCase() === 'admin' && password === 'admin1234') {
                const appUser: AppUser = {
                    id: 'temp-admin-id',
                    username: 'admin',
                    name: 'System Admin (Temp)',
                    role: 'admin'
                };
                setCurrentUser(appUser);
                localStorage.setItem('app_user', JSON.stringify(appUser));
                return true;
            }

            // 2.1 Auto-create Admin if system is empty
            if (allUsersSnapshot.empty && username.toLowerCase() === 'admin') {
                const hashedPassword = await bcrypt.hash(password, 10);
                const newAdmin = {
                    username: 'admin',
                    password: hashedPassword,
                    name: 'Administrator',
                    role: 'admin' as const,
                    createdAt: new Date().toISOString()
                };

                const docRef = await addDoc(usersRef, newAdmin);

                const appUser: AppUser = {
                    id: docRef.id,
                    username: newAdmin.username,
                    name: newAdmin.name,
                    role: newAdmin.role
                };

                setCurrentUser(appUser);
                localStorage.setItem('app_user', JSON.stringify(appUser));
                return true;
            }

            // 3. Check 'users' collection (Admin/Teacher)
            const qUser = query(usersRef, where('username', '==', username));
            const userSnap = await getDocs(qUser);

            if (!userSnap.empty) {
                const userDoc = userSnap.docs[0];
                const userData = userDoc.data();

                // Compare hashed password
                const isMatch = await bcrypt.compare(password, userData.password);
                if (isMatch) {
                    const appUser: AppUser = {
                        id: userDoc.id,
                        username: userData.username,
                        name: userData.name,
                        role: userData.role || 'teacher',
                        avatarUrl: userData.avatarUrl
                    };
                    setCurrentUser(appUser);
                    localStorage.setItem('app_user', JSON.stringify(appUser));
                    return true;
                }
            }

            // 4. Check 'students' collection (Student)
            const qStudent = query(studentsRef, where('username', '==', username));
            const studentSnap = await getDocs(qStudent);

            if (!studentSnap.empty) {
                const studentDoc = studentSnap.docs[0];
                const studentData = studentDoc.data();

                // Compare hashed password
                const isMatch = await bcrypt.compare(password, studentData.password);
                if (isMatch) {
                    const appUser: AppUser = {
                        id: studentDoc.id,
                        username: studentData.username,
                        name: studentData.fullName,
                        role: 'student',
                        studentId: studentDoc.id,
                        mustChangePassword: studentData.mustChangePassword,
                        avatarUrl: studentData.avatarUrl || studentData.photoUrl
                    };
                    setCurrentUser(appUser);
                    localStorage.setItem('app_user', JSON.stringify(appUser));
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('app_user');
    };

    const refreshUserData = async () => {
        if (!currentUser) return;
        try {
            const usersRef = collection(db, 'users');
            const studentsRef = collection(db, 'students');
            let updatedUser: AppUser | null = null;

            if (currentUser.role === 'student') {
                const q = query(studentsRef, where('username', '==', currentUser.username));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    updatedUser = {
                        ...currentUser,
                        name: data.fullName,
                        avatarUrl: data.avatarUrl || data.photoUrl,
                        mustChangePassword: data.mustChangePassword
                    };
                }
            } else {
                const q = query(usersRef, where('username', '==', currentUser.username));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    updatedUser = {
                        ...currentUser,
                        name: data.name,
                        avatarUrl: data.avatarUrl
                    };
                }
            }

            if (updatedUser) {
                setCurrentUser(updatedUser);
                localStorage.setItem('app_user', JSON.stringify(updatedUser));
            }
        } catch (error) {
            console.error("Failed to refresh user data", error);
        }
    };

    const value = {
        currentUser,
        loading,
        login,
        logout,
        refreshUserData
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
