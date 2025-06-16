"use client"
import HomeWindow from "./components/window/HomeWindow";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import {useRouter} from "next/navigation";
import {useAuthStore} from "@/app/store/authStore";
import React, {useEffect, useState} from "react";
import LoginPage from "@/app/auth/login/page";
import Sidebar from "@/app/components/Sidebar";

export default function Home() {
    const router = useRouter()

    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    const loading = useAuthStore(s => s.loading)
    const checkToken = useAuthStore(s => s.checkToken)
    const [initialized, setInitialized] = useState(false)

    // useEffect(() => {
    //     (async () => {
    //         await checkToken()
    //         setInitialized(true)
    //     })()
    // }, [checkToken])
    //
    //
    // if (!initialized || loading) {
    //     return <div className="text-center p-4">Загрузка…</div>
    // }
    // if (!isAuthenticated) {
    //     return <LoginPage/>
    // }


    return <>
        <HomeWindow/>
    </>

}