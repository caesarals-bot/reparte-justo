import { createBrowserRouter } from "react-router"
import LayoutPage from "../appPropinaSegura/home/layout/LayoutPage"
import LandingPage from "../appPropinaSegura/home/LandingPage"
import LoginPage from "@/auth/LoginPage"
import RegisterPage from "@/auth/RegisterPage"
import PendingPage from "@/pages/PendingPage"
import AcceptInvitationPage from "@/pages/AcceptInvitationPage"
import { ProtectedRoute } from "@/router/ProtectedRoute"
import InitialSetupPage from "../appPropinaSegura/setup/InitialSetupPage"
import CierreDiarioPage from "@/appPropinaSegura/cierre/CierreDiarioPage"
import DashboardPage from "@/appPropinaSegura/dashboard/DashboardPage"
import ClosureDetailPage from "@/appPropinaSegura/dashboard/ClosureDetailPage"
import LiquidacionPage from "@/appPropinaSegura/dashboard/LiquidacionPage"
import PaidSettlementsPage from "@/appPropinaSegura/dashboard/PaidSettlementsPage"
import StaffManagementPage from "@/appPropinaSegura/staff/StaffManagementPage"
import AdminLayout from "@/appPropinaSegura/admin/components/AdminLayout"
import AdminOverviewPage from "@/appPropinaSegura/admin/pages/AdminOverviewPage"
import AdminRestaurantsPage from "@/appPropinaSegura/admin/pages/AdminRestaurantsPage"
import AdminUsersPage from "@/appPropinaSegura/admin/pages/AdminUsersPage"

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
