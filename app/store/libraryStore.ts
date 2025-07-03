import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import axios from 'axios';
import {FileItem} from '@/public/types/interfaces';
import {getValueInStorage} from "@/app/API/localStorage";


interface LibraryStore {
    libraryItems: FileItem[];
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

    delFileById: (id: string) => Promise<boolean>

    errorMessage: string | null
    setError: (msg: string | null) => void
}


export const useLibraryStore = create<LibraryStore>()(
    immer((set, get) => ({
        libraryItems: [],
        isUploadingMetadata: false,
        uploadError: null,
        errorMessage: null,
        setError: (msg) => set(state => {
            state.errorMessage = msg
        }),

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
                const userId = getValueInStorage('userId')
                const organizationId = getValueInStorage('organizationId')
                const accessToken = getValueInStorage("accessToken")

                if (userId?.trim() && organizationId?.trim()) {
                    const response = await axios.post(`${SERVER_URL}files/assign-metadata`, {
                            fileId: item.id,
                            uploadedBy: getValueInStorage('userId'),
                            organizationId: getValueInStorage('organizationId'),
                            isPublic: true,
                        },
                        {headers: {Authorization: `Bearer ${accessToken}`}}
                    )

                    console.log('uploadMediaData response:', response.data)

                } else {
                    alert('Upload failed');
                }

            } catch (err: any) {
                console.error('uploadFileMetaData error:', err)
                get().setError(
                    err?.response?.data?.message
                    || err.message
                    || 'Ошибка при загрузке метаданных'
                )
            } finally {
                set(state => {
                    state.isUploadingMetadata = false
                })
            }
        },

        getFilesInLibrary: async () => {
            set(state => {
                state.errorMessage = null
            })
            try {
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
                const accessToken = getValueInStorage("accessToken")

                const response = await axios.post(`${SERVER_URL}files/user-files`, {
                        userId: getValueInStorage('userId'),
                        organizationId: getValueInStorage('organizationId'),
                    },
                    {headers: {Authorization: `Bearer ${accessToken}`}}
                );

                const filesFromBackend: FileItem[] = response.data;

                // Сохраняем в Zustand
                get().addLibraryItems(filesFromBackend);

                console.log('Загружено файлов:', filesFromBackend.length);
            } catch (err: any) {
                console.error('getFilesInLibrary error:', err)
                get().setError(
                    err?.response?.data?.message
                    || err.message
                    || 'Ошибка при получении файлов библиотеки'
                )
            }
        },


        uploadFile: async (
            url,
            file,
            onProgress,
            onComplete
        ) => {
            set(state => {
                state.errorMessage = null
            })
            const formData = new FormData();
            formData.append('file', file, file.name);
            const accessToken = getValueInStorage("accessToken");
            try {
                const response = await axios.post(String(url), formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            Authorization: `Bearer ${accessToken}`
                        }
                        ,
                        onUploadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                onProgress(percent);
                            }
                        },
                    });

                console.log("загруженный файл", formData)
                const fileId = response.data?.fileId ?? null;
                onComplete(fileId);
            } catch (err: any) {
                console.error('uploadFile error:', err)
                get().setError(
                    err?.response?.data?.message
                    || err.message
                    || 'Ошибка при загрузке файла'
                )
                onComplete(null)
            }
        },


        delFileById: async (id) => {
            set(state => {
                state.errorMessage = null
            })
            try {
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

                const response = await axios.delete(`${SERVER_URL}files/${id}`);

                return response.status === 204
            } catch (err: any) {
                console.error('delFileById error:', err)
                get().setError(
                    err?.response?.data?.message
                    || err.message
                    || 'Ошибка при удалении файла'
                )
                return false
            }
        }


    }))
);
