// stores/useSettingsStore.ts
import {create} from 'zustand'
import axios from 'axios'

interface SettingsState {
    organizationId: string | null
    userId: string | null
    accessToken: string | null

    inviteCode: string | null
    isGenerating: boolean

    isCheckingOrg: boolean
    hasOrg: boolean

    errorMessage: string | null
    successMessage: string | null

    setOrganizationId: (id: string) => void
    setUserId: (id: string) => void
    setAccessToken: (token: string) => void

    createOrganization: (name: string) => Promise<string | null>
    generateInviteCode: () => Promise<void>
    clearInviteCode: () => void

    checkOrg: () => Promise<void>
    joinOrganizationByCode: (referralCode: string) => Promise<void>

    setError: (msg: string | null) => void
    setSuccess: (msg: string | null) => void
}

const getLocal = (key: string) => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)?.trim() || null
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    organizationId: getLocal('organizationId'),
    userId: getLocal('userId'),
    accessToken: getLocal('accessToken'),

    inviteCode: null,
    isGenerating: false,

    isCheckingOrg: false,
    hasOrg: false,

    errorMessage: null,
    successMessage: null,

    setOrganizationId: (id) => {
        if (typeof window !== 'undefined') localStorage.setItem('organizationId', id)
        set({organizationId: id, hasOrg: true})
    },
    setUserId: (id) => {
        if (typeof window !== 'undefined') localStorage.setItem('userId', id)
        set({userId: id})
    },
    setAccessToken: (token) => {
        if (typeof window !== 'undefined') localStorage.setItem('accessToken', token)
        set({accessToken: token})
    },

    clearInviteCode: () => set({inviteCode: null}),

    setError: (msg) => set({errorMessage: msg}),
    setSuccess: (msg) => set({successMessage: msg}),

    createOrganization: async (name: string): Promise<string | null> => {
        const {userId, accessToken} = get()
        if (!userId || !accessToken) {
            set({errorMessage: 'Нет userId или accessToken.'})
            return null
        }

        set({errorMessage: null, successMessage: null})

        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const res = await axios.post(
                `${SERVER}organizations`,
                {
                    name,
                    creatorUserId: userId,
                },
                {
                    headers: {Authorization: `Bearer ${accessToken}`},
                }
            )

            if (res.status === 200) {
                const orgId = res.data?.id || res.data?.organizationId
                if (orgId) {
                    if (typeof window !== 'undefined') localStorage.setItem('organizationId', orgId)
                    set({
                        organizationId: orgId,
                        hasOrg: true,
                        successMessage: 'Организация создана.',
                    })
                    return orgId
                } else {
                    set({errorMessage: 'Не удалось получить id созданной организации.'})
                    return null
                }
            } else {
                set({errorMessage: 'Неожиданный ответ при создании организации.'})
                return null
            }
        } catch (e: any) {
            console.error('Ошибка создания организации:', e)
            if (e.response?.data?.message) {
                set({errorMessage: e.response.data.message})
            } else {
                set({errorMessage: e.message || 'Ошибка при создании организации.'})
            }
            return null
        }
    },


    generateInviteCode: async () => {
        const {organizationId, userId, accessToken} = get()
        if (!organizationId || !userId || !accessToken) {
            set({errorMessage: 'Не хватает данных: organizationId, userId или accessToken.'})
            return
        }

        set({isGenerating: true, errorMessage: null, successMessage: null})

        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            console.log(userId, "sdfsdfsdfewfewsfsdfsefsefsd")
            const url = `${SERVER}organizations/${organizationId}/invite-code?userId=${userId}`

            const res = await axios.post(
                url,
                null, // тело пустое, userId в query
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            )

            if (res.status === 200 && res.data) {
                // судя по тому, что сервер возвращает просто строку — присвоим её напрямую
                const code = typeof res.data === 'string' ? res.data : res.data.code
                if (code) {
                    set({inviteCode: code, successMessage: 'Код успешно сгенерирован.'})
                } else {
                    set({errorMessage: 'Не удалось получить код из ответа.'})
                }
            } else {
                set({errorMessage: 'Неожиданный ответ от сервера при генерации кода.'})
            }
        } catch (e: any) {
            console.error('Ошибка генерации invite code:', e)
            if (e.response?.status === 401) {
                set({errorMessage: 'Неавторизован. Токен либо просрочен, либо отсутствует.'})
            } else {
                set({
                    errorMessage: e?.response?.data?.message || e.message || 'Ошибка при запросе.',
                })
            }
        } finally {
            set({isGenerating: false})
        }
    },


    checkOrg: async () => {
        set({isCheckingOrg: true, errorMessage: null})
        const {organizationId, userId, accessToken} = get()

        if (organizationId) {
            set({hasOrg: true, isCheckingOrg: false})
            return
        }
        if (!userId || !accessToken) {
            set({hasOrg: false, isCheckingOrg: false})
            return
        }

        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const res = await axios.get(`${SERVER}organizations/organization`, {
                headers: {Authorization: `Bearer ${accessToken}`},
            })

            if (res.status === 200 && res.data?.id) {
                if (typeof window !== 'undefined') localStorage.setItem('organizationId', res.data.id)
                set({organizationId: res.data.id, hasOrg: true})
            } else {
                set({hasOrg: false})
            }
        } catch (e) {
            console.error('Ошибка при получении организации:', e)
            set({hasOrg: false})
        } finally {
            set({isCheckingOrg: false})
        }
    },

    joinOrganizationByCode: async (referralCode: string) => {
        const {userId, accessToken} = get()
        if (!userId || !accessToken) {
            set({errorMessage: 'Нет userId или accessToken.'})
            return
        }

        set({errorMessage: null, successMessage: null})

        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL
            const res = await axios.post(
                `${SERVER}organizations/join`,
                {
                    referralCode,
                    userId,
                },
                {
                    headers: {Authorization: `Bearer ${accessToken}`},
                }
            )

            if (res.status === 200) {
                if (typeof window !== 'undefined') localStorage.setItem('organizationId', res.data.id)
                set({
                    organizationId: res.data.id,
                    hasOrg: true,
                    successMessage: 'Успешно вступили в организацию.',
                })
            } else {
                set({errorMessage: 'Неожиданный ответ от сервера при вступлении в организацию.'})
            }
        } catch (e: any) {
            console.error('Ошибка вступления по коду:', e)
            if (e.response?.data?.message) {
                set({errorMessage: e.response.data.message})
            } else {
                set({errorMessage: e.message || 'Ошибка при вступлении.'})
            }
        }
    },

}))
