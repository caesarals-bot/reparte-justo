import { RouterProvider } from "react-router"
import AppRouter from "./router/AppRouter"
import { AuthProvider } from "@/context/AuthContext"

function AppPropina() {


  return (
    <>
      <AuthProvider>
        <RouterProvider router={AppRouter} />
      </AuthProvider>
    </>
  )
}

export default AppPropina
