'use client'
import {create} from 'zustand'
import axios from 'axios'
import {addValueInStorage} from "@/app/API/localStorage";

interface AuthState {
    // токены и юзер
    accessToken: string | null
    refreshToken: string | null
    userId: string | null

    // статус
    isAuthenticated: boolean
    loading: boolean
    error: string | null

    // методы
    signIn: (email: string, password: string) => Promise<boolean>
    signUp: (username: string, phone: string, password: string, email: string) => Promise<boolean>
    signOut: () => void
    checkToken: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken:
        typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
    refreshToken:
        typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
    userId:
        typeof window !== 'undefined' ? localStorage.getItem('userId') : null,

    isAuthenticated: false,
    loading: false,
    error: null,


    signIn: async (email, password) => {
        set({loading: true, error: null})
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const res = await axios.post(`${SERVER}auth/login`, {email, password})
            const {accessToken, refreshToken, userId} = res.data
            // сохраняем
            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('refreshToken', refreshToken)
            localStorage.setItem('userId', userId)

            set({
                accessToken,
                refreshToken,
                userId,
                isAuthenticated: true,
            })
            return true
        } catch (e: any) {
            set({error: e.response?.data?.message || 'Ошибка входа'})
            return false
        } finally {
            set({loading: false})
        }
    },


    signUp: async (username, phone, password, email) => {
        set({loading: true, error: null})
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const res = await axios.post(`${SERVER}auth/register`, {
                name: username,
                phone: phone.replace(/^\+/, ''),
                password,
                email,
            })
            const {accessToken, refreshToken, userId} = res.data
            // сохраняем и авто-логиним
            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('refreshToken', refreshToken)
            localStorage.setItem('userId', userId)
            set({
                accessToken,
                refreshToken,
                userId,
                isAuthenticated: true,
            })
            return true
        } catch (e: any) {
            set({error: e.response?.data?.message || 'Ошибка регистрации'})
            return false
        } finally {
            set({loading: false})
        }
    },


    signOut: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userId')
        set({
            accessToken: null,
            refreshToken: null,
            userId: null,
            isAuthenticated: false,
            error: null,
        })
    },


    checkToken: async () => {
        set({loading: true, error: null})
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL!
            const token = localStorage.getItem('refreshToken')

            if (!token) throw new Error('no token')
            const res = await axios.post(`${SERVER}auth/validate-refresh-token`, {
                refreshToken: token,
            })
            const ok = res.data.valid

            const accessToken = res.data.accessToken

            const refreshToken = res.data.refreshToken
            const userId = res.data.userId

            addValueInStorage('accessToken', accessToken)
            addValueInStorage('refreshToken', refreshToken)
            addValueInStorage('userId', userId)

            console.log("ok", ok)
            set({isAuthenticated: ok})
            return ok
        } catch {
            set({isAuthenticated: false})
            return false
        } finally {
            set({loading: false})
        }
    },
}))
