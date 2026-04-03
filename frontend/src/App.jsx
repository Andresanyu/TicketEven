import { Routes, Route } from 'react-router-dom';
import Events from './components/Events';
import AdminDashboard from './components/AdminDashboard';
import Categories from './components/Categories';
import EventDetail from './components/EventDetail';
import Favorites from './components/Favorites';
import PublicEvents from './components/PublicEvents';
import Login from './components/Login';

function App() {
  return (
    <Routes>
      {/* Dependiendo de la URL en la que estemos, React Router iluminará el botón correcto */}
      <Route path="/admin_dashboard.html" element={<Sidebar activeItem="inicio" />} />
      <Route path="/events.html" element={<Events />} />
      <Route path="/categories.html" element={<Sidebar activeItem="categorias" />} />
      <Route path="/reports.html" element={<Sidebar activeItem="reportes" />} />
      <Route path="/admin_dashboard.html" element={<AdminDashboard />} />
      <Route path="/categories.html" element={<Categories />} />
      <Route path="/event_card.html" element={<EventDetail />} />
      <Route path="/favorites.html" element={<Favorites />} />
      <Route path="/index.html" element={<PublicEvents />} /> 
      <Route path="/login.html" element={<Login />} />

      {/* Una ruta "comodín" por si alguien entra a una URL que no existe */}
      <Route path="*" element={<Sidebar activeItem="inicio" />} />
    </Routes>
  );
}

export default App;