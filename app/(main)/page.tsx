'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {useAuthStore} from "@/app/store/authStore";
import HomeWindow from "@/app/components/window/HomeWindow";
import {connectWebSocket} from "@/app/API/ws";


export default function Home() {
    const router = useRouter()




    // useEffect(() => {
    //     if (!loading && !isAuthenticated) {
    //         router.replace('auth/login') // переход на /login
    //     }
    // }, [ loading, isAuthenticated, router])



    return <HomeWindow />
}
