'use client'

import {usePathname, useRouter} from "next/navigation";
import {useEffect} from 'react'
import ErrorModal from '@/app/components/Common/ErrorModal'
import {useSettingsStore} from "@/app/store/settingsStore";
import {Button} from "react-bootstrap";
import InviteCodeGenerator from "@/app/components/Settings/InviteCodeGenerator";
import {useAuthStore} from "@/app/store/authStore";

export default function SettingsPage() {
    const router = useRouter()
    const {
        organizationId,
        userId,
        accessToken,
        errorMessage,
        setOrganizationId,
        setUserId,
        setAccessToken,
        setError,
    } = useSettingsStore()

    const signOut = useAuthStore(s => s.signOut)

    const handleLogout = () => {
        signOut()
        router.push('/auth/login')
    }

    useEffect(() => {
        if (!organizationId) {
            const stored = localStorage.getItem('organizationId')?.trim()
            if (stored) setOrganizationId(stored)
        }
        if (!userId) {
            const stored = localStorage.getItem('userId')?.trim()
            if (stored) setUserId(stored)
        }
        if (!accessToken) {
            const stored = localStorage.getItem('accessToken')
            if (stored) setAccessToken(stored)
        }
    }, [organizationId, userId, accessToken, setOrganizationId, setUserId, setAccessToken])


    return (
        <div className="p-6 max-w-xl mx-auto space-y-6">
            <InviteCodeGenerator/>


            <section className="border">
                <div className="p-4 flex justify-between items-center">
                    <Button variant="outline-danger px-5" onClick={handleLogout}>
                        Выйти
                    </Button>
                </div>
            </section>

            <ErrorModal
                show={!!errorMessage}
                message={errorMessage || ''}
                onClose={() => setError(null)}
            />

        </div>
    )
}
