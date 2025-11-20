import { useState } from "react"

import { isValidEmail, normalizeEmailValue } from "../staffUtils.ts"

interface UseStaffEditorsOptions {
    normalizedUserEmail: string | null
    maxEditors: number
}

export const useStaffEditors = ({ normalizedUserEmail, maxEditors }: UseStaffEditorsOptions) => {
    const [staffEditors, setStaffEditors] = useState<string[]>([])
    const [newStaffEditor, setNewStaffEditor] = useState("")
    const [staffEditorError, setStaffEditorError] = useState<string | null>(null)

    const hasDefinedStaffEditors = staffEditors.length > 0
    const canManageStaffEditors = !hasDefinedStaffEditors
        ? Boolean(normalizedUserEmail)
        : Boolean(normalizedUserEmail && staffEditors.includes(normalizedUserEmail))

    const canEditSensitiveStaffData = canManageStaffEditors
    const staffInputsDisabled = !canEditSensitiveStaffData
    const reachedStaffEditorsLimit = staffEditors.length >= maxEditors

    const setNewStaffEditorValue = (value: string) => {
        setNewStaffEditor(value)
        if (staffEditorError) {
            setStaffEditorError(null)
        }
    }

    const handleAddStaffEditor = () => {
        if (!canManageStaffEditors || reachedStaffEditorsLimit) {
            return
        }

        const normalizedEmail = normalizeEmailValue(newStaffEditor)

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
            setStaffEditorError("Ingresa un correo válido para autorizar la edición.")
            return
        }

        if (staffEditors.includes(normalizedEmail)) {
            setStaffEditorError("Este correo ya tiene permisos.")
            return
        }

        setStaffEditors((previous) => [...previous, normalizedEmail])
        setNewStaffEditor("")
        setStaffEditorError(null)
    }

    const handleRemoveStaffEditor = (emailToRemove: string) => {
        if (!canManageStaffEditors) {
            return
        }

        setStaffEditors((previous) => previous.filter((editor) => editor !== emailToRemove))
    }

    return {
        staffEditors,
        setStaffEditors,
        newStaffEditor,
        staffEditorError,
        canManageStaffEditors,
        canEditSensitiveStaffData,
        staffInputsDisabled,
        reachedStaffEditorsLimit,
        setNewStaffEditorValue,
        handleAddStaffEditor,
        handleRemoveStaffEditor,
    }
}
