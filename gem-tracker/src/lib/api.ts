import type { User, Gem } from "./types"
import { MOCK_USERS, INITIAL_GEMS } from "./constants"

const API_BASE_URL = "http://localhost:5000/api"

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = {
  // --- Auth (Mocked until DB is ready) ---
  login: async (username: string, _password?: string): Promise<User> => {
    // Search by name or role in MOCK_USERS
    const user =
      MOCK_USERS.find(
        (u) =>
          u.name.toLowerCase().includes(username.toLowerCase()) ||
          u.role.toLowerCase() === username.toLowerCase(),
      ) || MOCK_USERS[0]

    localStorage.setItem("token", "mock-token-" + user.id)
    localStorage.setItem("user", JSON.stringify(user))
    return user
  },

  logout: async () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  },

  getCurrentUser: (): User | null => {
    const user = localStorage.getItem("user")
    return user ? JSON.parse(user) : null
  },

  // --- Gems ---
  getGems: async (): Promise<Gem[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/gems`, {
        headers: getAuthHeader(),
      })
      if (!response.ok) throw new Error("Backend unavailable")
      return response.json()
    } catch {
      // Fallback to initial gems for demo/dev purposes
      console.warn("Backend unavailable, using INITIAL_GEMS from constants")
      return INITIAL_GEMS
    }
  },

  createGem: async (gemData: any): Promise<Gem> => {
    try {
      const response = await fetch(`${API_BASE_URL}/gems/intake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(gemData),
      })
      if (!response.ok) throw new Error("Backend error")
      return response.json()
    } catch {
      // Mock creation locally for demo
      const mockGem: Gem = {
        _id: `g${Date.now()}`,
        gemId: `GEM-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`,
        status: "READY_FOR_T1",
        updatedAt: new Date().toISOString(),
        ...gemData,
        intake: { timestamp: new Date() },
      }
      return mockGem
    }
  },

  updateGem: async (gemId: string, updates: any): Promise<Gem> => {
    let endpoint = `${API_BASE_URL}/gems/${gemId}`
    let method = "PUT"
    let payload = updates

    if (updates.test1) {
      endpoint = `${API_BASE_URL}/gems/${gemId}/test`
      payload = { stage: "test1", ...updates.test1 }
    } else if (updates.test2) {
      endpoint = `${API_BASE_URL}/gems/${gemId}/test`
      payload = { stage: "test2", ...updates.test2 }
    } else if (updates.finalApproval) {
      endpoint = `${API_BASE_URL}/gems/${gemId}/approve`
      payload = updates.finalApproval
    }

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Backend update failed")
      return response.json()
    } catch {
      // Return a merged object for mock persistence in local state
      return { _id: gemId, ...updates, updatedAt: new Date().toISOString() } as any
    }
  },

  // --- Users ---
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: getAuthHeader(),
      })
      if (!response.ok) throw new Error("Backend unavailable")
      return response.json()
    } catch {
      return MOCK_USERS
    }
  },

  createUser: async (userData: any): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(userData),
    })
    if (!response.ok) throw new Error("Failed to create user")
    return response.json()
  },

  deleteUser: async (_userId: string): Promise<void> => {
    console.warn("Delete user not implemented on backend yet")
  },
}
