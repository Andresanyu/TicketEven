import { Routes, Route } from 'react-router-dom';
import Events from './pages/Events';
import AdminDashboard from './pages/AdminDashboard';
import Categories from './pages/Categories';
import EventDetail from './pages/EventDetail';
import Favorites from './pages/Favorites';
import PublicEvents from './pages/PublicEvents';
import Login from './pages/Login';
import Register from './pages/Register';
import CapacityReport from './pages/CapacityReport';
import Reports from './pages/Reports';
import SavedEvents from './pages/SavedEvents';
import PurchaseHistory from './pages/PurchaseHistory';
import AdminRedirect from './components/AdminRedirect';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminRedirect><PublicEvents /></AdminRedirect>} />
      <Route path="/login" element={<AdminRedirect><Login /></AdminRedirect>} />
      <Route path="/register" element={<AdminRedirect><Register /></AdminRedirect>} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/events" element={<Events />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/event" element={<AdminRedirect><EventDetail /></AdminRedirect>} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/capacity-report" element={<CapacityReport />} />
      <Route path="/saved-events" element={<AdminRedirect><SavedEvents /></AdminRedirect>} />
      <Route path="/my-purchases" element={<AdminRedirect><PurchaseHistory /></AdminRedirect>} />
      <Route path="*" element={<AdminRedirect><PublicEvents /></AdminRedirect>} />
    </Routes>
  );
}

export default App;