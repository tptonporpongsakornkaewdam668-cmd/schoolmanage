import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TermProvider } from "@/lib/termContext";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import AttendancePage from "./pages/AttendancePage";
import StudentsPage from "./pages/StudentsPage";
import SubjectsPage from "./pages/SubjectsPage";
import SubjectDetailsPage from "./pages/SubjectDetailsPage";
import TimetablePage from "./pages/TimetablePage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import ClassroomDetailsPage from "./pages/ClassroomDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import PrivateRoute from "@/components/PrivateRoute";

import StudentDashboard from "./pages/student/StudentDashboard";
import MySubjectsPage from "./pages/student/MySubjectsPage";
import ScanQRPage from "./pages/student/ScanQRPage";
import AttendanceHistoryPage from "./pages/student/AttendanceHistoryPage";
import ChangePasswordPage from "./pages/student/ChangePasswordPage";
import AssignmentsPage from "./pages/student/AssignmentsPage";
import AdminGuidePage from "./pages/AdminGuidePage";
import AnnouncementsPage from "./pages/AnnouncementsPage";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TermProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<PrivateRoute />}>
                {/* Global Routes */}
                <Route path="/" element={<AppLayout><RoleBasedDashboard /></AppLayout>} />
                <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
                <Route path="/change-password" element={<AppLayout><ChangePasswordPage /></AppLayout>} />

                {/* Teacher Routes */}
                <Route path="/attendance" element={<AppLayout><AttendancePage /></AppLayout>} />
                <Route path="/students" element={<AppLayout><StudentsPage /></AppLayout>} />
                <Route path="/subjects" element={<AppLayout><SubjectsPage /></AppLayout>} />
                <Route path="/subjects/:id" element={<AppLayout><SubjectDetailsPage /></AppLayout>} />
                <Route path="/classrooms" element={<AppLayout><ClassroomsPage /></AppLayout>} />
                <Route path="/classrooms/:id" element={<AppLayout><ClassroomDetailsPage /></AppLayout>} />
                <Route path="/timetable" element={<AppLayout><TimetablePage /></AppLayout>} />
                <Route path="/reports" element={<AppLayout><ReportsPage /></AppLayout>} />
                <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
                <Route path="/announcements" element={<AppLayout><AnnouncementsPage /></AppLayout>} />
                <Route path="/guide" element={<AppLayout><AdminGuidePage /></AppLayout>} />


                {/* Student Routes */}
                <Route path="/my-subjects" element={<AppLayout><MySubjectsPage /></AppLayout>} />
                <Route path="/scan-qr" element={<AppLayout><ScanQRPage /></AppLayout>} />
                <Route path="/attendance-history" element={<AppLayout><AttendanceHistoryPage /></AppLayout>} />
                <Route path="/assignments" element={<AppLayout><AssignmentsPage /></AppLayout>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TermProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

// Placeholder for RoleBasedDashboard to decide which dashboard to show
function RoleBasedDashboard() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'student') {
    return <StudentDashboard />;
  }
  return <Dashboard />;
}

export default App;
