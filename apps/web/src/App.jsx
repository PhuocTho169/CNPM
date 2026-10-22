import { Routes, Route } from 'react-router-dom';
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#b3261e' }}>
          <h2>Lỗi hiển thị trang</h2>
          <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '1rem', borderRadius: 8, overflow: 'auto', maxWidth: 600, margin: '1rem auto' }}>
            {this.state.error?.message || this.state.error}
          </pre>
          <p style={{ color: '#6d6156' }}>Vui lòng kiểm tra console (F12) hoặc làm mới trang (Ctrl+F5).</p>
        </div>
      );
    }
    return this.props.children;
  }
}
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import PlaceGuide from './pages/PlaceGuide';
import FoodRoutes from './pages/FoodRoutes';
import MapPage from './pages/MapPage';
import About from './pages/About';
import DishDetail from './pages/DishDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import AdminPlaces from './admin/AdminPlaces';
import PlaceEditor from './admin/PlaceEditor';
import AdminDishes from './admin/AdminDishes';
import AdminCategories from './admin/AdminCategories';
import AdminRoutes from './admin/AdminRoutes';
import AdminLanguages from './admin/AdminLanguages';
import AdminUsers from './admin/AdminUsers';
import AdminSettings from './admin/AdminSettings';

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="places" element={<AdminPlaces />} />
        <Route path="places/:id" element={<PlaceEditor />} />
        <Route path="dishes" element={<AdminDishes />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="routes" element={<AdminRoutes />} />
        <Route path="languages" element={<AdminLanguages />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/place/:id" element={<PlaceGuide />} />
        <Route path="/dish/:id" element={<DishDetail />} />
        <Route path="/routes" element={<FoodRoutes />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
