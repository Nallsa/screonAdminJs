'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import {useAuthStore} from "@/app/store/authStore";
import HomeWindow from "@/app/components/window/HomeWindow";
import {connectWebSocket} from "@/app/API/ws";


export default function Home() {
    return <HomeWindow/>
}
