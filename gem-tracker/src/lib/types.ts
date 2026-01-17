export type UserRole = "ADMIN" | "HELPER" | "TESTER" | "FINAL_APPROVER"

export interface User {
  id: string
  name: string
  username?: string
  role: UserRole
  avatar: string
}

export type GemStatus =
  | "INTAKE"
  | "READY_FOR_T1"
  | "READY_FOR_T2"
  | "READY_FOR_APPROVAL"
  | "COMPLETED"

export interface ObservationData {
  shape?: string
  cut?: string
  transparency?: string
  clarity?: string
  origin?: string
  species?: string
  variety?: string
  cluster?: string
  stone?: string
  cuttingGrade?: string
  polishingGrade?: string
  proportionGrade?: string
  comments?: string
}

export interface Gem {
  _id: string
  gemId: string // GRC Number
  status: GemStatus
  updatedAt: string

  // Base Data
  color?: string
  emeraldWeight?: number
  diamondWeight?: number
  totalArticleWeight?: number
  shape?: string
  cut?: string
  itemDescription?: string

  intake: {
    helperId?: string
    timestamp?: Date
  }

  test1: {
    ri?: number
    sg?: number
    hardness?: number
    observations?: ObservationData
    selectedVariety?: string
    notes?: string
    testerId?: string
    timestamp?: Date
  }

  test2: {
    ri?: number
    sg?: number
    hardness?: number
    observations?: ObservationData
    selectedVariety?: string
    notes?: string
    testerId?: string
    timestamp?: Date
  }

  finalApproval: {
    ri?: number
    sg?: number
    hardness?: number
    finalObservations?: ObservationData
    finalVariety?: string
    itemDescription?: string
    reportUrl?: string
    qrCode?: string
    approverId?: string
    timestamp?: Date
  }
}

export interface GemReference {
  species: string
  variety: string
  riMin: number
  riMax: number
  sgMin: number
  sgMax: number
  hardness: string
}
