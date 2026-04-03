import { Routes, Route } from 'react-router-dom';
import Events from './components/Events';
import AdminDashboard from './components/AdminDashboard';
import Categories from './components/Categories';
import EventDetail from './components/EventDetail';
import Favorites from './components/Favorites';
import PublicEvents from './components/PublicEvents';
import Login from './components/Login';
import Register from './components/Register';
import Reports from './components/Reports';
import SavedEvents from './components/SavedEvents';

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
      <Route path="/saved-events" element={<SavedEvents />} />
      <Route path="*" element={<PublicEvents />} />
    </Routes>
  );
}

export default App;