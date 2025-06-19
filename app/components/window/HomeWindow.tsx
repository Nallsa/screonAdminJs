"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {addValueInStorage} from "@/app/API/localStorage";
import {useLibraryStore} from "@/app/store/libraryStore";
import {usePlaylistStore} from "@/app/store/playlistStore";

export default function HomeWindow() {
    const router = useRouter();
    const {getFilesInLibrary} = useLibraryStore();
    const {getPlaylists} = usePlaylistStore();


    useEffect(() => {
        (async () => {
            // addValueInStorage("organizationId", "aab12345-6789-4321-bbaa-1234567890cd");
            // addValueInStorage("userId", "aab12345-6789-4321-bbaa-1234567890ab");
            //
            await getFilesInLibrary();
            await getPlaylists();

            console.log('daasdasasfafsfas');

            router.push('/playlists'); // редиректим
        })(); // 👈 вызываем немедленно
    }, [getFilesInLibrary, getPlaylists, router]);


    return null
}
