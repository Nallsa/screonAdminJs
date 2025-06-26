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

    delPlaylistById: (playlistId: string) => void,


}


export const usePlaylistStore = create<usePlaylistState>()(
    immer<usePlaylistState>((set, get) => ({
        playlistItems: [],
        playlistToEdit: null,
        playlistToCreate: null,

        getPlaylists: async () => {
            try {
                get().clearPlayLists();

                const userId = getValueInStorage('userId');

                console.log(userId);

                if (!userId) {
                    console.warn('Organization ID is missing');
                    return;
                }
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                const response = await axios.get(`${SERVER_URL}playlists/users/${userId}`);

                const playlists = response.data;

                get().addPlaylists(playlists);
            } catch (error) {
                console.error('Ошибка при получении плейлистов:', error);
            }
        },

        createPlaylist: async (playlistChildren: FileItem[], name: string) => {
            const {addPlaylist} = get()
            const data = {
                playListName: name,
                userId: getValueInStorage('userId'),
                organizationId: getValueInStorage('organizationId'),
                isPublic: true,
                childFiles: playlistChildren
            }

            const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

            const response = await axios.post(`${SERVER_URL}playlists/create`, data)
            const result: PlaylistItem = response.data

            console.log(result)

            addPlaylist(result)

            return !!result
        },


        updatePlaylist: async (playlistChildren: FileItem[], name: string) => {
            const {playlistToEdit, updatePlaylistItem} = get()
            if (!playlistToEdit) return false

            const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

            const formatted: PlaylistItem = {
                ...playlistToEdit,
                name: name,
                childFiles: playlistChildren,
            }

            const response = await axios.put(`${SERVER_URL}playlists/update`, formatted)
            const result: PlaylistItem = response.data
            updatePlaylistItem(result)

            return !!result
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
            } catch (error) {
                console.error('[deletePlaylist] Error during deletion:', error)
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
                    console.warn(`[updatePlaylistItem] Плейлист с id ${updatedPlaylist.id} не найден`);
                }

                const updatedItems = state.playlistItems.map(item =>
                    item.id === updatedPlaylist.id ? updatedPlaylist : item
                );

                console.log('[updatePlaylistItem] Результат после обновления:', updatedItems);

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