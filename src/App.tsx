import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShortlistProvider } from './context/ShortlistContext';
import { AuthProvider } from './context/AuthContext';
import { LocationPermissionProvider } from './hooks/useLocationPermission';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import PageLoader from './components/PageLoader';

const HomePage = lazy(() => import('./pages/HomePage'));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const ShortlistPage = lazy(() => import('./pages/ShortlistPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SubmitRequirementPage = lazy(() => import('./pages/SubmitRequirementPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminPropertiesList = lazy(() => import('./pages/admin/AdminPropertiesList'));
const AdminPropertyForm = lazy(() => import('./pages/admin/AdminPropertyForm'));
const AdminLeadsList = lazy(() => import('./pages/admin/AdminLeadsList'));
const AdminUsersList = lazy(() => import('./pages/admin/AdminUsersList'));

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function App() {
  return (
    <AuthProvider>
      <LocationPermissionProvider>
        <ShortlistProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LazyPage><HomePage /></LazyPage>} />
              <Route path="/properties" element={<LazyPage><PropertiesPage /></LazyPage>} />
              <Route path="/properties/:id" element={<LazyPage><PropertyDetailPage /></LazyPage>} />
              <Route path="/shortlist" element={<LazyPage><ShortlistPage /></LazyPage>} />
              <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
              <Route path="/contact" element={<LazyPage><ContactPage /></LazyPage>} />
              <Route path="/submit-requirement" element={<LazyPage><SubmitRequirementPage /></LazyPage>} />
              <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
            </Route>

            <Route path="/admin/login" element={<LazyPage><AdminLogin /></LazyPage>} />
            <Route path="/admin" element={<Navigate to="/admin/properties" replace />} />
            <Route
              path="/admin/properties"
              element={
                <AdminRoute>
                  <LazyPage><AdminPropertiesList /></LazyPage>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/enquiries"
              element={
                <AdminRoute>
                  <LazyPage><AdminLeadsList /></LazyPage>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <LazyPage><AdminUsersList /></LazyPage>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/properties/new"
              element={
                <AdminRoute>
                  <LazyPage><AdminPropertyForm /></LazyPage>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/properties/:id/edit"
              element={
                <AdminRoute>
                  <LazyPage><AdminPropertyForm /></LazyPage>
                </AdminRoute>
              }
            />
          </Routes>
        </BrowserRouter>
        </ShortlistProvider>
      </LocationPermissionProvider>
    </AuthProvider>
  );
}

export default App;
