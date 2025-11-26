/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

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

    // 🔽 состояние восстановления
    resetSession: string | null
    resetStep: "idle" | "code_sent" | "verified" | "done"

    // методы
    signIn: (email: string, password: string) => Promise<boolean>
    signUp: (username: string, phone: string, password: string, email: string) => Promise<boolean>
    signOut: () => void
    checkToken: () => Promise<boolean>

    // восстановление пароля
    requestPasswordResetCode: (email: string) => Promise<boolean>
    // теперь ТОЛЬКО проверка кода → вернёт resetSession и сохранит его в стор
    confirmPasswordResetCode: (args: { email: string; code: string }) => Promise<string | null>
    // смена пароля с использованием resetSession
    resetPassword: (args: { newPassword: string; resetSession?: string }) => Promise<boolean>

    // (опционально) если поддерживаешь токен из ссылки
    confirmPasswordReset: (args: { newPassword: string }) => Promise<boolean>

    checkEmail: (email: string) => Promise<boolean>
    verifyEmail: (args: { email: string; code: string }) => Promise<string | null>
}

const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? "")

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: typeof window !== "undefined" ? localStorage.getItem("accessToken") : null,
    refreshToken: typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null,
    userId: typeof window !== "undefined" ? localStorage.getItem("userId") : null,

    isAuthenticated: false,
    loading: false,
    error: null,

    // 🔽 добавлено
    resetSession: null,
    resetStep: "idle",

    // --- твои методы без изменений ---
    signIn: async (email, password) => {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("userId")
        localStorage.removeItem("organizationId")

        set({loading: true, error: null})
        try {
            const res = await axios.post(`${base}auth/login`, {email, password})

            const {accessToken, refreshToken, userId} = res.data
            localStorage.setItem("accessToken", accessToken)
            localStorage.setItem("refreshToken", refreshToken)
            localStorage.setItem("userId", userId)

            set({
                accessToken,
                refreshToken,
                userId,
                isAuthenticated: true,
            })
            return true
        } catch (e: any) {
            const serverData = e?.response?.data
            const msg =
                serverData?.message ||
                serverData?.error ||      // <-- сюда попадёт "Invalid email or password"
                "Ошибка входа"

            set({error: msg})
            return false
        } finally {
            set({loading: false})
        }
    },


    signUp: async (username, phone, password, email) => {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("userId")
        localStorage.removeItem("organizationId")

        set({loading: true, error: null})
        try {
            const res = await axios.post(`${base}auth/register`, {
                name: username,
                phone: phone.replace(/^\+/, ""),
                password,
                email,
            })
            const {accessToken, refreshToken, userId} = res.data
            localStorage.setItem("accessToken", accessToken)
            localStorage.setItem("refreshToken", refreshToken)
            localStorage.setItem("userId", userId)
            set({
                accessToken,
                refreshToken,
                userId,
                isAuthenticated: true,
            })
            return true
        } catch (e: any) {
            const serverData = e?.response?.data
            const msg =
                serverData?.message ||
                serverData?.error ||      // если бэкенд вернёт {error: "..."}
                "Ошибка регистрации"

            set({error: msg})
            return false
        } finally {
            set({loading: false})
        }
    },


    signOut: () => {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("userId")
        localStorage.removeItem("organizationId")
        set({
            accessToken: null,
            refreshToken: null,
            userId: null,
            isAuthenticated: false,
            error: null,
            // очистим состояние восстановления
            resetSession: null,
            resetStep: "idle",
        })
    },

    checkToken: async () => {
        set({loading: true, error: null})
        try {
            const token = localStorage.getItem("refreshToken")
            if (!token) throw new Error("no token")

            const res = await axios.post(`${base}auth/refresh`, {refreshToken: token})
            const ok = res.status
            const accessToken = res.data.accessToken
            const refreshToken = res.data.refreshToken
            const userId = res.data.userId

            addValueInStorage("accessToken", accessToken)
            addValueInStorage("refreshToken", refreshToken)
            addValueInStorage("userId", userId)

            if (ok === 200) set({isAuthenticated: true})
            return ok === 200
        } catch {
            set({isAuthenticated: false})
            return false
        } finally {
            set({loading: false})
        }
    },

    checkEmail: async (email) => {
        set({loading: true, error: null})
        try {
            await axios.post(`${base}auth/register/email/code`, {email})
            set({resetStep: "code_sent"})
            return true
        } catch (e: any) {
            const serverData = e?.response?.data
            const msg =
                serverData?.message ||
                serverData?.error ||
                "Не удалось отправить код"

            set({
                error: msg,
                resetStep: "idle",
            })
            return false
        } finally {
            set({loading: false})
        }
    },


    verifyEmail: async ({email, code}) => {
        set({loading: true, error: null})
        try {
            const res = await axios.post(
                `${base}auth/register/email/verify`,
                {email, code},
                {responseType: "text"}
            )

            const status = res.status
            const raw = (res?.data ?? "").toString().trim()

            // если сервер всё ещё когда-то начнёт возвращать строку — сохраним
            const resetSession = raw || null

            // если статус 2xx — считаем подтверждением, даже если тело пустое (204)
            if (status >= 200 && status < 300) {
                set({
                    resetSession,
                    resetStep: "verified",
                })
                // для регистрации нам важен сам факт успеха:
                return resetSession || true
            }

            // на всякий пожарный, если статус не 2xx — кинем ошибку
            throw new Error("Неожиданный статус ответа: " + status)
        } catch (e: any) {
            const serverData = e?.response?.data
            const msg =
                serverData?.message ||
                serverData?.error ||        // <-- сюда придут тексты вида {"error":"..."}
                e?.message ||
                "Не удалось подтвердить код"

            set({
                error: msg,
                resetStep: "code_sent",
            })
            return null
        } finally {
            set({loading: false})
        }
    },



    // =========================
    // ВОССТАНОВЛЕНИЕ ПАРОЛЯ
    // =========================

    // 1) Отправить код на e-mail
    requestPasswordResetCode: async (email) => {
        set({loading: true, error: null})
        try {
            await axios.post(`${base}auth/password/forgot`, {email})

            set({resetStep: "code_sent"})
            return true
        } catch (e: any) {
            set({
                error: e?.response?.data?.message || "Не удалось отправить код",
                resetStep: "idle",
            })
            return false
        } finally {
            set({loading: false})
        }
    },

    // 2) Подтвердить код → получить resetSession (ПЛЕЙН-ТЕКСТ строка)
    confirmPasswordResetCode: async ({email, code}) => {
        set({loading: true, error: null})
        try {
            const res = await axios.post(
                `${base}auth/password/verify`,
                {email, code},
                {responseType: "text"}
            )
            const resetSession = (res?.data ?? "").toString().trim()
            if (!resetSession) throw new Error("Пустой ответ от сервера")
            set({resetSession, resetStep: "verified"})
            return resetSession
        } catch (e: any) {
            set({
                error: e?.response?.data?.message || e?.message || "Не удалось подтвердить код",
                resetStep: "code_sent",
            })
            return null
        } finally {
            set({loading: false})
        }
    },

    // 3) Установить новый пароль
    resetPassword: async ({newPassword, resetSession}) => {
        set({loading: true, error: null})
        try {
            const session = resetSession ?? get().resetSession
            if (!session) throw new Error("resetSession отсутствует. Сначала подтвердите код.")

            await axios.post(`${base}auth/password/reset`, {
                resetSession: session,
                newPassword,
            })
            set({resetStep: "done"})
            return true
        } catch (e: any) {
            set({
                error: e?.response?.data?.message || e?.message || "Не удалось обновить пароль",
            })
            return false
        } finally {
            set({loading: false})
        }
    },

    // (опционально) по токену из ссылки
    confirmPasswordReset: async ({newPassword}) => {
        set({loading: true, error: null})
        try {
            await axios.post(`${base}auth/password/reset-by-token`, {newPassword})
            set({resetStep: "done"})
            return true
        } catch (e: any) {
            set({error: e?.response?.data?.message || "Не удалось обновить пароль"})
            return false
        } finally {
            set({loading: false})
        }
    },
}))