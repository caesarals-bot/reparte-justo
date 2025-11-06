import NavBar from "@/appPropinaSegura/component/navbar/NavBar"
import { Outlet } from "react-router"
import Footer from "@/appPropinaSegura/component/navbar/Footer"

const LayoutPage = () => {
    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <Outlet />
            <Footer />  
        </div>
    )
}

export default LayoutPage
