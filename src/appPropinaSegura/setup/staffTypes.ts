export type SettlementMode = "pool" | "directa"

export type PoolConfig = {
    kitchenPercentage: string
    transbankPercentage: string
}

export type DirectConfig = {
    directWaiterPercentage: string
}

export type AdditionalDeduction = {
    id: string
    name: string
    percentage: string
}

export type StaffRole = "garzon" | "ayudante_garzon" | "cocinero" | "ayudante_cocina"

export type StaffMember = {
    id: string
    name: string
    weight: string
    email: string
    role: StaffRole
    startDate?: Date
    isActive: boolean
    inactiveSince?: Date
}

export type StaffFormValues = {
    name: string
    weight: string
    email: string
    role: StaffRole
    startDate?: Date
    isActive: boolean
    inactiveSince?: Date
}

export type RestaurantFormValues = {
    restaurantName: string
}

export type StoredStaffMember = {
    id: string
    name: string
    email?: string
    role: StaffRole
    weight: number | string
    startDate?: string | null
    isActive?: boolean
    inactiveSince?: string | null
}

export type StoredAdditionalDeduction = {
    id: string
    name: string
    percentage: number | string
}

export type RestaurantConfigurationDocument = {
    restaurantName?: string
    location?: string
    responsibleName?: string
    settlementMode?: SettlementMode
    poolConfig?: {
        kitchenPercentage?: number
        transbankPercentage?: number
    }
    directConfig?: {
        directWaiterPercentage?: number
    }
    additionalDeductions?: StoredAdditionalDeduction[]
    serviceStaff?: StoredStaffMember[]
    supportStaff?: StoredStaffMember[]
    staffEditors?: string[]
}
