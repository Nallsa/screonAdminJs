/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import axios from 'axios'
import {getValueInStorage} from "@/app/API/localStorage";
import {FileItem, PlaylistItem} from "@/public/types/interfaces";
import {useOrganizationStore} from "@/app/store/organizationStore";


interface usePlaylistState {
    playlistItems: PlaylistItem[]
    playlistToEdit: PlaylistItem | null,
    playlistToCreate: PlaylistItem | null,

    getPlaylists: () => Promise<void>

    createPlaylist: (playlistChildren: FileItem[], name: string) => Promise<boolean>

    updatePlaylist: (playlistChildren: FileItem[], name: string) => Promise<boolean>

    deletePlaylist: (playlist: PlaylistItem | null) => Promise<boolean>


    addPlaylists: (playlists: PlaylistItem[]) => void

    clearPlayLists: () => void,

    addPlaylist: (playlist: PlaylistItem) => void

    setPlaylistToEdit: (playlist: PlaylistItem | null) => void,

    setPlaylistToCreate: (playlist: PlaylistItem) => void,

    updatePlaylistItem: (playlist: PlaylistItem) => void,

    updatePlaylistFileItem: (update: {
        id: string
        name: string
        type: string
        duration: number
    }) => Promise<boolean>

    delPlaylistById: (playlistId: string) => void,

    errorMessage: string | null
    setError: (msg: string | null) => void
}


function calcTotalSeconds(childFiles: FileItem[]): number {
    const total = childFiles.reduce<number>(
        (sum, f) => sum + (f?.duration ?? 0),
        0
    );
    return Math.ceil(total);
}

export const usePlaylistStore = create<usePlaylistState>()(
    immer<usePlaylistState>((set, get) => ({
        playlistItems: [],
        playlistToEdit: null,
        playlistToCreate: null,
        errorMessage: null,
        setError: (msg) => set(state => {
            state.errorMessage = msg
        }),

        getPlaylists: async () => {
            try {
                const { clearPlayLists, addPlaylists, setError } = get();
                clearPlayLists();

                const userId = getValueInStorage('userId');
                const accessToken = getValueInStorage('accessToken');

                if (!userId || !accessToken) {
                    setError('Невозможно загрузить плейлисты: отсутствуют учетные данные.');
                    return;
                }

                const orgStore = useOrganizationStore.getState?.();
                const activeBranches = orgStore?.activeBranches ?? [];

                if (!Array.isArray(activeBranches) || activeBranches.length === 0) {
                    // нет выбранных веток — просто нечего грузить
                    addPlaylists([]);
                    return;
                }

                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
                const payload = {
                    branchIds: activeBranches.map(b => b.id).filter(Boolean),
                };

                const resp = await axios.post(
                    `${SERVER_URL}playlists/branches`,
                    payload,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );

                const rawPlaylists: any[] = Array.isArray(resp.data) ? resp.data : [];

                // === НОРМАЛИЗАЦИЯ ===
                const makeIptvFileId = (url: string) => `iptv_${encodeURIComponent(url)}`;

                const mapChildToFileItem = (c: any, idx: number): FileItem => {
                    const isIptv = c?.source === 'IPTV' || c?.type === 'IPTV';
                    if (isIptv) {
                        const url: string = c?.iptvUrl || c?.url || '';
                        const name: string = c?.iptvName || c?.name || 'IPTV';
                        const logo: string | null = c?.iptvLogo ?? c?.previewUrl ?? null;

                        return {
                            id: makeIptvFileId(url),
                            fileId: makeIptvFileId(url),
                            name,
                            type: 'IPTV',
                            size: null,
                            duration: c?.duration ?? null, // бэк может прислать дефолт (например 120)
                            hasPreview: Boolean(logo),
                            previewUrl: logo ?? undefined,
                            downloadUrl: undefined,
                            orderIndex: Number.isFinite(c?.orderIndex) ? c.orderIndex : idx,
                            source: 'IPTV',
                            iptvName: name,
                            iptvUrl: url,
                            iptvLogo: logo,
                            // опциональные:
                            file: null,
                            width: null,
                            height: null,
                        };
                    }

                    // FILE
                    const fileId: string = c?.fileId || c?.id || '';
                    const previewUrl: string | undefined = c?.previewUrl || undefined;

                    return {
                        id: fileId,
                        fileId,
                        name: c?.name ?? 'Без названия',
                        type: c?.type ?? 'application/octet-stream',
                        size: Number.isFinite(c?.size) ? c.size : 0,
                        duration: c?.duration ?? null,
                        hasPreview: Boolean(previewUrl),
                        previewUrl,
                        downloadUrl: c?.downloadUrl ?? undefined,
                        orderIndex: Number.isFinite(c?.orderIndex) ? c.orderIndex : idx,
                        source: 'FILE',
                        // опциональные:
                        file: null,
                        width: c?.width ?? null,
                        height: c?.height ?? null,
                        sha256: c?.sha256,
                        createdAt: c?.createdAt,
                        uploadedBy: c?.uploadedBy,
                        organizationId: c?.organizationId,
                        branchId: c?.branchId,
                    };
                };

                const normalized = rawPlaylists.map((p: any) => {
                    const children: FileItem[] = Array.isArray(p?.childFiles)
                        ? p.childFiles.map(mapChildToFileItem).sort((a: { orderIndex: number; }, b: { orderIndex: number; }) => a.orderIndex - b.orderIndex)
                        : [];

                    return {
                        ...p,
                        name: p?.name ?? 'Без названия',
                        childFiles: children,
                    };
                });

                addPlaylists(normalized);
            } catch (err: any) {
                console.error('Ошибка при получении плейлистов:', err);
                get().setError(err?.response?.data?.message || 'Не удалось получить плейлисты.');
            }
        },

        createPlaylist: async (playlistChildren: FileItem[], name: string) => {
            try {
                const accessToken = getValueInStorage('accessToken')

                const {addPlaylist} = get()
                const activeBranches = useOrganizationStore.getState().activeBranches;
                const data = {
                    playListName: name,
                    branchIds: activeBranches.map(b => b.id),
                    isPublic: true,
                    childFiles: playlistChildren.map((f, idx) => {
                        const isIptv = f.source === 'IPTV' || f.type === 'IPTV'
                        if (isIptv) {
                            return {
                                source: 'IPTV',
                                orderIndex: f.orderIndex ?? idx,
                                name: f.name,
                                type: 'IPTV',
                                size: null,
                                duration: null, // бэк сам проставит дефолт
                                previewUrl: f.previewUrl ?? f.iptvLogo ?? null,
                                iptvName: f.iptvName ?? f.name,
                                iptvUrl: f.iptvUrl!,              // обязателен
                                iptvLogo: f.iptvLogo ?? f.previewUrl ?? null,
                            }
                        }
                        // FILE (как было, только явно укажем source)
                        return {
                            source: 'FILE',
                            fileId: f.fileId,
                            name: f.name,
                            type: f.type,
                            size: f.size,
                            duration: f.duration,
                            previewUrl: f.previewUrl,
                            orderIndex: f.orderIndex ?? idx,
                        }
                    })
                };

                console.log("[createPlaylist]", data)

                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                const response = await axios.post(`${SERVER_URL}playlists/create`, data,
                    {headers: {Authorization: `Bearer ${accessToken}`}})

                const result: PlaylistItem = response.data

                console.log(result)

                addPlaylist(result)


                return !!result
            } catch (err: any) {
                console.error('Ошибка при создании плейлиста:', err)
                get().setError(err?.response?.data?.message || "Не удалось создать плейлист.")
                return false
            } finally {
                const {getPlaylists} = get()
                getPlaylists()
            }
        },

        updatePlaylistFileItem: async (update: {
            id: string
            name: string
            type: string
            duration: number
        }) => {

            console.log('[updatePlaylistFileItem] sending payload:', update)

            try {
                const accessToken = getValueInStorage('accessToken')
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL!

                const response = await axios.put<{
                    id: string
                    orderIndex: number
                    name: string
                    type: string
                    size: number
                    duration: number
                    previewUrl: string
                }>(
                    `${SERVER_URL}playlists/update/playlist-item`,
                    update,
                    {headers: {Authorization: `Bearer ${accessToken}`}}
                )
                const dto = response.data

                set(state => {
                    const pl = state.playlistToEdit
                    if (pl) {
                        // обновляем сам плейлист
                        pl.childFiles = pl.childFiles.map(f =>
                            f.id === dto.id
                                ? {
                                    ...f,
                                    orderIndex: dto.orderIndex,
                                    name: dto.name,
                                    type: dto.type,
                                    size: dto.size,
                                    duration: dto.duration,
                                    previewUrl: dto.previewUrl,
                                }
                                : f
                        )
                        // пересчитываем totalDurationSeconds
                        pl.totalDurationSeconds = calcTotalSeconds(pl.childFiles)
                    }

                    state.playlistItems = state.playlistItems.map(p =>
                        // если это тот же плейлист — подтягиваем новые childFiles и новую длительность
                        pl && p.id === pl.id
                            ? {
                                ...p,
                                childFiles: pl.childFiles,
                                totalDurationSeconds: calcTotalSeconds(pl.childFiles)
                            }
                            : p
                    )
                })

                return true
            } catch (err: any) {
                console.error('Ошибка при обновлении файла в плейлисте:', err)
                get().setError(
                    err?.response?.data?.message ||
                    'Не удалось обновить информацию о файле.'
                )
                return false
            }
        },


        updatePlaylist: async (playlistChildren: FileItem[], name: string) => {
            try {
                const { playlistToEdit, updatePlaylistItem } = get();
                if (!playlistToEdit) return false;

                const accessToken = getValueInStorage('accessToken');
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                // маппинг детей в DTO для бэка
                const childFilesDto = playlistChildren.map((f, idx) => {
                    const isIptv = f.source === 'IPTV' || f.type === 'IPTV';
                    if (isIptv) {
                        return {
                            source: 'IPTV',
                            orderIndex: f.orderIndex ?? idx,
                            name: f.name,
                            type: 'IPTV',
                            size: null,
                            duration: null, // бэк сам поставит дефолт (например 120)
                            previewUrl: f.previewUrl ?? f.iptvLogo ?? null,
                            iptvName: f.iptvName ?? f.name,
                            iptvUrl: f.iptvUrl!,                 // обязателен
                            iptvLogo: f.iptvLogo ?? f.previewUrl ?? null,
                        };
                    }
                    // FILE
                    return {
                        source: 'FILE',
                        fileId: f.fileId,
                        orderIndex: f.orderIndex ?? idx,
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        duration: f.duration,
                        previewUrl: f.previewUrl ?? null,
                    };
                });

                // полезно унифицировать индексы на всякий
                childFilesDto.forEach((c: any, i: number) => (c.orderIndex = i));

                // тело апдейта (минимально необходимое)
                const payload: any = {
                    id: playlistToEdit.id,                   // идентификатор плейлиста для обновления
                    name,
                    // если бэку нужны ветки/публичность при апдейте — передадим
                    branchIds: playlistToEdit.branchId ? [playlistToEdit.branchId] : undefined,
                    isPublic: (playlistToEdit as any).isPublic ?? true,
                    childFiles: childFilesDto,
                };

                // можно подчистить undefined, чтобы не слать лишнее
                Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

                const response = await axios.put(
                    `${SERVER_URL}playlists/update`,
                    payload,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );

                const result: PlaylistItem = response.data;
                updatePlaylistItem(result);
                return !!result;
            } catch (err: any) {
                console.error('Ошибка при обновлении плейлиста:', err);
                get().setError(err?.response?.data?.message || 'Не удалось обновить плейлист.');
                return false;
            }
        },


        deletePlaylist: async (playlist) => {
            const {playlistToEdit, delPlaylistById} = get()
            let delPlaylist: PlaylistItem | null = playlist

            if (playlistToEdit) {
                console.log('[deletePlaylist] Overriding with playlistToEdit')
                delPlaylist = playlistToEdit
            }

            if (!delPlaylist) {
                console.warn('[deletePlaylist] No playlist to delete, aborting.')
                return false
            }

            const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL

            try {
                const response = await axios.delete(`${SERVER_URL}playlists/${delPlaylist.id}`)

                const result = response.data

                if (result) {
                    delPlaylistById(delPlaylist.id)
                    return result === true

                } else {
                    return false
                }
            } catch (err: any) {
                console.error('Ошибка при удалении плейлиста:', err)
                get().setError(err?.response?.data?.message || "Не удалось удалить плейлист.")
                return false
            }
        },


        addPlaylist: (playlist) => {
            set(state => {
                state.playlistItems.push({
                    ...playlist,
                    totalDurationSeconds: calcTotalSeconds(playlist.childFiles)
                })
            })
        },

        addPlaylists: (playlists) => {
            set(state => {
                state.playlistItems = playlists.map(pl => ({
                    ...pl,
                    totalDurationSeconds: calcTotalSeconds(pl.childFiles)
                }))
            })
        },


        setPlaylistToEdit: (playlist) => {
            set(state => {
                state.playlistToEdit = playlist;
            });
        },

        setPlaylistToCreate: (playlist) => {
            set(state => {
                state.playlistToCreate = playlist;
                state.playlistToEdit = null;
            });
        },


        delPlaylistById: (playlistId: string) => {
            set(state => ({
                playlistItems: state.playlistItems.filter(p => p.id !== playlistId)
            }));
        },

        updatePlaylistItem: (updated) => {
            set(state => {
                state.playlistItems = state.playlistItems.map(pl =>
                    pl.id === updated.id
                        ? {
                            ...updated,
                            totalDurationSeconds: calcTotalSeconds(updated.childFiles)
                        }
                        : pl
                );
            });
        },


        clearPlayLists: () => {
            set(state => {
                state.playlistItems = []
            })
        },

    }))
)