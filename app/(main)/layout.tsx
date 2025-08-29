'use client'


import BootstrapClient from "@/app/components/BootstrapClient";
import Sidebar from "@/app/components/Sidebar";
import Footer from "@/app/components/Footer";
import React, {useEffect, useState} from "react";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {useLibraryStore} from "@/app/store/libraryStore";
import {useAuthStore} from "@/app/store/authStore";
import {usePathname, useRouter} from "next/navigation";
import {useScreensStore} from "@/app/store/screensStore";
import OrgCheckModal from "@/app/components/Common/OrgCheckModal";
import {useOrganizationStore} from "@/app/store/organizationStore";

export default function MainLayout({children}: { children: React.ReactNode }) {
    const {playlistItems, getPlaylists} = usePlaylistStore()
    const {checkToken, isAuthenticated, loading} = useAuthStore()
    const {libraryItems, getFilesInLibrary} = useLibraryStore(state => state)
    const {allScreens, getScreens, getGroups} = useScreensStore(state => state)
    const {getSchedule, scheduledFixedMap, scheduledCalendarMap} = useScheduleStore();
    const {getInfoOrg} = useOrganizationStore();
    const [showOrgModal, setShowOrgModal] = useState(false);
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false)

    const router = useRouter()

    useEffect(() => {
        async function init() {
            console.log("dasdasdasasdasd")
            const resCheck = await checkToken();

            if (!resCheck) {

                router.push("/auth/login")
                return
            }


            const orgInfo = await getInfoOrg()

            if (orgInfo) {
                if (playlistItems.length === 0) {
                    await getFilesInLibrary()
                }
            }

            // if (allScreens.length == 0) {
            //     await getScreens()
            //     await getGroups()
            // }
            //
            // if (libraryItems.length == 0) {
            //     await getFilesInLibrary()
            // }
            //
            //
            // if (playlistItems.length === 0) {
            //     await getPlaylists()
            // }
            //
            //
            // const isScheduleEmpty =
            //     Object.keys(scheduledFixedMap).length === 0 &&
            //     Object.keys(scheduledCalendarMap).length === 0;
            //
            // if (isScheduleEmpty) {
            //     await getSchedule();
            // }
        }


        init()
    }, [])


    if (loading || !isAuthenticated) {
        return <div className="text-center p-4">Загрузка…</div>
    }


    return (
        <>
            <BootstrapClient/>
            {/*<OrgCheckModal/>*/}

            <div className="d-flex">
                <Sidebar
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(v => !v)}
                />
                <main
                    className="flex-fill"
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
