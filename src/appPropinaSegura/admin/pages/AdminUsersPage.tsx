import { adminUsers } from "@/data/admin"
import AdminUsers from "../components/AdminUsers"

const AdminUsersPage = () => {
    return <AdminUsers sectionId="users" users={adminUsers} />
}

export default AdminUsersPage
