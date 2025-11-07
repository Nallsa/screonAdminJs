/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'


import BootstrapClient from "@/app/components/BootstrapClient";
import Sidebar from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {useLibraryStore} from "@/app/store/libraryStore";
import {useAuthStore} from "@/app/store/authStore";
import {usePathname, useRouter} from "next/navigation";
import {useScreensStore} from "@/app/store/screensStore";
import OrgCheckModal from "@/app/components/Common/OrgCheckModal";
import {useOrganizationStore} from "@/app/store/organizationStore";
import {useLicenseStore} from "@/app/store/licenseStore";

export default function MainLayout({children}: { children: React.ReactNode }) {
    const pathname = usePathname();

    const {playlistItems, getPlaylists} = usePlaylistStore()
    const {checkToken, isAuthenticated, loading} = useAuthStore()
    const {libraryItems, getFilesInLibrary} = useLibraryStore(state => state)
    const {
        allScreens,
        getScreens,
        getGroups,
        requestStatusesForAll,
        startAutoStatusPolling
    } = useScreensStore(state => state)
    const {getSchedule, scheduledCalendarMap} = useScheduleStore();
    const {getInfoOrg, activeBranches, organizationInfo} = useOrganizationStore();
    const {getLicense} = useLicenseStore();
    const [showOrgModal, setShowOrgModal] = useState(false);

    const [collapsed, setCollapsed] = useState(true);
    const router = useRouter()

    useEffect(() => {

        if (typeof window !== 'undefined' && window.matchMedia('(min-width: 992px)').matches) {
            setCollapsed(false);
        }

        async function init() {
            const resCheck = await checkToken();

            if (!resCheck) {
                router.push("/auth/login")
                return
            }

            if (pathname.startsWith('/settings')) return


            if (organizationInfo !== null) return

            const orgInfo = await getInfoOrg()

            if (!orgInfo) {
                router.push('/organization/createOrgElements?isBranch=false');
            } else {
                router.push('/screens');
            }
        }


        init()
    }, [organizationInfo])


    const branchesKey = useMemo(
        () => (activeBranches || []).map(b => b.id).sort().join(","),
        [activeBranches]
    );


    const refetchTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (activeBranches.length == 0) return;

        if (refetchTimerRef.current !== null) {
            window.clearTimeout(refetchTimerRef.current);
            refetchTimerRef.current = null;
        }

        refetchTimerRef.current = window.setTimeout(async () => {
            try {
                await getLicense()
                await getScreens();
                await getGroups();
                await getPlaylists?.();
                await getSchedule()
                await getFilesInLibrary?.();
                await requestStatusesForAll?.();
                startAutoStatusPolling?.();
            } catch (e) {
                console.warn("Refetch on branches change failed:", e);
            }
        }, 1000);

        return () => {
            if (refetchTimerRef.current !== null) {
                window.clearTimeout(refetchTimerRef.current);
                refetchTimerRef.current = null;
            }
        };
    }, [branchesKey]);


    if (loading || !isAuthenticated) {
        return <div className="text-center p-4">Загрузка…</div>
    }


    return (
        <>
            <BootstrapClient/>
            {/*<OrgCheckModal/>*/}

            <div className={`layout d-flex ${collapsed ? 'is-collapsed' : 'is-expanded'}`}>
                <Sidebar
                    className="sidebar"
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(v => !v)}
                />
                <main
                    className="main flex-fill"
                    style={{
                        marginLeft: collapsed ? 50 : 220,
                        transition: 'margin-left .3s ease-in-out'
                    }}
                >
                    {children}
                </main>
            </div>

            <Footer/>
        </>
    )
}
