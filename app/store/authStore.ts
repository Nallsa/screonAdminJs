'use client'
import {create} from 'zustand'
import axios from 'axios'

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

    // Вход
    signIn: async (email, password) => {
        set({loading: true, error: null})
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const res = await axios.post(`${SERVER}/auth/login`, {email, password})
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

    // Регистрация
    signUp: async (username, phone, password, email) => {
        set({loading: true, error: null})
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const res = await axios.post(`${SERVER}/auth/register`, {
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

    // Выход
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

    // Проверка refresh-токена
    checkToken: async () => {
        set({loading: true, error: null})
        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const token = localStorage.getItem('refreshToken')
            if (!token) throw new Error('no token')
            const res = await axios.post(`${SERVER}/auth/validate-refresh-token`, {
                refreshToken: token,
            })
            const ok = res.data.valid === true
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
