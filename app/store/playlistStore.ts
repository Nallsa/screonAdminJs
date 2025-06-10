import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import axios from 'axios'
import {MediaItem, PlaylistData} from "@/public/types/interfaces";

interface usePlaylistState {
    playlistItems: MediaItem[]
    playlistData: PlaylistData[]
    playlistToEdit: PlaylistData | null
    priority: string
    editPlaylist: boolean
    draggedIndex: number | null

    setPlaylistToEdit: (value: PlaylistData) => void
    setEditPlaylist: (value: boolean) => void

    addPlaylists: (playlists: PlaylistData[]) => void
    addPlaylistItems: (id: string) => void
    clearPlaylistItems: () => void
    addPlaylistItem: (mediaItem: MediaItem) => void
    removePlaylistItem: (index: number) => void
    updatePlaylistItem: (index: number, newItem: MediaItem) => void
    startDrag: (index: number) => void
    dropAt: (index: number) => void
    clearAll: () => void
    clearPlayLists: () => void

    sendPlaylist: () => Promise<boolean>
    updatePlaylist: () => Promise<boolean>
    getPlaylists: () => Promise<void>
}

const getValueInStorage = (key: string): string => {
    if (typeof localStorage === 'undefined') return ''
    return localStorage.getItem(key) || ''
}

export const usePlaylistStore = create<usePlaylistState>()(
    immer<usePlaylistState>((set, get) => ({
        playlistItems: [],
        playlistData: [],
        playlistToEdit: null,
        priority: 'normal',
        editPlaylist: false,
        draggedIndex: null,

        setPlaylistToEdit: (value) => {
            set(state => { state.playlistToEdit = value })
        },

        setEditPlaylist: (value) => {
            set(state => { state.editPlaylist = value })
        },

        addPlaylists: (playlists) => {
            set(state => {
                state.playlistData.push(...playlists)
            })
        },

        addPlaylistItems: (id) => {
            const playlist = get().playlistData.find(p => p.id === id)
            if (playlist?.items) {
                set(state => {
                    state.playlistItems.push(...playlist.items!)
                })
            }
        },

        clearPlaylistItems: () => {
            set(state => { state.playlistItems = [] })
        },

        addPlaylistItem: (mediaItem) => {
            const newItem = { ...mediaItem, isVisible: false }
            set(state => {
                state.playlistItems.push(newItem)
            })
            setTimeout(() => {
                const index = get().playlistItems.findIndex(i => i.id === newItem.id)
                if (index !== -1) {
                    set(state => {
                        state.playlistItems[index].isVisible = true
                    })
                }
            }, 30)
        },

        removePlaylistItem: (index) => {
            set(state => {
                state.playlistItems[index].isVisible = false
            })
            setTimeout(() => {
                set(state => {
                    state.playlistItems.splice(index, 1)
                })
            }, 300)
        },

        updatePlaylistItem: (index, newItem) => {
            set(state => {
                state.playlistItems[index] = newItem
            })
        },

        startDrag: (index) => {
            set(state => {
                state.draggedIndex = index
            })
        },

        dropAt: (index) => {
            const from = get().draggedIndex
            if (from === null || from === index) return
            set(state => {
                const item = state.playlistItems.splice(from, 1)[0]
                const safeIndex = Math.min(index, state.playlistItems.length)
                state.playlistItems.splice(safeIndex, 0, item)
                state.draggedIndex = null
            })
        },

        clearAll: () => {
            set(state => { state.playlistItems = [] })
        },

        clearPlayLists: () => {
            set(state => { state.playlistData = [] })
        },

        sendPlaylist: async () => {
            const { playlistItems } = get()

            const data = {
                playListName: 'My Playlist',
                userId: getValueInStorage('userId'),
                organizationId: getValueInStorage('organizationId'),
                isPublic: true,
                items: playlistItems.map((item, index) => ({
                    fileId: item.fileId,
                    orderIndex: index
                }))
            }

            const response = await axios.post('/api/playlists/create', data)
            const result = response.data
            return result === true
        },

        updatePlaylist: async () => {
            const { playlistToEdit } = get()
            if (!playlistToEdit) return false

            const response = await axios.post('/api/playlists/create', playlistToEdit)
            const result = response.data
            return result === true
        },

        getPlaylists: async () => {
            const organizationId = getValueInStorage('organizationId')
            const response = await axios.get(`/api/playlists/organizations/${organizationId}`)
            const playlists = response.data

            get().clearPlayLists()

            const formatted = playlists.map((playlist: any) => ({
                id: playlist.id,
                name: playlist.name,
                organizationId: playlist.organizationId,
                createdBy: playlist.createdBy,
                previewUrl: '',
                duration: 0,
                active: true,
                items: playlist.items.sort((a: any, b: any) => a.orderIndex - b.orderIndex)
            }))

            get().addPlaylists(formatted)
        }
    }))
)