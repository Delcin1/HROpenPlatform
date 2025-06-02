import { Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Restore } from './pages/Restore';
import { Profile } from './pages/Profile';
import { Companies } from './pages/Companies';
import { CompanyDetails } from './pages/CompanyDetails';
import { NewCompany } from './pages/NewCompany';
import { CV } from './pages/CV';
import { UserProfile } from './pages/UserProfile';
import { SearchProfiles } from './pages/SearchProfiles';
import { Chat } from './pages/Chat';
import { CallHistory } from './pages/CallHistory';
import { Jobs } from './pages/Jobs';
import { MyJobs } from './pages/MyJobs';
import { JobDetails } from './pages/JobDetails';
import { JobForm } from './pages/JobForm';
import { ResumeDatabase } from './pages/ResumeDatabase';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/restore" element={<Restore />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigation />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/profile" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/new" element={<NewCompany />} />
        <Route path="companies/:id" element={<CompanyDetails />} />
        <Route path="cv" element={<CV />} />
        <Route path="resume-database" element={<ResumeDatabase />} />
        <Route path="profile/:guid" element={<UserProfile />} />
        <Route path="search" element={<SearchProfiles />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:chatId" element={<Chat />} />
        <Route path="calls" element={<CallHistory />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/my" element={<MyJobs />} />
        <Route path="jobs/new" element={<JobForm />} />
        <Route path="jobs/edit/:jobId" element={<JobForm />} />
        <Route path="jobs/:jobId" element={<JobDetails />} />
      </Route>
    </Routes>
  );
}; 