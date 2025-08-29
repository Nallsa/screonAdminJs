import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import axios from 'axios';
import {FileItem} from '@/public/types/interfaces';
import {getValueInStorage} from "@/app/API/localStorage";
import {useOrganizationStore} from "@/app/store/organizationStore";


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
                const index = state.libraryItems.findIndex((i: { id: string; }) => i.id === updatedItem.fileId);
                if (index !== -1) {
                    state.libraryItems[index] = updatedItem;
                }
            });
        },

        deleteLibraryItem: (id: string) => {
            set((state) => {
                state.libraryItems = state.libraryItems.filter(i => i.id !== id)
                state.libraryItems = state.libraryItems.filter(i => i.fileId !== id)

            });
        },

        uploadFileMetaData: async (item: FileItem): Promise<void> => {
            set(state => {
                state.isUploadingMetadata = true
                state.uploadError = null
            })

            try {
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
                const userId = getValueInStorage('userId')
                const organizationId = getValueInStorage('organizationId')
                const accessToken = getValueInStorage("accessToken")

                const activeBranches = useOrganizationStore.getState().activeBranches; // Access active branches from the other store

                if (userId?.trim() && organizationId?.trim()) {
                    const response = await axios.post(`${SERVER_URL}files/assign-metadata`, {
                            fileId: item.fileId,
                            uploadedBy: getValueInStorage('userId'),
                            organizationId: getValueInStorage('organizationId'),
                            branchIds: activeBranches.map(b => b.id), // Send IDs of active branches
                            isPublic: true,
                        },
                        {headers: {Authorization: `Bearer ${accessToken}`}}
                    )

                    console.log('uploadMediaData response:', response.data)
                    alert('Upload successful'); // Added notification for success

                } else {
                    alert('Upload failed');
                    throw new Error('Upload failed due to missing user or organization ID');
                }

            } catch (err: any) {
                console.error('uploadFileMetaData error:', err)
                const errorMessage = err?.response?.data?.message || err.message || 'Ошибка при загрузке метаданных';
                get().setError(errorMessage);
                alert(`Upload failed: ${errorMessage}`); // Added notification for failure
                throw err; // Rethrow to reject the promise
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


                const activeBranches = useOrganizationStore.getState().activeBranches; // Access active branches from the other store

                const response = await axios.post(`${SERVER_URL}files/user-files`, {
                        userId: getValueInStorage('userId'),
                        organizationId: getValueInStorage('organizationId'),
                        branchIds: activeBranches.map(b => b.id), // Send IDs of active branches
                    },
                    {headers: {Authorization: `Bearer ${accessToken}`}}
                );

                const filesFromBackend = (response.data as any[]).map(raw => {
                    const {
                        id,
                        fileId = raw.id,
                        name,
                        contentType,
                        size,
                        duration,
                        previewUrl,
                        orderIndex = 0
                    } = raw

                    return {
                        id,
                        fileId,
                        file: null,
                        name,
                        type: contentType,
                        size,
                        duration,
                        previewUrl,
                        orderIndex,
                    } as FileItem
                })
                console.log("getFilesInLibrary", filesFromBackend)


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
