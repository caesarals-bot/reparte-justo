import { lazy } from "react"
import { createBrowserRouter } from "react-router"
import { ProtectedRoute } from "@/router/ProtectedRoute"

const LayoutPage = lazy(() => import("../appPropinaSegura/home/layout/LayoutPage"))
const LandingPage = lazy(() => import("../appPropinaSegura/home/LandingPage"))
const LoginPage = lazy(() => import("@/auth/LoginPage"))
const RegisterPage = lazy(() => import("@/auth/RegisterPage"))
const ResetPasswordPage = lazy(() => import("@/auth/ResetPasswordPage"))
const PendingPage = lazy(() => import("@/pages/PendingPage"))
const AcceptInvitationPage = lazy(() => import("@/pages/AcceptInvitationPage"))
const InitialSetupPage = lazy(() => import("../appPropinaSegura/setup/InitialSetupPage"))
const CierreDiarioPage = lazy(() => import("@/appPropinaSegura/cierre/CierreDiarioPage"))
const DashboardPage = lazy(() => import("@/appPropinaSegura/dashboard/DashboardPage"))
const ClosureDetailPage = lazy(() => import("@/appPropinaSegura/dashboard/ClosureDetailPage"))
const LiquidacionPage = lazy(() => import("@/appPropinaSegura/dashboard/LiquidacionPage"))
const PaidSettlementsPage = lazy(() => import("@/appPropinaSegura/dashboard/PaidSettlementsPage"))
const StaffManagementPage = lazy(() => import("@/appPropinaSegura/staff/StaffManagementPage"))
const RestaurantSettingsPage = lazy(() => import("@/appPropinaSegura/settings/RestaurantSettingsPage"))
const AdminLayout = lazy(() => import("@/appPropinaSegura/admin/components/AdminLayout"))
const AdminOverviewPage = lazy(() => import("@/appPropinaSegura/admin/pages/AdminOverviewPage"))
const AdminRestaurantsPage = lazy(() => import("@/appPropinaSegura/admin/pages/AdminRestaurantsPage"))
const AdminUsersPage = lazy(() => import("@/appPropinaSegura/admin/pages/AdminUsersPage"))
const ContactPage = lazy(() => import("@/appPropinaSegura/contact/ContactPage"))
const AboutPage = lazy(() => import("@/appPropinaSegura/about/AboutPage"))
const DemoPage = lazy(() => import("@/appPropinaSegura/demo/DemoPage"))

const AppRouter = createBrowserRouter([
    {
        path: "/",
        element: <LayoutPage />,
        children: [
            {
                index: true,
                element: <LandingPage />,
            },
            {
                path: "setup",
                element: (
                    <ProtectedRoute>
                        <InitialSetupPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "contact",
                element: <ContactPage />,
            },
            {
                path: "about",
                element: <AboutPage />,
            },
            {
                path: "demo",
                element: <DemoPage />,
            },
            {
                path: "cierre",
                element: (
                    <ProtectedRoute requireRestaurantRole={["closure_editor"]}>
                        <CierreDiarioPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "dashboard",
                element: (
                    <ProtectedRoute requireRestaurantRole={["closure_editor", "liquidator", "owner", "restaurant_viewer"]}>
                        <DashboardPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "dashboard/closures/:closureId",
                element: (
                    <ProtectedRoute requireRestaurantRole={["closure_editor", "liquidator", "owner", "restaurant_viewer"]}>
                        <ClosureDetailPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "dashboard/liquidacion",
                element: (
                    <ProtectedRoute requireRestaurantRole={["liquidator", "closure_editor"]}>
                        <LiquidacionPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "dashboard/liquidaciones-pagadas",
                element: (
                    <ProtectedRoute requireRestaurantRole={["closure_editor", "liquidator", "owner", "restaurant_viewer"]}>
                        <PaidSettlementsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "dashboard/personal",
                element: (
                    <ProtectedRoute requireRestaurantRole={["closure_editor"]}>
                        <StaffManagementPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "settings",
                element: (
                    <ProtectedRoute requireRestaurantRole={["closure_editor"]}>
                        <RestaurantSettingsPage />
                    </ProtectedRoute>
                ),
            },
        ],
    },
    {
        path: "/admin",
        element: (
            <ProtectedRoute requireSiteRole={["super_admin", "admin", "support", "viewer"]}>
                <AdminLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <AdminOverviewPage />,
            },
            {
                path: "overview",
                element: <AdminOverviewPage />,
            },
            {
                path: "restaurants",
                element: <AdminRestaurantsPage />,
            },
            {
                path: "users",
                element: <AdminUsersPage />,
            },
        ],
    },
    {
        path: "/auth",
        children: [
            {
                path: "login",
                element: <LoginPage />,
            },
            {
                path: "register",
                element: <RegisterPage />,
            },
            {
                path: "reset-password",
                element: <ResetPasswordPage />,
            },
        ],
    },
    {
        path: "/pending",
        element: <PendingPage />,
    },
    {
        path: "/invite/:invitationId",
        element: <AcceptInvitationPage />,
    },
])

export default AppRouter
