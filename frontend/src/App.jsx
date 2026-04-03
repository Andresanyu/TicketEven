import { Routes, Route } from 'react-router-dom';
import Events from './components/Events';

function App() {
  return (
    <Routes>
      {/* Dependiendo de la URL en la que estemos, React Router iluminará el botón correcto */}
      <Route path="/admin_dashboard.html" element={<Sidebar activeItem="inicio" />} />
      <Route path="/events.html" element={<Events />} />
      <Route path="/categories.html" element={<Sidebar activeItem="categorias" />} />
      <Route path="/reports.html" element={<Sidebar activeItem="reportes" />} />
      
      {/* Una ruta "comodín" por si alguien entra a una URL que no existe */}
      <Route path="*" element={<Sidebar activeItem="inicio" />} />
    </Routes>
  );
}

export default App;