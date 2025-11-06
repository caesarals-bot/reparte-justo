import { createBrowserRouter } from "react-router"
import LayoutPage from "../appPropinaSegura/home/layout/LayoutPage"
import LandingPage from "../appPropinaSegura/home/LandingPage"
import LoginPage from "@/auth/LoginPage"
import RegisterPage from "@/auth/RegisterPage"
import InitialSetupPage from "@/appPropinaSegura/setup/InitialSetupPage"
import CierreDiarioPage from "@/appPropinaSegura/cierre/CierreDiarioPage"


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
