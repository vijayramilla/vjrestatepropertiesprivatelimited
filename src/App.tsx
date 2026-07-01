import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShortlistProvider } from './context/ShortlistContext';
import { AuthProvider } from './context/AuthContext';
import { GoogleMapsProvider, useGoogleMapsLoader } from './context/GoogleMapsContext';
import { LocationPermissionProvider } from './hooks/useLocationPermission';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import PageLoader from './components/PageLoader';
import MapLoadingSkeleton from './components/map/MapLoadingSkeleton';

const HomePage = lazy(() => import('./pages/HomePage'));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const ShortlistPage = lazy(() => import('./pages/ShortlistPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SubmitRequirementPage = lazy(() => import('./pages/SubmitRequirementPage'));
const RequirementsBoardPage = lazy(() => import('./pages/RequirementsBoardPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const BangaloreMap = lazy(() => import('./pages/BangaloreMap'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminPropertiesList = lazy(() => import('./pages/admin/AdminPropertiesList'));
const AdminPropertyForm = lazy(() => import('./pages/admin/AdminPropertyForm'));
const AdminLeadsList = lazy(() => import('./pages/admin/AdminLeadsList'));
const AdminUsersList = lazy(() => import('./pages/admin/AdminUsersList'));
const AdminRequirementsList = lazy(() => import('./pages/admin/AdminRequirementsList'));
const AdminPostRequirementPage = lazy(() => import('./pages/admin/AdminPostRequirementPage'));

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function MapPage() {
  const { isLoaded, loadError } = useGoogleMapsLoader();

  if (loadError) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-white px-6 text-center md:h-[calc(100vh-4rem)]">
        <div className="max-w-md">
          <p className="font-medium text-gray-900">Failed to load Google Maps</p>
          <p className="mt-2 text-sm text-gray-500">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <MapLoadingSkeleton />;
  }

  return (
    <Suspense fallback={<MapLoadingSkeleton />}>
      <BangaloreMap isLoaded={isLoaded} />
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationPermissionProvider>
        <ShortlistProvider>
          <GoogleMapsProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<LazyPage><HomePage /></LazyPage>} />
                  <Route path="/properties" element={<LazyPage><PropertiesPage /></LazyPage>} />
                  <Route path="/properties/:id" element={<LazyPage><PropertyDetailPage /></LazyPage>} />
                  <Route path="/shortlist" element={<LazyPage><ShortlistPage /></LazyPage>} />
                  <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
                  <Route path="/contact" element={<LazyPage><ContactPage /></LazyPage>} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/submit-requirement" element={<LazyPage><SubmitRequirementPage /></LazyPage>} />
                  <Route path="/requirements" element={<LazyPage><RequirementsBoardPage /></LazyPage>} />
                  <Route path="/post-requirement" element={<Navigate to="/submit-requirement" replace />} />
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
                  path="/admin/requirements"
                  element={
                    <AdminRoute>
                      <LazyPage><AdminRequirementsList /></LazyPage>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/requirements/new"
                  element={
                    <AdminRoute>
                      <LazyPage><AdminPostRequirementPage /></LazyPage>
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
          </GoogleMapsProvider>
        </ShortlistProvider>
      </LocationPermissionProvider>
    </AuthProvider>
  );
}

export default App;
