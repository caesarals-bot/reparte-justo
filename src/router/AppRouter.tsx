import { createBrowserRouter } from "react-router"
import LayoutPage from "../appPropinaSegura/home/layout/LayoutPage"
import LandingPage from "../appPropinaSegura/home/LandingPage"
import LoginPage from "@/auth/LoginPage"
import RegisterPage from "@/auth/RegisterPage"
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
                element: <InitialSetupPage />,
            },
            {
                path: "cierre",
                element: <CierreDiarioPage />,
            },
            {
                path: "dashboard",
                element: <DashboardPage />,
            },
            {
                path: "dashboard/closures/:closureId",
                element: <ClosureDetailPage />,
            },
            {
                path: "dashboard/liquidacion",
                element: <LiquidacionPage />,
            },
            {
                path: "dashboard/liquidaciones-pagadas",
                element: <PaidSettlementsPage />,
            },
            {
                path: "dashboard/personal",
                element: <StaffManagementPage />,
            },
        ],
    },
    {
        path: "/admin",
        element: <AdminLayout />,
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
    
])

export default AppRouter
