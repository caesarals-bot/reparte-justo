import { Suspense } from "react"
import { RouterProvider } from "react-router"
import AppRouter from "./router/AppRouter"
import { AuthProvider } from "@/context/AuthContext"
import LoadingScreen from "@/components/LoadingScreen"

function AppPropina() {


  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <RouterProvider router={AppRouter} />
      </Suspense>
    </AuthProvider>
  )
}

export default AppPropina
