// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import TeacherDashboard from './pages/TeacherDashboard';
// Import muna natin ang mga ito kahit wala pang laman, gagawin natin mamaya
import StudentsList from './pages/StudentsList';
import ManageLessons from './pages/ManageLessons';
import ManageQuestions from './pages/ManageQuestions';
import ViewAnalytics from './pages/ViewAnalytics';
import ClassRecords from './pages/ClassRecords';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Lahat ng routes na nasa loob ng Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/students" element={<StudentsList />} />
          <Route path="/lessons" element={<ManageLessons />} />
          <Route path="/questions" element={<ManageQuestions />} />
          <Route path="/analytics/:studentId" element={<ViewAnalytics />} />
          <Route path="/records" element={<ClassRecords />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;