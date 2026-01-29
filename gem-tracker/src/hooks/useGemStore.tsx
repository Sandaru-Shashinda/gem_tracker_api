import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import type { User, Gem, GemReference } from "@/lib/types"
import { api } from "@/lib/api"

interface GemContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  refreshing: boolean
  gems: Gem[]
  references: GemReference[]
  species: string[]
  refreshGems: () => Promise<void>
  refreshReferences: () => Promise<void>
  refreshSpecies: () => Promise<void>
  handleIntake: (
    data: {
      color: string
      emeraldWeight: string
      diamondWeight: string
      totalArticleWeight: string
      itemDescription: string
    },
    image?: File,
  ) => Promise<void>
  handleTestSubmit: (gemId: string, stage: "test1" | "test2", data: any) => Promise<void>

  handleApproval: (gemId: string, data: any) => Promise<void>
  handleOverride: (gemId: string, status: any) => Promise<void>
}

const GemContext = createContext<GemContextType | undefined>(undefined)

export function GemProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(api.getCurrentUser())
  const [gems, setGems] = useState<Gem[]>([])
  const [references, setReferences] = useState<GemReference[]>([])
  const [species, setSpecies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const setUser = (u: User | null) => {
    if (!u) api.logout()
    setUserState(u)
  }

  const refreshGems = async () => {
    setRefreshing(true)
    try {
      const data = await api.getGems()
      setGems(data)
    } catch (err) {
      console.error("Failed to fetch gems:", err)
    } finally {
      setRefreshing(false)
    }
  }

  const refreshReferences = async () => {
    setRefreshing(true)
    try {
      const data = await api.getReferences()
      setReferences(data)
    } catch (err) {
      console.error("Failed to fetch references:", err)
    } finally {
      setRefreshing(false)
    }
  }

  const refreshSpecies = async () => {
    setRefreshing(true)
    try {
      const data = await api.getSpecies()
      setSpecies(data)
    } catch (err) {
      console.error("Failed to fetch species:", err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([refreshGems(), refreshReferences(), refreshSpecies()])
      setLoading(false)
    }
    init()
  }, [])

  const handleIntake = async (
    data: {
      color: string
      emeraldWeight: string
      diamondWeight: string
      totalArticleWeight: string
      itemDescription: string
    },
    image?: File,
  ) => {
    if (!user) return
    const formData = new FormData()
    formData.append("color", data.color)
    formData.append("emeraldWeight", data.emeraldWeight)
    formData.append("diamondWeight", data.diamondWeight)
    formData.append("totalArticleWeight", data.totalArticleWeight)
    formData.append("itemDescription", data.itemDescription)
    if (image) {
      formData.append("image", image)
    }

    await api.createGem(formData)
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
    try {
      await api.generateReport(gemId)
    } catch (err) {
      console.error("Failed to generate report:", err)
    }
    await refreshGems()
  }

  const handleOverride = async (gemId: string, status: any) => {
    setRefreshing(true)
    try {
      await api.updateGem(gemId, { status })
      await refreshGems()
    } catch (err) {
      console.error("Failed to override status:", err)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <GemContext.Provider
      value={{
        user,
        setUser,
        loading,
        refreshing,
        gems,
        references,
        species,
        refreshGems,
        refreshReferences,
        refreshSpecies,
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
