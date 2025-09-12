"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {addValueInStorage} from "@/app/API/localStorage";
import {useLibraryStore} from "@/app/store/libraryStore";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {useOrganizationStore} from "@/app/store/organizationStore";

export default function HomeWindow() {
    const router = useRouter();

    // const {
    //     getInfoOrg,
    // } = useOrganizationStore();
    //
    // useEffect(() => {
    //     async function fetchOrg() {
    //         const success = await getInfoOrg();
    //         if (!success) {
    //             router.push('/organization/createOrgElements?isBranch=false');
    //         } else  {
    //             router.push('/screens'); // редиректим
    //         }
    //     }
    //
    //     fetchOrg();
    // }, [getInfoOrg, router]);


    return null
}
