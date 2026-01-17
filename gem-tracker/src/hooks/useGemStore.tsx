import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import type { User, Gem } from "@/lib/types"
import { api } from "@/lib/api"

interface GemContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  gems: Gem[]
  refreshGems: () => Promise<void>
  handleIntake: (data: {
    color: string
    emeraldWeight: string
    diamondWeight: string
    totalArticleWeight: string
    itemDescription: string
  }) => Promise<void>
  handleTestSubmit: (gemId: string, stage: "test1" | "test2", data: any) => Promise<void>
  handleApproval: (gemId: string, data: any) => Promise<void>
  handleOverride: (gemId: string, status: any) => Promise<void>
}

const GemContext = createContext<GemContextType | undefined>(undefined)

export function GemProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(api.getCurrentUser())
  const [gems, setGems] = useState<Gem[]>([])
  const [loading, setLoading] = useState(true)

  const setUser = (u: User | null) => {
    if (!u) api.logout()
    setUserState(u)
  }

  const refreshGems = async () => {
    setLoading(true)
    try {
      const data = await api.getGems()
      setGems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshGems()
  }, [])

  const handleIntake = async (data: {
    color: string
    emeraldWeight: string
    diamondWeight: string
    totalArticleWeight: string
    itemDescription: string
  }) => {
    if (!user) return
    const intakePayload = {
      color: data.color,
      emeraldWeight: parseFloat(data.emeraldWeight),
      diamondWeight: parseFloat(data.diamondWeight),
      totalArticleWeight: parseFloat(data.totalArticleWeight),
      itemDescription: data.itemDescription,
    }
    await api.createGem(intakePayload)
    await refreshGems()
  }

  const handleTestSubmit = async (gemId: string, stage: "test1" | "test2", data: any) => {
    if (!user) return
    const update = {
      ri: parseFloat(data.ri),
      sg: parseFloat(data.sg),
      hardness: parseFloat(data.hardness),
      selectedVariety: data.selectedVariety,
      notes: data.notes,
      observations: {
        shape: data.shape,
        cut: data.cut,
        transparency: data.transparency,
        clarity: data.clarityGrade,
        origin: data.origin,
        species: data.species,
        variety: data.selectedVariety,
        comments: data.comments,
      },
    }
    await api.updateGem(gemId, {
      [stage]: update,
      status: stage === "test1" ? "READY_FOR_T2" : "READY_FOR_APPROVAL",
    })
    await refreshGems()
  }

  const handleApproval = async (gemId: string, data: any) => {
    if (!user) return
    const update = {
      ri: parseFloat(data.ri),
      sg: parseFloat(data.sg),
      hardness: parseFloat(data.hardness),
      finalVariety: data.selectedVariety,
      itemDescription: data.notes || data.comments,
      finalObservations: {
        shape: data.shape,
        cut: data.cut,
        transparency: data.transparency,
        origin: data.origin,
        species: data.species,
        variety: data.selectedVariety,
        cuttingGrade: data.cuttingGrade,
        polishingGrade: data.polishingGrade,
        proportionGrade: data.proportionGrade,
        clarityGrade: data.clarityGrade,
        comments: data.comments,
        cluster: data.clusterSize,
        stone: data.stoneSize,
      },
    }
    await api.updateGem(gemId, { finalApproval: update, status: "COMPLETED" })
    await refreshGems()
  }

  const handleOverride = async (gemId: string, status: any) => {
    await api.updateGem(gemId, { status })
    await refreshGems()
  }

  return (
    <GemContext.Provider
      value={{
        user,
        setUser,
        loading,
        gems,
        refreshGems,
        handleIntake,
        handleTestSubmit,
        handleApproval,
        handleOverride,
      }}
    >
      {children}
    </GemContext.Provider>
  )
}

export function useGem() {
  const context = useContext(GemContext)
  if (context === undefined) {
    throw new Error("useGem must be used within a GemProvider")
  }
  return context
}
