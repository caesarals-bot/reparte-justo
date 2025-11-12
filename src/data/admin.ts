export type AdminMetric = {
  id: string
  label: string
  value: string
  delta: number
  deltaLabel: string
  trend: "up" | "down" | "neutral"
}

export type AdminEvent = {
  id: string
  title: string
  date: string
  actor: string
  status: "completado" | "pendiente" | "en_progreso"
}

export type AdminRestaurant = {
  id: string
  name: string
  location: string
  staffCount: number
  mode: "pool" | "directa"
  status: "activo" | "en_revision"
  lastSettlement: string
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  status: "activo" | "suspendido" | "invitado"
  lastAccess: string
}

export const adminMetrics: AdminMetric[] = [
  {
    id: "restaurants",
    label: "Restaurantes activos",
    value: "18",
    delta: 2,
    deltaLabel: "+2 este mes",
    trend: "up",
  },
  {
    id: "staff",
    label: "Colaboradores registrados",
    value: "142",
    delta: 12,
    deltaLabel: "+12 en 14 días",
    trend: "up",
  },
  {
    id: "settlements",
    label: "Cierres procesados",
    value: "327",
    delta: -4,
    deltaLabel: "4 pendientes",
    trend: "down",
  },
]

export const adminEvents: AdminEvent[] = [
  {
    id: "evt-001",
    title: "Liquidación confirmada — Casa Madre",
    date: "11 nov, 09:12",
    actor: "Laura Méndez",
    status: "completado",
  },
  {
    id: "evt-002",
    title: "Nuevo staff añadido — Patio 88",
    date: "10 nov, 18:34",
    actor: "Iván Rojas",
    status: "en_progreso",
  },
  {
    id: "evt-003",
    title: "Integración bancaria pendiente",
    date: "10 nov, 10:05",
    actor: "Sistema",
    status: "pendiente",
  },
]

export const adminRestaurants: AdminRestaurant[] = [
  {
    id: "rest-001",
    name: "Casa Madre",
    location: "Providencia",
    staffCount: 24,
    mode: "pool",
    status: "activo",
    lastSettlement: "10 nov 2025",
  },
  {
    id: "rest-002",
    name: "Patio 88",
    location: "Ñuñoa",
    staffCount: 18,
    mode: "directa",
    status: "activo",
    lastSettlement: "09 nov 2025",
  },
  {
    id: "rest-003",
    name: "Santa Barra",
    location: "Santiago Centro",
    staffCount: 12,
    mode: "pool",
    status: "en_revision",
    lastSettlement: "08 nov 2025",
  },
]

export type AdminUserGroups = {
  administrators: AdminUser[]
  operators: AdminUser[]
}

export const adminUsers: AdminUserGroups = {
  administrators: [
    {
      id: "usr-001",
      name: "Laura Méndez",
      email: "laura@repartejusto.com",
      role: "Súper admin",
      status: "activo",
      lastAccess: "11 nov, 09:04",
    },
    {
      id: "usr-002",
      name: "Sebastián Vera",
      email: "sebastian@repartejusto.com",
      role: "Administrador regional",
      status: "activo",
      lastAccess: "10 nov, 21:17",
    },
  ],
  operators: [
    {
      id: "usr-101",
      name: "Daniela Rivas",
      email: "daniela@casamadre.cl",
      role: "Operador",
      status: "activo",
      lastAccess: "11 nov, 07:55",
    },
    {
      id: "usr-102",
      name: "Héctor Fuentes",
      email: "hector@patio88.cl",
      role: "Operador",
      status: "suspendido",
      lastAccess: "07 nov, 22:41",
    },
    {
      id: "usr-103",
      name: "Paula Núñez",
      email: "paula@santabarra.cl",
      role: "Operador",
      status: "invitado",
      lastAccess: "Invitación enviada",
    },
  ],
}
