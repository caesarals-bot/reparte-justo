import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import AdminUsers from "../components/AdminUsers"
import { useAdminUsers } from "../hooks/useAdminUsers"

const AdminUsersPage = () => {
    const { users, isLoading, error, refresh } = useAdminUsers()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cargando usuarios...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
                <p className="text-sm text-destructive">{error}</p>
                <Button size="sm" onClick={() => refresh()}>
                    Reintentar
                </Button>
            </div>
        )
    }

    return <AdminUsers sectionId="users" users={users} />
}

export default AdminUsersPage
