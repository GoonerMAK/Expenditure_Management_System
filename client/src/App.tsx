import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import Analytics from './pages/analytics';
import Role from './pages/roles';
import AddCategory from './pages/add-category';
import AddFinancial from './pages/add-financial';
import AddProject from './pages/add-project';
import UpdateProject from './pages/update-project';
import { Signup } from './pages/signup';
import ProtectedRoute from './components/protected-route';
import GuestRoute from './components/guest-route';


function App() {
  return (
      <Router>
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/" element={<ProtectedRoute allowedRoles={['Read-only', 'Contributor', 'Administrator']}><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Read-only', 'Contributor', 'Administrator']}><Dashboard /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['Read-only', 'Contributor', 'Administrator']}><Analytics /></ProtectedRoute>} />
            <Route path="/users-roles" element={<ProtectedRoute allowedRoles={['Administrator']}><Role /></ProtectedRoute>} />
            <Route path="/add-category" element={<ProtectedRoute allowedRoles={['Contributor', 'Administrator']}><AddCategory /></ProtectedRoute>} />
            <Route path="/add-project" element={<ProtectedRoute allowedRoles={['Contributor', 'Administrator']}><AddProject /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute allowedRoles={['Read-only', 'Contributor', 'Administrator']}><UpdateProject /></ProtectedRoute>} />
            <Route path="/add-financial-info" element={<ProtectedRoute allowedRoles={['Contributor', 'Administrator']}><AddFinancial /></ProtectedRoute>} />
          </Routes>
      </Router>
      
  );
}

export default App;
