'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useAuthStore} from "@/app/store/authStore";
import HomeWindow from "@/app/components/window/HomeWindow";
import {connectWebSocket} from "@/app/API/ws";


export default function Home() {
    const router = useRouter()

    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const loading = useAuthStore(s => s.loading)
    const checkToken = useAuthStore(s => s.checkToken)
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        (async () => {
            await checkToken()
            // connectWebSocket((code) => {
            //     console.log("Connecting to server...", code)
            // });
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
