import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShortlistProvider } from './context/ShortlistContext';
import { AuthProvider } from './context/AuthContext';
import { GoogleMapsProvider } from './context/GoogleMapsContext';
import { LocationPermissionProvider } from './hooks/useLocationPermission';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import { PropertyAccessProvider } from './lib/propertyAccess';
import { PG_MANAGEMENT_ENABLED } from './lib/featureFlags';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import AnyAdminRoute from './components/AnyAdminRoute';
import CrmModuleRoute from './components/CrmModuleRoute';
import EmployeeRoute from './components/EmployeeRoute';
import PageLoader from './components/PageLoader';


const HomePage = lazy(() => import('./pages/HomePage'));

const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const ShortlistPage = lazy(() => import('./pages/ShortlistPage'));
const MyListingsPage = lazy(() => import('./pages/MyListingsPage'));
const QuickPickPage = lazy(() => import('./pages/QuickPickPage'));
const ListPropertyPage = lazy(() => import('./pages/ListPropertyPage'));
const PartnerHowItWorksPage = lazy(() => import('./pages/PartnerHowItWorksPage'));
const PartnerRegisterPage = lazy(() => import('./pages/PartnerRegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard'));
const PartnerTermsPage = lazy(() => import('./pages/PartnerTermsPage'));
const PartnerPrivacyPage = lazy(() => import('./pages/PartnerPrivacyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SubmitRequirementPage = lazy(() => import('./pages/SubmitRequirementPage'));
const RequirementsBoardPage = lazy(() => import('./pages/RequirementsBoardPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const EmiCalculatorPage = lazy(() => import('./pages/EmiCalculatorPage'));
const RentalYieldCalculatorPage = lazy(() => import('./pages/RentalYieldCalculatorPage'));
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
const CrmAssignedClients = lazy(() => import('./pages/crm/CrmAssignedClients'));
const CrmBookings = lazy(() => import('./pages/crm/CrmBookings'));
const CrmLedgers = lazy(() => import('./pages/crm/CrmLedgers'));
const CrmEmployeeDashboard = lazy(() => import('./pages/crm/CrmEmployeeDashboard'));
const CrmAttendance = lazy(() => import('./pages/crm/CrmAttendance'));
const CrmGeofences = lazy(() => import('./pages/crm/CrmGeofences'));
const CrmPayroll = lazy(() => import('./pages/crm/CrmPayroll'));
const CrmMyBookings = lazy(() => import('./pages/crm/CrmMyBookings'));
const CrmPartnership = lazy(() => import('./pages/crm/CrmPartnership'));
const CrmPartnerDetail = lazy(() => import('./pages/crm/CrmPartnerDetail'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const AdminCareersPage = lazy(() => import('./pages/admin/AdminCareersPage'));
const AdminTeamPage = lazy(() => import('./pages/admin/AdminTeamPage'));
const AdminStorage = lazy(() => import('./pages/admin/AdminStorage'));
const AdminPayrollPage = lazy(() => import('./pages/admin/AdminPayrollPage'));
const AdminPgManagement = lazy(() => import('./pages/admin/AdminPgManagement'));
const PgManagementPage = lazy(() => import('./pages/PgManagementPage'));

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function AppRoutes() {
  // Performance: render routes immediately. Site settings stream in async
  // (SiteSettingsContext starts its subscription after first paint) — gating
  // every route on that roundtrip used to delay FCP/LCP on all pages.
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LazyPage><HomePage /></LazyPage>} />
        <Route path="/properties" element={<LazyPage><PropertiesPage /></LazyPage>} />
        <Route path="/properties/:id" element={<LazyPage><PropertyDetailPage /></LazyPage>} />
        <Route path="/shortlist" element={<LazyPage><ShortlistPage /></LazyPage>} />
        <Route path="/my-listings" element={<LazyPage><MyListingsPage /></LazyPage>} />
        <Route path="/quick-pick" element={<LazyPage><QuickPickPage /></LazyPage>} />
        <Route path="/list-property" element={<LazyPage><ListPropertyPage /></LazyPage>} />
        <Route path="/partner-register" element={<LazyPage><PartnerRegisterPage /></LazyPage>} />
        <Route path="/login" element={<LazyPage><LoginPage /></LazyPage>} />
        <Route path="/partner" element={<LazyPage><PartnerHowItWorksPage /></LazyPage>} />
        <Route path="/partner-dashboard" element={<LazyPage><PartnerDashboard /></LazyPage>} />
        <Route path="/partner-terms" element={<LazyPage><PartnerTermsPage /></LazyPage>} />
        <Route path="/partner-privacy" element={<LazyPage><PartnerPrivacyPage /></LazyPage>} />
        <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
        <Route path="/contact" element={<LazyPage><ContactPage /></LazyPage>} />
        <Route path="/submit-requirement" element={<LazyPage><SubmitRequirementPage /></LazyPage>} />
        <Route path="/requirements" element={<LazyPage><RequirementsBoardPage /></LazyPage>} />
        <Route path="/emi-calculator" element={<LazyPage><EmiCalculatorPage /></LazyPage>} />
        <Route path="/rental-yield-calculator" element={<LazyPage><RentalYieldCalculatorPage /></LazyPage>} />
        <Route path="/privacy" element={<LazyPage><PrivacyPolicyPage /></LazyPage>} />
        <Route path="/disclaimer" element={<LazyPage><DisclaimerPage /></LazyPage>} />
        <Route path="/terms" element={<LazyPage><TermsPage /></LazyPage>} />
        <Route path="/careers" element={<LazyPage><CareersPage /></LazyPage>} />
        {/* PG Management is temporarily disabled — flip the flag in src/lib/featureFlags.ts to re-enable. */}
        {PG_MANAGEMENT_ENABLED ? (
          <Route path="/pg-management" element={<LazyPage><PgManagementPage /></LazyPage>} />
        ) : (
          <Route path="/pg-management" element={<Navigate to="/" replace />} />
        )}
        <Route path="/team" element={<LazyPage><TeamPage /></LazyPage>} />
        <Route path="/bangalore-land-investment-guide" element={<Navigate to="/properties" replace />} />
        <Route path="/blog" element={<LazyPage><BlogPage /></LazyPage>} />
        <Route path="/blog/:slug" element={<LazyPage><BlogPostPage /></LazyPage>} />
        <Route path="/post-requirement" element={<Navigate to="/submit-requirement" replace />} />
        <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
      </Route>

      <Route path="/map" element={<Navigate to="/properties" replace />} />
      <Route path="/admin/login" element={<LazyPage><AdminLogin /></LazyPage>} />
      <Route path="/employee-login" element={<LazyPage><EmployeeLogin /></LazyPage>} />
      <Route path="/admin" element={<Navigate to="/admin/properties" replace />} />
      {/* Granted users (can_add_property) share these two routes with full
          admins — each page picks its own chrome based on access level. */}
      <Route
        path="/admin/properties"
        element={
          <AnyAdminRoute>
            <LazyPage><AdminPropertiesList /></LazyPage>
          </AnyAdminRoute>
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
          <AnyAdminRoute>
            <LazyPage><AdminPropertyForm /></LazyPage>
          </AnyAdminRoute>
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
        path="/admin/careers"
        element={
          <AdminRoute>
            <LazyPage><AdminCareersPage /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/team"
        element={
          <AdminRoute>
            <LazyPage><AdminTeamPage /></LazyPage>
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
      {PG_MANAGEMENT_ENABLED ? (
        <Route
          path="/admin/pg-management"
          element={
            <AdminRoute>
              <LazyPage><AdminPgManagement /></LazyPage>
            </AdminRoute>
          }
        />
      ) : (
        <Route path="/admin/pg-management" element={<Navigate to="/admin/properties" replace />} />
      )}
      <Route
        path="/crm"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmHome /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/partnership"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmPartnership /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/partnership/partners/:partnerId"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmPartnerDetail /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/leads"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmLeads /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/assigned-clients"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmAssignedClients /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/bookings"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmBookings /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/ledgers"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmLedgers /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/earnings"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmEarnings /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/requirements"
        element={
          <CrmModuleRoute>
            <LazyPage><AdminLeads /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/requirements/:id"
        element={
          <CrmModuleRoute>
            <LazyPage><LeadDetail /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/agents"
        element={
          <CrmModuleRoute>
            <LazyPage><AdminAgents /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/employees"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmEmployees /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/employees/new"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmEmployeeForm /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/employees/:id"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmEmployeeDetail /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/employees/:id/dashboard"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmEmployeeDashboard /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/employees/:id/edit"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmEmployeeForm /></LazyPage>
          </CrmModuleRoute>
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
          <CrmModuleRoute>
            <LazyPage><CrmStorage /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/attendance"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmAttendance /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/geofences"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmGeofences /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/payroll"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmPayroll /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/my-bookings"
        element={
          <EmployeeRoute>
            <LazyPage><CrmMyBookings /></LazyPage>
          </EmployeeRoute>
        }
      />
      <Route
        path="/crm/events"
        element={
          <CrmModuleRoute>
            <LazyPage><CrmEvents /></LazyPage>
          </CrmModuleRoute>
        }
      />
      <Route
        path="/crm/profile"
        element={
          <CrmModuleRoute>
            <LazyPage><AdminProfile /></LazyPage>
          </CrmModuleRoute>
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
      <PropertyAccessProvider>
        <LocationPermissionProvider>
          <ShortlistProvider>
            <GoogleMapsProvider>
              <SiteSettingsProvider>
                <AppRoutesWrapper />
              </SiteSettingsProvider>
            </GoogleMapsProvider>
          </ShortlistProvider>
        </LocationPermissionProvider>
      </PropertyAccessProvider>
    </AuthProvider>
  );
}

export default App;
