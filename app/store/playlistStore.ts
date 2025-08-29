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
    // duration уже в секундах (float), суммируем и округляем вверх
    const total = childFiles.reduce((sum, f) => sum + f.duration, 0)
    return Math.ceil(total)
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
                get().clearPlayLists();

                const userId = getValueInStorage('userId');
                const accessToken = getValueInStorage('accessToken')

                if (!userId || !accessToken) {
                    get().setError("Невозможно загрузить плейлисты: отсутствуют учетные данные.")
                    return
                }

                // Здесь получаем состояние из другого стора
                const orgState = useOrganizationStore.getState();
                const organizationId = orgState.organizationInfo?.id; // Пример: доступ к полю из useOrganizationStore
                // Или любой другой нужный вам данные, например, activeBranches: orgState.activeBranches

                console.log('Organization ID из другого стора:', organizationId); // Для примера

                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                const activeBranches = useOrganizationStore.getState().activeBranches; // Access active branches from the other store
                const data = {
                    branchIds: activeBranches.map(b => b.id), // Send IDs of active branches
                };

                console.log('datadata:', data); // Для примера

                const response = await axios.post(`${SERVER_URL}playlists/branches`, data,
                    {headers: {Authorization: `Bearer ${accessToken}`}}
                );

                const playlists = response.data;

                console.log("Плейлисты", playlists)

                get().addPlaylists(playlists);
            } catch (err: any) {
                console.error('Ошибка при получении плейлистов:', err)
                get().setError(err?.response?.data?.message || "Не удалось получить плейлисты.")
            }
        },

        createPlaylist: async (playlistChildren: FileItem[], name: string) => {
            try {
                const accessToken = getValueInStorage('accessToken')

                const {addPlaylist} = get()
                const activeBranches = useOrganizationStore.getState().activeBranches; // Access active branches from the other store
                const data = {
                    playListName: name,
                    branchIds: activeBranches.map(b => b.id), // Send IDs of active branches
                    isPublic: true,
                    childFiles: playlistChildren.map(f => ({
                        fileId: f.fileId,
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        duration: f.duration,
                        previewUrl: f.previewUrl,
                        orderIndex: f.orderIndex,
                    }))
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
                const {playlistToEdit, updatePlaylistItem} = get()
                if (!playlistToEdit) return false
                const accessToken = getValueInStorage('accessToken')
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                const formatted: PlaylistItem = {
                    ...playlistToEdit,
                    name: name,
                    childFiles: playlistChildren,
                }

                const response = await axios.put(`${SERVER_URL}playlists/update`, formatted
                    ,
                    {headers: {Authorization: `Bearer ${accessToken}`}})
                const result: PlaylistItem = response.data


                updatePlaylistItem(result)

                return !!result
            } catch (err: any) {
                console.error('Ошибка при обновлении плейлиста:', err)
                get().setError(err?.response?.data?.message || "Не удалось обновить плейлист.")
                return false
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