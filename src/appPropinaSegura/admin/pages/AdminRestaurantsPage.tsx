import { adminRestaurants } from "@/data/admin"
import AdminRestaurants from "../components/AdminRestaurants"

const AdminRestaurantsPage = () => {
    return <AdminRestaurants sectionId="restaurants" restaurants={adminRestaurants} />
}

export default AdminRestaurantsPage
