import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import axios from 'axios'
import {getValueInStorage} from "@/app/API/localStorage";
import {FileItem, PlaylistItem} from "@/public/types/interfaces";


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

                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                const response = await axios.get(`${SERVER_URL}playlists/users`,
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
                const data = {
                    playListName: name,
                    userId: getValueInStorage('userId'),
                    organizationId: getValueInStorage('organizationId'),
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
                    name: string
                    type: string
                    duration: number
                }>(
                    `${SERVER_URL}playlists/update/playlist-item`,
                    update,
                    {headers: {Authorization: `Bearer ${accessToken}`}}
                )
                const dto = response.data

                set(state => {
                    // если у нас открыта форма редактирования — поменяем там
                    if (state.playlistToEdit) {
                        state.playlistToEdit.childFiles = state.playlistToEdit.childFiles.map(f =>
                            f.id === dto.id
                                ? ({
                                    ...f,
                                    fileId: f.fileId,
                                    name: dto.name,
                                    type: dto.type,
                                    size: dto.size,
                                    duration: dto.duration,
                                    previewUrl: dto.previewUrl,
                                    orderIndex: dto.orderIndex
                                } as FileItem)
                                : f
                        )
                    }

                    // и подтянем те же изменения в список всех плейлистов
                    state.playlistItems = state.playlistItems.map(pl =>
                        state.playlistToEdit && pl.id === state.playlistToEdit.id
                            ? {...pl, childFiles: state.playlistToEdit.childFiles}
                            : pl
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
                state.playlistItems.push(playlist)
            })
        },

        addPlaylists: (playlists) => {
            set(state => {
                state.playlistItems = playlists;
            });
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

        updatePlaylistItem: (updatedPlaylist) => {
            console.log('[updatePlaylistItem] Обновление плейлиста:', updatedPlaylist);

            set(state => {
                const exists = state.playlistItems.some(item => item.id === updatedPlaylist.id);
                if (!exists) {
                    console.warn(`Плейлист не найден`);
                }

                const updatedItems = state.playlistItems.map(item =>
                    item.id === updatedPlaylist.id ? updatedPlaylist : item
                );
                return {
                    playlistItems: updatedItems
                };
            });
        },


        clearPlayLists: () => {
            set(state => {
                state.playlistItems = []
            })
        },

    }))
)