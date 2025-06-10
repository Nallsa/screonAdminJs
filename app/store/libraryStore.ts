import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import axios from 'axios'
import {MediaItem} from "@/public/types/interfaces";

interface FileItemDto {
    id: string
    name: string
    contentType: string
    size: number
    width?: number
    height?: number
    duration?: number
    sha256: string
    uploadedBy: string
    organizationId: string
    hasPreview: boolean
    createdAt: string
    tags: string[]
    categoryIds: string[]
    downloadUrl: string
    previewUrl?: string
    public: boolean
}

interface LibraryStore {
    libraryItems: MediaItem[]
    isUploadingMetadata: boolean
    uploadError: string | null

    addLibraryItem: (item: MediaItem) => void
    updateLibraryItem: (index: number, item: MediaItem) => void
    removeFromLibrary: (index: number) => void
    uploadMediaData: (item: MediaItem) => Promise<void>
    getFilesInLibrary: () => Promise<void>
}

const getValueInStorage = (key: string): string => {
    if (typeof localStorage === 'undefined') return ''
    return localStorage.getItem(key) || ''
}

const fileItemDtoToMediaItem = (dto: FileItemDto): MediaItem => ({
    previewUrl: dto.downloadUrl,
    type: dto.contentType.startsWith('video') ? 'VIDEO' : 'IMAGE',
    title: dto.name,
    duration: dto.duration ?? 0,
    videoUrl: dto.contentType.startsWith('video') ? dto.downloadUrl : "",
    fileId: dto.id,
    id: dto.id, // <- если используешь и это поле
    isVisible: true,
})

export const useLibraryStore = create<LibraryStore>()(
    immer((set, get) => ({
        libraryItems: [],
        isUploadingMetadata: false,
        uploadError: null,

        addLibraryItem: (item) => {
            const newItem = {...item, isVisible: false}
            set(state => {
                state.libraryItems.push(newItem)
            })
            setTimeout(() => {
                const index = get().libraryItems.findIndex(i => i.fileId === item.fileId)
                if (index !== -1) {
                    set(state => {
                        state.libraryItems[index].isVisible = true
                    })
                }
            }, 30)
        },

        updateLibraryItem: (index, item) => {
            set(state => {
                state.libraryItems[index] = item
            })
        },

        removeFromLibrary: (index) => {
            set(state => {
                state.libraryItems.splice(index, 1)
            })
        },

        uploadMediaData: async (item) => {
            set(state => {
                state.isUploadingMetadata = true
                state.uploadError = null
            })

            try {
                const response = await axios.post('/api/files/assign-metadata', {
                    fileId: item.fileId,
                    uploadedBy: getValueInStorage('userId'),
                    organizationId: getValueInStorage('organizationId'),
                    isPublic: true,
                })

                console.log('uploadMediaData response:', response.data)
            } catch (error) {
                set(state => {
                    state.uploadError = 'Ошибка при загрузке метаданных'
                })
            } finally {
                set(state => {
                    state.isUploadingMetadata = false
                })
            }
        },

        getFilesInLibrary: async () => {
            try {
                const response = await axios.post('/api/files/user-files', {
                    userId: getValueInStorage('userId'),
                    organizationId: getValueInStorage('organizationId'),
                })

                const files: FileItemDto[] = response.data

                files.forEach(dto => {
                    const mediaItem = fileItemDtoToMediaItem(dto)
                    get().addLibraryItem(mediaItem)
                })
            } catch (error) {
                console.error('Ошибка получения файлов библиотеки', error)
            }
        }
    }))
)
