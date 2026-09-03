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
import EmployeeRoute from './components/EmployeeRoute';
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
const EmployeeLogin = lazy(() => import('./pages/crm/EmployeeLogin'));
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

const CrmEarnings = lazy(() => import('./pages/admin/CrmEarnings'));
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'));
const LeadDetail = lazy(() => import('./pages/admin/LeadDetail'));
const AdminAgents = lazy(() => import('./pages/admin/AdminAgents'));
const AdminProfile = lazy(() => import('./pages/crm/AdminProfile'));
const CrmEmployees = lazy(() => import('./pages/crm/CrmEmployees'));
const CrmStorage = lazy(() => import('./pages/crm/CrmStorage'));
const CrmEvents = lazy(() => import('./pages/crm/CrmEvents'));
const CrmHome = lazy(() => import('./pages/crm/CrmHome'));
const CrmEmployeeForm = lazy(() => import('./pages/crm/CrmEmployeeForm'));
const CrmEmployeeDetail = lazy(() => import('./pages/crm/CrmEmployeeDetail'));
const CrmMyClients = lazy(() => import('./pages/crm/CrmMyClients'));
const CrmLeads = lazy(() => import('./pages/crm/CrmLeads'));
const CrmEmployeeDashboard = lazy(() => import('./pages/crm/CrmEmployeeDashboard'));
const CrmAttendance = lazy(() => import('./pages/crm/CrmAttendance'));
const CrmGeofences = lazy(() => import('./pages/crm/CrmGeofences'));
const PremiumValuationPage = lazy(() => import('./pages/PremiumValuationPage'));
const ListPropertyPage = lazy(() => import('./pages/ListPropertyPage'));
const MyListingsPage = lazy(() => import('./pages/MyListingsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const VastuCalculatorPage = lazy(() => import('./pages/VastuCalculatorPage'));
const BangaloreLandInvestmentGuide = lazy(() => import('./pages/BangaloreLandInvestmentGuide'));
const AuctionsPage = lazy(() => import('./pages/AuctionsPage'));
const AdminAuctions = lazy(() => import('./pages/admin/AdminAuctions'));
const AdminAuctionForm = lazy(() => import('./pages/admin/AdminAuctionForm'));
const AdminCareersPage = lazy(() => import('./pages/admin/AdminCareersPage'));
const AdminStorage = lazy(() => import('./pages/admin/AdminStorage'));
const AdminPayrollPage = lazy(() => import('./pages/admin/AdminPayrollPage'));
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
        <Route path="/vastu-calculator" element={<Navigate to="/properties" replace />} />
        <Route path="/property-valuation" element={<Navigate to="/properties" replace />} />
        <Route path="/privacy" element={<LazyPage><PrivacyPolicyPage /></LazyPage>} />
        <Route path="/careers" element={<LazyPage><CareersPage /></LazyPage>} />
        <Route path="/bangalore-land-investment-guide" element={<LazyPage><BangaloreLandInvestmentGuide /></LazyPage>} />
        {/* <Route path="/ar-video" element={<LazyPage><ARVideoPage /></LazyPage>} /> */}
        <Route path="/blog" element={<LazyPage><BlogPage /></LazyPage>} />
        <Route path="/blog/:slug" element={<LazyPage><BlogPostPage /></LazyPage>} />
        <Route path="/post-requirement" element={<Navigate to="/submit-requirement" replace />} />
        <Route path="/auctions" element={<LazyPage><AuctionsPage /></LazyPage>} />
        <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
      </Route>

      <Route path="/map" element={<Navigate to="/properties" replace />} />
      <Route path="/admin/login" element={<LazyPage><AdminLogin /></LazyPage>} />
      <Route path="/employee-login" element={<LazyPage><EmployeeLogin /></LazyPage>} />
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
        path="/admin/auctions"
        element={
          <AdminRoute>
            <LazyPage><AdminAuctions /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/auctions/new"
        element={
          <AdminRoute>
            <LazyPage><AdminAuctionForm /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/auctions/:id/edit"
        element={
          <AdminRoute>
            <LazyPage><AdminAuctionForm /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/careers"
        element={
          <AdminRoute>
            <LazyPage><AdminCareersPage /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/storage"
        element={
          <AdminRoute>
            <LazyPage><AdminStorage /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/payroll"
        element={
          <AdminRoute>
            <LazyPage><AdminPayrollPage /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <CrmRoute>
            <LazyPage><CrmHome /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/leads"
        element={
          <CrmRoute>
            <LazyPage><CrmLeads /></LazyPage>
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
        path="/crm/employees"
        element={
          <CrmRoute>
            <LazyPage><CrmEmployees /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/employees/new"
        element={
          <CrmRoute>
            <LazyPage><CrmEmployeeForm /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/employees/:id"
        element={
          <CrmRoute>
            <LazyPage><CrmEmployeeDetail /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/employees/:id/dashboard"
        element={
          <CrmRoute>
            <LazyPage><CrmEmployeeDashboard /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/employees/:id/edit"
        element={
          <CrmRoute>
            <LazyPage><CrmEmployeeForm /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/my-clients"
        element={
          <EmployeeRoute>
            <LazyPage><CrmMyClients /></LazyPage>
          </EmployeeRoute>
        }
      />
      <Route
        path="/crm/dashboard"
        element={
          <EmployeeRoute>
            <LazyPage><CrmEmployeeDashboard /></LazyPage>
          </EmployeeRoute>
        }
      />
      <Route
        path="/crm/storage"
        element={
          <CrmRoute>
            <LazyPage><CrmStorage /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/attendance"
        element={
          <CrmRoute>
            <LazyPage><CrmAttendance /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/geofences"
        element={
          <CrmRoute>
            <LazyPage><CrmGeofences /></LazyPage>
          </CrmRoute>
        }
      />
      <Route
        path="/crm/events"
        element={
          <CrmRoute>
            <LazyPage><CrmEvents /></LazyPage>
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

function AppRoutesWrapper() {
  const isLegal = window.location.pathname.startsWith('/legal');
  return (
    <BrowserRouter basename={isLegal ? '/legal' : undefined}>
      <AppRoutes />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationPermissionProvider>
        <ShortlistProvider>
          <GoogleMapsProvider>
            <SiteSettingsProvider>
              <AppRoutesWrapper />
            </SiteSettingsProvider>
          </GoogleMapsProvider>
        </ShortlistProvider>
      </LocationPermissionProvider>
    </AuthProvider>
  );
}

export default App;
