/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import {usePathname, useRouter} from "next/navigation";
import {useEffect} from 'react'
import ErrorModal from '@/app/components/Common/ErrorModal'
import {useSettingsStore} from "@/app/store/settingsStore";
import {Button} from "react-bootstrap";
import InviteCodeGenerator from "@/app/components/Settings/InviteCodeGenerator";
import {useAuthStore} from "@/app/store/authStore";
import {useOrganizationStore} from "@/app/store/organizationStore";

export default function SettingsPage() {
    const router = useRouter()
    const {
        errorMessage,
        setError,
    } = useSettingsStore()

    const {
        hasOrg
    } = useOrganizationStore()

    const signOut = useAuthStore(s => s.signOut)

    const handleLogout = () => {
        signOut()
        router.push('/auth/login')
    }

    useEffect(() => {
        if (!hasOrg) {
            router.push('/organization')
        }
    }, [])


    return (
        <div className="p-6 max-w-xl mx-auto space-y-6">

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
