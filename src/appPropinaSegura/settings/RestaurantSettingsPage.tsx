import { useState } from "react"
import { deleteDoc, doc, collection, getDocs, writeBatch, updateDoc } from "firebase/firestore"
import { db } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Trash2 } from "lucide-react"

const RestaurantSettingsPage = () => {
    const { uid } = useAuth()
    const [isDeleting, setIsDeleting] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleDeleteRestaurant = async () => {
        if (!uid) {
            setError("No se encontró una sesión activa.")
            return
        }

        if (confirmText !== "BORRAR") {
            setError('Debes escribir "BORRAR" para confirmar.')
            return
        }

        setIsDeleting(true)
        setError(null)

        try {
            // 1. Borrar subcolecciones del restaurante (registros_diarios con ajustes)
            const closuresRef = collection(db, "restaurants", uid, "registros_diarios")
            const closuresSnapshot = await getDocs(closuresRef)
            
            const batch = writeBatch(db)
            
            for (const closureDoc of closuresSnapshot.docs) {
                // Borrar ajustes de cada cierre
                const adjustmentsRef = collection(db, "restaurants", uid, "registros_diarios", closureDoc.id, "ajustes")
                const adjustmentsSnapshot = await getDocs(adjustmentsRef)
                adjustmentsSnapshot.docs.forEach(adjDoc => {
                    batch.delete(adjDoc.ref)
                })
                
                // Borrar el cierre
                batch.delete(closureDoc.ref)
            }
            
            await batch.commit()

            // 2. Borrar documento del restaurante
            await deleteDoc(doc(db, "restaurants", uid))

            // 3. Limpiar roles del usuario (mantiene su cuenta pero sin restaurante)
            await updateDoc(doc(db, "users", uid), {
                restaurantRoles: {},
                primaryRestaurant: null
            })

            // 4. Redirigir a setup para crear nuevo restaurante
            // Usar window.location para forzar recarga completa
            window.location.href = "/setup"
        } catch (deleteError: any) {
            setError(`No se pudo borrar el restaurante: ${deleteError.message || "Error desconocido"}. Intenta nuevamente o contacta soporte.`)
            
            setIsDeleting(false)
        }
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Configuración del Restaurante</h1>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Zona de Peligro
                    </CardTitle>
                    <CardDescription>
                        Estas acciones son permanentes y no se pueden deshacer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!showConfirmation ? (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Borrar Restaurante</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Esto eliminará permanentemente:
                                </p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
                                    <li>Toda la configuración del restaurante</li>
                                    <li>Todos los cierres diarios guardados</li>
                                    <li>Todas las liquidaciones</li>
                                    <li>Todo el personal registrado</li>
                                    <li>Todas las invitaciones pendientes</li>
                                </ul>
                                <p className="text-sm text-muted-foreground font-semibold">
                                    ⚠️ Esta acción NO se puede deshacer.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowConfirmation(true)}
                                className="w-full"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Borrar Restaurante
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Confirmar Eliminación</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Para confirmar, escribe <strong>BORRAR</strong> en el campo de abajo:
                                </p>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Escribe BORRAR"
                                    className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm"
                                    disabled={isDeleting}
                                />
                            </div>

                            {error && (
                                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowConfirmation(false)
                                        setConfirmText("")
                                        setError(null)
                                    }}
                                    disabled={isDeleting}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteRestaurant}
                                    disabled={isDeleting || confirmText !== "BORRAR"}
                                    className="flex-1"
                                >
                                    {isDeleting ? "Borrando..." : "Confirmar Eliminación"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default RestaurantSettingsPage
