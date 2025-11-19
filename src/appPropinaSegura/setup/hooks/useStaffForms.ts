import { useMemo, useState, type ChangeEvent } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import type { StaffFormValues, StaffRole } from "../staffTypes.ts"
import { defaultStaffForm } from "../staffUtils.ts"

type StaffFormChangeEvent = ChangeEvent<HTMLInputElement> | Date | undefined | boolean

export const useStaffForms = () => {
    const [staffForm, setStaffForm] = useState<StaffFormValues>({ ...defaultStaffForm })

    const formattedStartDate = useMemo(() => {
        if (!staffForm.startDate) {
            return "Seleccionar fecha"
        }

        return format(staffForm.startDate, "PPP", { locale: es })
    }, [staffForm.startDate])

    const formattedInactiveDate = useMemo(() => {
        if (!staffForm.inactiveSince) {
            return "Seleccionar fecha"
        }

        return format(staffForm.inactiveSince, "PPP", { locale: es })
    }, [staffForm.inactiveSince])

    const formatInactiveDateLabel = (date?: Date) => (date ? format(date, "dd/MM/yy", { locale: es }) : "—")

    const handleStaffFormChange = (field: keyof StaffFormValues) => (eventOrValue: StaffFormChangeEvent) => {
        if (field === "startDate" || field === "inactiveSince") {
            const selectedDate = eventOrValue as Date | undefined
            setStaffForm((previousState) => ({
                ...previousState,
                [field]: selectedDate,
            }))
            return
        }

        if (field === "isActive") {
            const nextValue = Boolean(eventOrValue)
            setStaffForm((previousState) => ({
                ...previousState,
                isActive: nextValue,
                inactiveSince: nextValue ? undefined : previousState.inactiveSince ?? new Date(),
            }))
            return
        }

        const event = eventOrValue as ChangeEvent<HTMLInputElement>
        const { value } = event.target

        setStaffForm((previousState) => ({
            ...previousState,
            [field]: value,
        }))
    }

    const resetStaffForm = (nextRole: StaffRole = "garzon") => {
        setStaffForm({ ...defaultStaffForm, role: nextRole })
    }

    return {
        staffForm,
        formattedStartDate,
        formattedInactiveDate,
        formatInactiveDateLabel,
        handleStaffFormChange,
        resetStaffForm,
    }
}
