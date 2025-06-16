"use client"
import HomeWindow from "./components/window/HomeWindow";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import {useRouter} from "next/navigation";
import {useAuthStore} from "@/app/store/authStore";
import {useEffect, useState} from "react";
import LoginPage from "@/app/auth/login/page";

export default function Home() {
    const router = useRouter()

    // стейт из стора
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const loading = useAuthStore(s => s.loading)
    const checkToken = useAuthStore(s => s.checkToken)

    // локальный флаг, чтобы дождаться результата checkToken
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        // при первом рендере проверяем токен
        (async () => {
            await checkToken()
            setInitialized(true)
        })()
    }, [checkToken])

    if (!initialized || loading) {
        // можем показывать спиннер или просто пустоту, пока проверяем
        return <div className="text-center p-4">Загрузка…</div>
    }

    // если не авторизован — рендерим экран входа
    if (!isAuthenticated) {
        return <LoginPage/>
    }

    // иначе — основной контент
    return <HomeWindow/>
}