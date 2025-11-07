/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React, {useEffect, useState} from 'react';
import {Badge, Button, Form} from 'react-bootstrap';
import Link from "next/link";

import {useRouter} from 'next/navigation'
import {usePlaylistStore} from "@/app/store/playlistStore";
import {FileItem, PlaylistItem, UserRole} from "@/public/types/interfaces";
import {getValueInStorage} from "@/app/API/localStorage";
import {useAuthStore} from "@/app/store/authStore";
import {connectWebSocket} from "@/app/API/ws";
import ErrorModal from "@/app/components/Common/ErrorModal";
import PreviewImage from "@/app/components/Common/PreviewImage";
import {useOrganizationStore} from "@/app/store/organizationStore";
import BackgroundPickerButton from "@/app/components/Playlist/BackgroundPickerButton";
import {useScreensStore} from "@/app/store/screensStore";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {WarningModal} from "@/app/components/Common/WarningModal";


export default function PlaylistsPage() {
    const {
        playlistItems, getPlaylists, addPlaylist, setPlaylistToEdit, setPlaylistToCreate, errorMessage,
        setError
    } = usePlaylistStore()
    const {
        bgErrorMessage,
        bgSuccessMessage,
        setBgError,
        setBgSuccess,
    } = useScheduleStore()
    const router = useRouter()
    const branchId = useOrganizationStore(state => state.activeBranches[0]?.id)
    const {role} = useOrganizationStore();


    const backgroundPlaylistId = useScheduleStore(
        s => s.backgroundByBranch?.[branchId || '']?.playlistId ?? null
    )

    const resolveBackgroundForBranch = useScheduleStore(s => s.resolveBackground)
    useEffect(() => {
        if (branchId) resolveBackgroundForBranch?.(branchId)
    }, [branchId, resolveBackgroundForBranch])

    const handleNewPlaylist = () => {
        const userId = getValueInStorage('userId')!;
        const organizationId = getValueInStorage('organizationId')!;

        if (userId?.trim() && organizationId?.trim()) {

            setPlaylistToCreate({
                id: '0',
                name: '',
                organizationId: organizationId,
                createdBy: userId,
                filePreviewId: null,
                childFiles: [] as FileItem[],
                totalDurationSeconds: 0,
                branchId: branchId,
            });
            router.push(`/playlists/0`);
        } else {
            alert("Id пользователя или Id организации отсутствуют");
        }
    };

    const handleEditPlaylist = (
        e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
        playlist: PlaylistItem
    ) => {
        const isAdmin = role === UserRole.ADMIN;
        const belongsToActiveBranch = (branchId === playlist.branchId);

        if (isAdmin && !belongsToActiveBranch) {
            e.preventDefault();
            setError("Этот плейлист принадлежит другому филиалу.");
            return;
        }

        setPlaylistToEdit(playlist);
    };

    const formatHMS = (sec: number) => {
        const h = Math.floor(sec / 3600)
        const m = Math.floor((sec % 3600) / 60)
        const s = sec % 60
        return [
            h.toString().padStart(2, '0'),
            m.toString().padStart(2, '0'),
            s.toString().padStart(2, '0'),
        ].join(':')
    }


    return (
        <>
            <div className="p-4">
                {/* Хедер */}
                <div className="mb-3">
                    <div className="row g-2 align-items-center">
                        <div className="col">
                            <h4 className="mb-0">Плейлисты</h4>
                        </div>

                        <div className="col-12 col-md-auto ms-md-auto d-grid d-sm-inline-flex gap-2">
                            {branchId && <BackgroundPickerButton branchId={branchId}/>}
                            <Button
                                className="px-sm-4 w-100 w-sm-auto"
                                variant="primary"
                                onClick={handleNewPlaylist}
                            >
                                + Новый плейлист
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="d-flex flex-wrap gap-3">
                    {playlistItems.length > 0 ? (
                        playlistItems.map((p) => (

                            <Link
                                key={p.id}
                                href={`/playlists/${p.id}`}
                                onClick={(e) => handleEditPlaylist(e, p)}
                                className="text-decoration-none"
                            >
                                <div
                                    className="card shadow-sm position-relative"
                                    style={{width: 260, background: "white", borderRadius: 8, cursor: 'pointer'}}
                                >
                                    {/* Бейдж Фон */}
                                    {backgroundPlaylistId === p.id && (
                                        <Badge
                                            bg="success"
                                            text="dark"
                                            className="position-absolute"
                                            style={{top: 8, left: 8, zIndex: 2}}
                                        >
                                            Фоновый
                                        </Badge>
                                    )}

                                    <PreviewImage id={p.filePreviewId as string} name={p.name} fill aspectRatio={16 / 9}/>

                                    <div className="p-2">
                                        <div
                                            style={{
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '100%',
                                            }}
                                        >
                                            {p.name}
                                        </div>
                                        <div className="mt-1">🕒 {formatHMS(p.totalDurationSeconds)}</div>
                                    </div>
                                </div>
                            </Link>
                        ))) : (
                        <div className="w-100 d-flex justify-content-center py-5">
      <span className="text-center">
        У вас пока нет плейлистов
        <br/>
        Нажмите кнопку «Новый плейлист», чтобы продолжить
      </span>
                        </div>
                    )}

                </div>
            </div>
            <ErrorModal
                show={!!errorMessage || !!bgErrorMessage}
                message={errorMessage || bgErrorMessage || ''}
                onClose={() => {
                    setError(null);
                    setBgError(null);
                }}
            />
            <WarningModal
                show={!!bgSuccessMessage}
                title="Готово"
                message={bgSuccessMessage || ''}
                buttonText="Ок"
                onClose={() => setBgSuccess(null)}
            />
        </>
    )
}