import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { ShortlistProvider } from './context/ShortlistContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import ShortlistPage from './pages/ShortlistPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import SubmitRequirementPage from './pages/SubmitRequirementPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminRoute from './components/AdminRoute';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPropertiesList from './pages/admin/AdminPropertiesList';
import AdminPropertyForm from './pages/admin/AdminPropertyForm';
import AdminLeadsList from './pages/admin/AdminLeadsList';

function App() {
  return (
    <ParticlesProvider init={loadSlim}>
      <AuthProvider>
        <ShortlistProvider>
          <BrowserRouter>
            <Routes>
              {/* Main Site Routes */}
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/shortlist" element={<ShortlistPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/submit-requirement" element={<SubmitRequirementPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Navigate to="/admin/properties" replace />} />
              <Route
                path="/admin/properties"
                element={
                  <AdminRoute>
                    <AdminPropertiesList />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/enquiries"
                element={
                  <AdminRoute>
                    <AdminLeadsList />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/properties/new"
                element={
                  <AdminRoute>
                    <AdminPropertyForm />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/properties/:id/edit"
                element={
                  <AdminRoute>
                    <AdminPropertyForm />
                  </AdminRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </ShortlistProvider>
      </AuthProvider>
    </ParticlesProvider>
  );
}

export default App;
