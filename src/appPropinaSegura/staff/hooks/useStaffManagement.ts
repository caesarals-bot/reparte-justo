import { useEffect, useMemo, useState } from "react"
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore"

import { useAuth } from "@/context/AuthContext"
import { usePermissions } from "@/hooks/usePermissions"
import { db } from "@/firebase/config"
import type { StaffMember, RestaurantConfigurationDocument, SettlementMode } from "../../setup/staffTypes"
import { mapStaffMemberForStorage, mapStoredStaffMember, isValidEmail } from "../../setup/staffUtils"
import { useStaffEditors } from "../../setup/hooks/useStaffEditors"

export type StaffCategory = "service" | "support"

export type CategorizedStaffMember = StaffMember & { category: StaffCategory }

type EditModalState = {
    isOpen: boolean
    category: StaffCategory | null
    memberId: string | null
}

type PendingDeleteState = {
    category: StaffCategory
    memberId: string
    memberName: string
} | null

const MAX_STAFF_EDITORS = 1
const DEFAULT_EDIT_MODAL_STATE: EditModalState = { isOpen: false, category: null, memberId: null }

const cloneStaffMember = (member: StaffMember): StaffMember => ({
    ...member,
    startDate: member.startDate ? new Date(member.startDate) : undefined,
    inactiveSince: member.inactiveSince ? new Date(member.inactiveSince) : undefined,
})

const getCategoryFromRole = (role: StaffMember["role"]): StaffCategory =>
    role === "garzon" || role === "ayudante_garzon" ? "service" : "support"

const validateMemberDraft = (draft: StaffMember) => {
    if (!draft.weight.trim()) {
        return "Define la ponderación de este integrante."
    }

    if (draft.email && !isValidEmail(draft.email)) {
        return "El correo ingresado no parece válido."
    }

    return null
}

export const useStaffManagement = () => {
    const { email } = useAuth()
    const { accessibleRestaurants } = usePermissions()
    const restaurantId = accessibleRestaurants[0]
    const normalizedUserEmail = email ? email.toLowerCase() : null

    const [serviceStaff, setServiceStaff] = useState<StaffMember[]>([])
    const [supportStaff, setSupportStaff] = useState<StaffMember[]>([])
    const [settlementMode, setSettlementMode] = useState<SettlementMode>("pool")

    const [editModal, setEditModal] = useState<EditModalState>(DEFAULT_EDIT_MODAL_STATE)
    const [modalDraft, setModalDraft] = useState<StaffMember | null>(null)
    const [modalError, setModalError] = useState<string | null>(null)
    const [pendingDelete, setPendingDelete] = useState<PendingDeleteState>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

    const { staffEditors, setStaffEditors, canManageStaffEditors, staffInputsDisabled } = useStaffEditors({
        normalizedUserEmail,
        maxEditors: MAX_STAFF_EDITORS,
    })

    const isEmptyState = useMemo(
        () => serviceStaff.length === 0 && supportStaff.length === 0,
        [serviceStaff.length, supportStaff.length],
    )

    const categorizedStaff = useMemo<CategorizedStaffMember[]>(
        () => [
            ...serviceStaff.map((member) => ({ ...member, category: "service" as StaffCategory })),
            ...supportStaff.map((member) => ({ ...member, category: "support" as StaffCategory })),
        ],
        [serviceStaff, supportStaff],
    )

    useEffect(() => {
        if (!restaurantId) {
            setSaveError("No tienes acceso a ningún restaurante.")
            setIsLoading(false)
            return
        }

        const fetchStaff = async () => {
            try {
                setIsLoading(true)
                const restaurantReference = doc(db, "restaurants", restaurantId)
                const snapshot = await getDoc(restaurantReference)

                if (!snapshot.exists()) {
                    setSaveError("Aún no completas la configuración inicial. Configúrala antes de gestionar el personal.")
                    return
                }

                const data = snapshot.data() as RestaurantConfigurationDocument
                setServiceStaff(data.serviceStaff?.map(mapStoredStaffMember) ?? [])
                setSupportStaff(data.supportStaff?.map(mapStoredStaffMember) ?? [])
                setStaffEditors(data.staffEditors ?? [])
                if (data.settlementMode) {
                    setSettlementMode(data.settlementMode)
                }
                setSaveError(null)
            } catch (error) {
                console.error("Error al cargar el personal", error)
                setSaveError("No pudimos cargar el personal. Intenta nuevamente en unos segundos.")
            } finally {
                setIsLoading(false)
            }
        }

        void fetchStaff()
    }, [restaurantId, setStaffEditors])

    const updateModalDraft = (updater: (draft: StaffMember) => StaffMember) => {
        setModalDraft((previousDraft) => (previousDraft ? updater(previousDraft) : previousDraft))
    }

    const persistStaffChanges = async (
        nextServiceStaff?: StaffMember[],
        nextSupportStaff?: StaffMember[],
    ): Promise<boolean> => {
        if (!restaurantId) {
            setSaveError("No tienes acceso a ningún restaurante")
            return false
        }

        const serviceToSave = nextServiceStaff ?? serviceStaff
        const supportToSave = nextSupportStaff ?? supportStaff

        setIsSaving(true)
        setSaveError(null)
        setSaveSuccess(null)

        try {
            const restaurantReference = doc(db, "restaurants", restaurantId)
            await setDoc(
                restaurantReference,
                {
                    serviceStaff: serviceToSave.map(mapStaffMemberForStorage),
                    supportStaff: supportToSave.map(mapStaffMemberForStorage),
                    staffEditors,
                    updatedAt: serverTimestamp(),
                },
                { merge: true },
            )

            setSaveSuccess("Cambios guardados correctamente.")
            return true
        } catch (error) {
            console.error("Error al actualizar el personal", error)
            setSaveError("No pudimos guardar los cambios. Intenta otra vez en unos segundos.")
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const openEditModal = (category: StaffCategory, memberId: string) => {
        if (staffInputsDisabled || isSaving) {
            return
        }

        const source = category === "service" ? serviceStaff : supportStaff
        const member = source.find((item) => item.id === memberId)
        if (!member) {
            return
        }

        setModalDraft(cloneStaffMember(member))
        setEditModal({ isOpen: true, category, memberId })
        setModalError(null)
    }

    const closeEditModal = () => {
        setEditModal(DEFAULT_EDIT_MODAL_STATE)
        setModalDraft(null)
        setModalError(null)
    }

    const handleModalEmailChange = (value: string) => {
        updateModalDraft((draft) => ({ ...draft, email: value }))
    }

    const handleModalWeightChange = (value: string) => {
        updateModalDraft((draft) => ({ ...draft, weight: value }))
    }

    const handleModalStartDateChange = (date?: Date) => {
        updateModalDraft((draft) => ({
            ...draft,
            startDate: date ?? undefined,
        }))
    }

    const handleModalInactiveDateChange = (date?: Date) => {
        updateModalDraft((draft) => ({
            ...draft,
            inactiveSince: date ?? undefined,
        }))
    }

    const handleModalActiveToggle = (isActive: boolean) => {
        updateModalDraft((draft) => ({
            ...draft,
            isActive,
            inactiveSince: isActive ? undefined : draft?.inactiveSince ?? new Date(),
        }))
    }

    const openDeleteDialog = (category: StaffCategory, memberId: string, memberName: string) => {
        if (staffInputsDisabled || isSaving) {
            return
        }

        setPendingDelete({ category, memberId, memberName })
    }

    const cancelDeleteDialog = () => {
        setPendingDelete(null)
    }

    const confirmDeleteMember = async () => {
        if (!pendingDelete) {
            return
        }

        const { category, memberId } = pendingDelete

        let nextServiceStaff = serviceStaff
        let nextSupportStaff = supportStaff

        if (category === "service") {
            nextServiceStaff = serviceStaff.filter((member) => member.id !== memberId)
            setServiceStaff(nextServiceStaff)
        } else {
            nextSupportStaff = supportStaff.filter((member) => member.id !== memberId)
            setSupportStaff(nextSupportStaff)
        }

        if (editModal.memberId === memberId) {
            closeEditModal()
        }

        setPendingDelete(null)
        await persistStaffChanges(nextServiceStaff, nextSupportStaff)
    }

    const handleModalSave = async () => {
        if (!editModal.isOpen || !editModal.category || !editModal.memberId || !modalDraft) {
            return
        }

        const validationError = validateMemberDraft(modalDraft)
        if (validationError) {
            setModalError(validationError)
            return
        }

        const updatedMember = cloneStaffMember(modalDraft)
        let nextServiceStaff = serviceStaff
        let nextSupportStaff = supportStaff

        if (editModal.category === "service") {
            nextServiceStaff = serviceStaff.map((member) => (member.id === editModal.memberId ? updatedMember : member))
            setServiceStaff(nextServiceStaff)
        } else {
            nextSupportStaff = supportStaff.map((member) => (member.id === editModal.memberId ? updatedMember : member))
            setSupportStaff(nextSupportStaff)
        }

        setModalError(null)

        const saved = await persistStaffChanges(nextServiceStaff, nextSupportStaff)
        if (saved) {
            closeEditModal()
        }
    }

    const addStaffMember = async (member: StaffMember) => {
        if (staffInputsDisabled || isSaving) {
            return false
        }

        const category = getCategoryFromRole(member.role)
        const memberWithId = cloneStaffMember({
            ...member,
            id: member.id || crypto.randomUUID(),
        })

        const previousService = serviceStaff
        const previousSupport = supportStaff
        let nextServiceStaff = serviceStaff
        let nextSupportStaff = supportStaff

        if (category === "service") {
            nextServiceStaff = [...serviceStaff, memberWithId]
            setServiceStaff(nextServiceStaff)
        } else {
            nextSupportStaff = [...supportStaff, memberWithId]
            setSupportStaff(nextSupportStaff)
        }

        const saved = await persistStaffChanges(nextServiceStaff, nextSupportStaff)

        if (!saved) {
            setServiceStaff(previousService)
            setSupportStaff(previousSupport)
        }

        return saved
    }

    return {
        serviceStaff,
        supportStaff,
        settlementMode,
        editModal,
        modalDraft,
        modalError,
        pendingDelete,
        isEmptyState,
        categorizedStaff,
        isLoading,
        isSaving,
        saveError,
        saveSuccess,
        canManageStaffEditors,
        staffInputsDisabled,
        openEditModal,
        closeEditModal,
        handleModalEmailChange,
        handleModalWeightChange,
        handleModalStartDateChange,
        handleModalInactiveDateChange,
        handleModalActiveToggle,
        handleModalSave,
        openDeleteDialog,
        cancelDeleteDialog,
        confirmDeleteMember,
        addStaffMember,
    }
}
