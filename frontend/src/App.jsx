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

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicEvents />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/events" element={<Events />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/event" element={<EventDetail />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/capacity-report" element={<CapacityReport />} />
      <Route path="/saved-events" element={<SavedEvents />} />
      <Route path="*" element={<PublicEvents />} />
      <Route path="/my-purchases" element={<PurchaseHistory />} />
    </Routes>
  );
}

export default App;