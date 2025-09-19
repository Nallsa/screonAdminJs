/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client';

import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import axios from 'axios';
import {getValueInStorage} from '@/app/API/localStorage';
import {useLibraryStore} from '@/app/store/libraryStore';
import {CatalogAsset} from "@/public/types/interfaces";

interface CatalogState {
    assets: CatalogAsset[];
    loading: boolean;
    error: string | null;
    fetchAssets: () => Promise<void>;
    addFromCatalog: (asset: CatalogAsset) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>()(
    immer((set, get) => ({
        assets: [],
        loading: false,
        error: null,

        fetchAssets: async () => {
            try {
                set((s) => {
                    s.loading = true;
                    s.error = null;
                });
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
                const accessToken = getValueInStorage('accessToken');
                console.log(accessToken)
                const {data} = await axios.get(`${SERVER_URL}catalog/assets`, {
                    headers: {Authorization: `Bearer ${accessToken}`},
                });
                set((s) => {
                    s.assets = data as CatalogAsset[];
                });

                console.log(`Магазин:  `, data)

            } catch (e: any) {
                set((s) => {
                    s.error =
                        e?.response?.data?.message ||
                        e.message ||
                        'Не удалось загрузить каталог';
                });
            } finally {
                set((s) => {
                    s.loading = false;
                });
            }
        },

        addFromCatalog: async (asset) => {
            const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
            const accessToken = getValueInStorage('accessToken');
            const userId = getValueInStorage('userId');
            const organizationId = getValueInStorage('organizationId');

            const body = {
                userId,
                organizationId,
                bucket: asset.bucket,
                path: asset.path,
                previewPath: asset.previewPath,
                contentType: asset.contentType,
                size: asset.size,
                sha256: asset.sha256,
                width: asset.width,
                height: asset.height,
                duration: asset.duration,
                originalName: asset.originalName,
            };

            const {data} = await axios.post(
                `${SERVER_URL}files/library/add`,
                body,
                {headers: {Authorization: `Bearer ${accessToken}`}}
            );


            const added = {
                id: data.fileId,
                fileId: data.fileId,
                name: data.name,
                type: data.contentType,
                size: data.size,
                duration: data.duration,
                previewUrl: data.previewUrl,
                orderIndex: 0,
                file: null,
            };


            useLibraryStore.getState().addLibraryItem(added);
        },
    }))
);
