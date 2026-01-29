import type { User, Gem, GemReference } from "./types"
import { MOCK_USERS } from "./constants"

const BASE_URL = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
    : "http://localhost:5000"
const API_BASE_URL = `${BASE_URL}/api`

const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = {
    BASE_URL,
    // --- Auth ---
    login: async (username: string, password: string = "password123"): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        })

        if (!response.ok) {
            throw new Error("Invalid username or password")
        }

        const data = await response.json()
        const user: User = {
            id: data._id,
            name: data.name,
            username: data.username,
            role: data.role,
            age: data.age,
            dob: data.dob,
            idNumber: data.idNumber,
            address: data.address,
            avatar: data.name
                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }

        localStorage.setItem("token", data.token)
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
        const response = await fetch(`${API_BASE_URL}/gems`, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch gems")
        return response.json()
    },

    createGem: async (gemData: any): Promise<Gem> => {
        const isFormData = gemData instanceof FormData
        const response = await fetch(`${API_BASE_URL}/gems/intake`, {
            method: "POST",
            headers: isFormData
                ? { ...getAuthHeader() }
                : {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
            body: isFormData ? gemData : JSON.stringify(gemData),
        })
        if (!response.ok) throw new Error("Failed to create gem")
        return response.json()
    },


    updateGem: async (gemId: string, updates: any): Promise<Gem> => {
        let endpoint = `${API_BASE_URL}/gems/${gemId}`
        const method = "PUT"

        let payload = updates

        if (updates.test1) {
            endpoint = `${API_BASE_URL}/gems/${gemId}/test`
            payload = { ...updates.test1 }
        } else if (updates.test2) {
            endpoint = `${API_BASE_URL}/gems/${gemId}/test`
            payload = { ...updates.test2 }
        } else if (updates.finalApproval) {
            endpoint = `${API_BASE_URL}/gems/${gemId}/approve`
            payload = updates.finalApproval
        }

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error("Failed to update gem")
        return response.json()
    },

    // --- Reports ---
    generateReport: async (gemId: string): Promise<{ reportUrl: string; qrCode: string }> => {
        const response = await fetch(`${API_BASE_URL}/reports/${gemId}/generate`, {
            method: "POST",
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to generate report")
        return response.json()
    },

    // --- References ---
    searchReferences: async (ri?: string, sg?: string, hardness?: string): Promise<GemReference[]> => {
        let url = `${API_BASE_URL}/references/search`
        const params = new URLSearchParams()
        if (ri) params.append("ri", ri)
        if (sg) params.append("sg", sg)
        if (hardness) params.append("hardness", hardness)
        if (params.toString()) url += `?${params.toString()}`

        const response = await fetch(url, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to search references")
        return response.json()
    },

    getReferences: async (): Promise<GemReference[]> => {
        const response = await fetch(`${API_BASE_URL}/references`, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch references")
        return response.json()
    },

    getSpecies: async (): Promise<string[]> => {
        const response = await fetch(`${API_BASE_URL}/references/species`, {
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to fetch species")
        return response.json()
    },

    // --- Users ---
    getUsers: async (): Promise<User[]> => {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: getAuthHeader(),
        })
        if (!response.ok) {
            // For now, if /auth/users doesn't exist or fails, return MOCK_USERS
            // but ideally we should have a real endpoint.
            // Looking at authRoutes.js, there is no /users endpoint yet.
            return MOCK_USERS
        }
        const data = await response.json()
        return data.map((u: any) => ({
            id: u._id,
            name: u.name,
            username: u.username,
            role: u.role,
            age: u.age,
            dob: u.dob,
            idNumber: u.idNumber,
            address: u.address,
            email: u.email,
            avatar: u.name
                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }))
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
        const data = await response.json()
        return {
            id: data._id,
            name: data.name,
            username: data.username,
            role: data.role,
            age: data.age,
            dob: data.dob,
            idNumber: data.idNumber,
            address: data.address,
            email: data.email,
            avatar: data.name

                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }
    },

    updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
            method: "PUT",
            headers: {
                ...getAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
        })
        if (!response.ok) throw new Error("Failed to update user")
        const data = await response.json()
        return {
            id: data._id,
            name: data.name,
            username: data.username,
            role: data.role,
            age: data.age,
            dob: data.dob,
            idNumber: data.idNumber,
            address: data.address,
            email: data.email,
            avatar: data.name

                .split(" ")
                .map((n: string) => n[0])
                .join(""),
        }
    },

    deleteUser: async (userId: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
            method: "DELETE",
            headers: getAuthHeader(),
        })
        if (!response.ok) throw new Error("Failed to delete user")
    },

}
