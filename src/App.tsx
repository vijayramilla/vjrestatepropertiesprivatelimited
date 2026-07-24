import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShortlistProvider } from './context/ShortlistContext';
import { AuthProvider } from './context/AuthContext';
import { GoogleMapsProvider, useGoogleMapsLoader } from './context/GoogleMapsContext';
import { LocationPermissionProvider } from './hooks/useLocationPermission';
import { SiteSettingsProvider, useSiteSettings } from './context/SiteSettingsContext';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import CrmRoute from './components/CrmRoute';
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
const EmiCalculatorPage = lazy(() => import('./pages/EmiCalculatorPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminPropertiesList = lazy(() => import('./pages/admin/AdminPropertiesList'));
const AdminPropertyForm = lazy(() => import('./pages/admin/AdminPropertyForm'));
const AdminLeadsList = lazy(() => import('./pages/admin/AdminLeadsList'));
const AdminUsersList = lazy(() => import('./pages/admin/AdminUsersList'));
const AdminRequirementsList = lazy(() => import('./pages/admin/AdminRequirementsList'));
const AdminPostRequirementPage = lazy(() => import('./pages/admin/AdminPostRequirementPage'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminListingsDashboard = lazy(() => import('./pages/admin/AdminListingsDashboard'));
const AdminBlogPosts = lazy(() => import('./pages/admin/AdminBlogPosts'));
const AdminBlogPostForm = lazy(() => import('./pages/admin/AdminBlogPostForm'));
const AdminOwnerContacts = lazy(() => import('./pages/admin/AdminOwnerContacts'));
const AdminCrm = lazy(() => import('./pages/admin/AdminCrm'));
const CrmEarnings = lazy(() => import('./pages/admin/CrmEarnings'));
const CrmData = lazy(() => import('./pages/admin/CrmData'));
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'));
const LeadDetail = lazy(() => import('./pages/admin/LeadDetail'));
const AdminAgents = lazy(() => import('./pages/admin/AdminAgents'));
const AdminMongoDbData = lazy(() => import('./pages/admin/AdminMongoDbData'));
const AdminProfile = lazy(() => import('./pages/crm/AdminProfile'));
const PremiumValuationPage = lazy(() => import('./pages/PremiumValuationPage'));
const ListPropertyPage = lazy(() => import('./pages/ListPropertyPage'));
const MyListingsPage = lazy(() => import('./pages/MyListingsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const VastuCalculatorPage = lazy(() => import('./pages/VastuCalculatorPage'));
const BangaloreLandInvestmentGuide = lazy(() => import('./pages/BangaloreLandInvestmentGuide'));
// const ARVideoPage = lazy(() => import('./pages/ARVideoPage'));

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function MapPage() {
  const { isLoaded, loadError } = useGoogleMapsLoader();

  if (loadError) {
    console.error('[Maps] Google Maps load error:', loadError.message);
    return (
      <div className="flex h-dvh items-center justify-center bg-white px-6 text-center">
        <div className="max-w-md space-y-3">
          <p className="font-medium text-gray-900">Oops! Something went wrong</p>
          <p className="text-sm text-gray-500">The map couldn't load.</p>
          <p className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700 font-mono">{loadError.message}</p>
          <p className="text-xs text-gray-400">Check Google Cloud Console - APIs & Services - ensure Maps JavaScript API + Places API are enabled and billing is active.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <MapLoadingSkeleton />;
  }

  return (
    <Suspense fallback={<MapLoadingSkeleton />}>
      <BangaloreMap isLoaded={isLoaded} noHeaderOffset />
    </Suspense>
  );
}

function AppRoutes() {
  const { loading } = useSiteSettings();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          </div>
          <p className="mt-4 font-sans text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LazyPage><HomePage /></LazyPage>} />
        <Route path="/properties" element={<LazyPage><PropertiesPage /></LazyPage>} />
        <Route path="/properties/:id" element={<LazyPage><PropertyDetailPage /></LazyPage>} />
        <Route path="/shortlist" element={<LazyPage><ShortlistPage /></LazyPage>} />
        <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
        <Route path="/contact" element={<LazyPage><ContactPage /></LazyPage>} />
        <Route path="/list-property" element={<LazyPage><ListPropertyPage /></LazyPage>} />
        <Route path="/my-listings" element={<LazyPage><MyListingsPage /></LazyPage>} />
        <Route path="/submit-requirement" element={<LazyPage><SubmitRequirementPage /></LazyPage>} />
        <Route path="/requirements" element={<LazyPage><RequirementsBoardPage /></LazyPage>} />
        <Route path="/emi-calculator" element={<LazyPage><EmiCalculatorPage /></LazyPage>} />
        <Route path="/vastu-calculator" element={<LazyPage><VastuCalculatorPage /></LazyPage>} />
        <Route path="/property-valuation" element={<LazyPage><PremiumValuationPage /></LazyPage>} />
        <Route path="/privacy" element={<LazyPage><PrivacyPolicyPage /></LazyPage>} />
        <Route path="/careers" element={<LazyPage><CareersPage /></LazyPage>} />
        <Route path="/bangalore-land-investment-guide" element={<LazyPage><BangaloreLandInvestmentGuide /></LazyPage>} />
        {/* <Route path="/ar-video" element={<LazyPage><ARVideoPage /></LazyPage>} /> */}
        <Route path="/blog" element={<LazyPage><BlogPage /></LazyPage>} />
        <Route path="/blog/:slug" element={<LazyPage><BlogPostPage /></LazyPage>} />
        <Route path="/post-requirement" element={<Navigate to="/submit-requirement" replace />} />
        <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
      </Route>

      <Route path="/map" element={<MapPage />} />
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
        path="/admin/listings"
        element={
          <AdminRoute>
            <LazyPage><AdminListingsDashboard /></LazyPage>
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
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <LazyPage><AdminSettings /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/blog"
        element={
          <AdminRoute>
            <LazyPage><AdminBlogPosts /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/blog/new"
        element={
          <AdminRoute>
            <LazyPage><AdminBlogPostForm /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/blog/:documentId/edit"
        element={
          <AdminRoute>
            <LazyPage><AdminBlogPostForm /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/owner-contacts"
        element={
          <AdminRoute>
            <LazyPage><AdminOwnerContacts /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <CrmRoute>
            <LazyPage><AdminCrm /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/earnings"
        element={
          <CrmRoute>
            <LazyPage><CrmEarnings /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/data"
        element={
          <CrmRoute>
            <LazyPage><CrmData /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/requirements"
        element={
          <CrmRoute>
            <LazyPage><AdminLeads /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/requirements/:id"
        element={
          <CrmRoute>
            <LazyPage><LeadDetail /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/agents"
        element={
          <CrmRoute>
            <LazyPage><AdminAgents /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/mongodb-data"
        element={
          <CrmRoute>
            <LazyPage><AdminMongoDbData /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/profile"
        element={
          <CrmRoute>
            <LazyPage><AdminProfile /></LazyPage>
          </CrmRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationPermissionProvider>
        <ShortlistProvider>
          <GoogleMapsProvider>
            <SiteSettingsProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </SiteSettingsProvider>
          </GoogleMapsProvider>
        </ShortlistProvider>
      </LocationPermissionProvider>
    </AuthProvider>
  );
}

export default App;
