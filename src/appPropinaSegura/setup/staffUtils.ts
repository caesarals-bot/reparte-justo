import type {
    AdditionalDeduction,
    DirectConfig,
    PoolConfig,
    RestaurantFormValues,
    StaffFormValues,
    StaffMember,
    StoredAdditionalDeduction,
    StoredStaffMember,
} from "./staffTypes.ts"

export const parseNumberInput = (value: string) => {
    const normalizedValue = value.replace(",", ".")
    const parsed = Number.parseFloat(normalizedValue)

    return Number.isFinite(parsed) ? parsed : 0
}

export const mapStoredStaffMember = (member: StoredStaffMember): StaffMember => ({
    id: member.id,
    name: member.name,
    email: member.email ?? "",
    role: member.role,
    weight: typeof member.weight === "number" ? member.weight.toString() : member.weight ?? "0",
    startDate: member.startDate ? new Date(member.startDate) : undefined,
    isActive: member.isActive ?? true,
    inactiveSince: member.inactiveSince ? new Date(member.inactiveSince) : undefined,
})

export const mapStaffMemberForStorage = (member: StaffMember): StoredStaffMember => {
    const normalizedEmail = member.email.trim()

    const storedMember: StoredStaffMember = {
        id: member.id,
        name: member.name,
        role: member.role,
        weight: parseNumberInput(member.weight),
        startDate: member.startDate ? member.startDate.toISOString() : null,
        isActive: member.isActive,
        inactiveSince: member.inactiveSince ? member.inactiveSince.toISOString() : null,
    }

    if (normalizedEmail) {
        storedMember.email = normalizedEmail
    }

    return storedMember
}

export const normalizeEmailValue = (value: string) => value.trim().toLowerCase()

export const isValidEmail = (value: string) => {
    const normalized = value.trim()
    if (!normalized) {
        return false
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export const mapAdditionalDeductionForStorage = (
    deduction: AdditionalDeduction,
): StoredAdditionalDeduction => ({
    id: deduction.id,
    name: deduction.name,
    percentage: parseNumberInput(deduction.percentage),
})

export const mapStoredAdditionalDeduction = (deduction: StoredAdditionalDeduction): AdditionalDeduction => ({
    id: deduction.id,
    name: deduction.name,
    percentage:
        typeof deduction.percentage === "number"
            ? deduction.percentage.toString()
            : deduction.percentage ?? "",
})

export const defaultPoolConfig: PoolConfig = {
    kitchenPercentage: "35",
    transbankPercentage: "5",
}

export const defaultDirectConfig: DirectConfig = {
    directWaiterPercentage: "70",
}

export const defaultStaffForm: StaffFormValues = {
    name: "",
    weight: "1.0",
    email: "",
    role: "garzon",
    isActive: true,
    inactiveSince: undefined,
}

export const defaultAdditionalDeductionForm: Omit<AdditionalDeduction, "id"> = {
    name: "",
    percentage: "",
}

export const defaultRestaurantForm: RestaurantFormValues = {
    restaurantName: "",
}
