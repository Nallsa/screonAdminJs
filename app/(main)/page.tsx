'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useAuthStore} from "@/app/store/authStore";
import HomeWindow from "@/app/components/window/HomeWindow";


export default function Home() {
    const router = useRouter()

    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const loading = useAuthStore(s => s.loading)
    const checkToken = useAuthStore(s => s.checkToken)
    const accessToken = useAuthStore(s => s.accessToken)
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        console.log(`tokeeeeen ${accessToken}`)
    }, []);

    useEffect(() => {
        ;(async () => {
            await checkToken()
            setInitialized(true)
        })()
    }, [checkToken])

    useEffect(() => {
        if (initialized && !loading && !isAuthenticated) {
            router.replace('auth/login') // переход на /login
        }
    }, [initialized, loading, isAuthenticated, router])

    if (!initialized || loading || !isAuthenticated) {
        return <div className="text-center p-4">Загрузка…</div>
    }

    return <HomeWindow/>
}
