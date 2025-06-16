'use client'

import React, {useEffect, useState} from 'react'
import {Button} from 'react-bootstrap'

import {useAuthStore} from "@/app/store/authStore";
import {useRouter} from "next/navigation";

export default function SettingsPage() {
    const router = useRouter()
    const signOut = useAuthStore(s => s.signOut)

    const handleLogout = () => {
        signOut()           // очищаем стор и localStorage
        router.push('/auth/login')  // перенаправляем на страницу входа
    }

    return (
        <div className="p-4">
            <Button size="sm" variant="outline-danger" onClick={handleLogout}>
                Выйти
            </Button>
        </div>
    )
}