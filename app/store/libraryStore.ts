import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import axios from 'axios';
import {FileItem} from '@/public/types/interfaces';
import {getValueInStorage} from "@/app/API/localStorage";


interface LibraryStore {
    libraryItems: (FileItem)[];
    isUploadingMetadata: boolean;
    uploadError: string | null;

    addLibraryItem: (item: FileItem) => void;
    addLibraryItems: (item: FileItem[]) => void;
    updateLibraryItem: (updatedItem: FileItem) => void;
    deleteLibraryItem: (id: string) => void;
    uploadFileMetaData: (item: FileItem) => Promise<void>
    uploadFile: (url: String,
                 file: File,
                 onProgress: (percent: number) => void,
                 onComplete: (fileId: string | null) => void,
    ) => Promise<void>

    getFilesInLibrary: () => Promise<void>
}


export const useLibraryStore = create<LibraryStore>()(
    immer((set, get) => ({
        libraryItems: [],
        isUploadingMetadata: false,
        uploadError: null,

        addLibraryItem: (item) => {
            set((state) => ({
                ...state,
                libraryItems: [...state.libraryItems, {...item}]
            }));
        },


        addLibraryItems: (items: FileItem[]) => {
            set((state) => {
                state.libraryItems = items;
            });
        },


        updateLibraryItem: (updatedItem: FileItem) => {
            set((state) => {
                const index = state.libraryItems.findIndex((i: { id: string; }) => i.id === updatedItem.id);
                if (index !== -1) {
                    state.libraryItems[index] = updatedItem;
                }
            });
        },

        deleteLibraryItem: (id: string) => {
            set((state) => {
                state.libraryItems = state.libraryItems.filter((i: { id: string; }) => i.id !== id);
            });
        },

        uploadFileMetaData: async (item) => {
            set(state => {
                state.isUploadingMetadata = true
                state.uploadError = null
            })

            try {
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;


                const response = await axios.post(`${SERVER_URL}files/assign-metadata`, {
                    fileId: item.id,
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
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                const response = await axios.post(`${SERVER_URL}files/user-files`, {
                    userId: getValueInStorage('userId'),
                    organizationId: getValueInStorage('organizationId'),
                });

                const filesFromBackend = response.data;

                // Преобразуем к FileItem[]
                const files: FileItem[] = filesFromBackend.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    type: item.contentType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                    size: item.size,
                    duration: item.duration ?? 0,
                    file: new File([], item.name, { type: item.contentType }), // Пустой файл (не нужен для отображения)
                    url: item.downloadUrl,
                }));

                // Сохраняем в Zustand
                get().addLibraryItems(files);

                console.log('Загружено файлов:', files.length);
            } catch (error) {
                console.error('Ошибка получения файлов библиотеки', error);
            }
        },



        uploadFile: async (
            url,
            file,
            onProgress,
            onComplete
        ) => {
            const formData = new FormData();
            formData.append('file', file, file.name);

            try {
                const response = await axios.post(String(url), formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            onProgress(percent);
                        }
                    },
                });

                const fileId = response.data?.fileId ?? null;
                onComplete(fileId);
            } catch (error) {
                console.error('❌ Upload failed', error);
                onComplete(null);
            }
        },



    }))
);
