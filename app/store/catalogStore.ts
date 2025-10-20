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
import {useOrganizationStore} from "@/app/store/organizationStore";

interface CatalogState {
    assets: CatalogAsset[];

    getAssets: () => Promise<void>;
    addFromCatalog: (asset: CatalogAsset) => Promise<void>;

    loading: boolean;

    error: string | null;
    success: string | null;
    setError: (msg: string | null) => void;
    setSuccess: (msg: string | null) => void;
}

export const useCatalogStore = create<CatalogState>()(
    immer((set, get) => ({
        assets: [],
        loading: false,
        success: null,
        error: null,
        setError: (msg) => set(s => {
            s.error = msg;
        }),
        setSuccess: (msg) => set(s => {
            s.success = msg;
        }),

        getAssets: async () => {
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
            try {
                const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
                const accessToken = getValueInStorage('accessToken');
                const userId = getValueInStorage('userId');
                const organizationId = getValueInStorage('organizationId');

                const {activeBranches} = useOrganizationStore.getState?.();


                // if (!accessToken || !userId || !organizationId) {
                //     throw new Error('Не хватает данных: accessToken / userId / organizationId');
                // }
                // if (!activeBranches) {
                //     throw new Error('Не выбран активный филиал');
                // }

                const {data} = await axios.post(
                    `${SERVER_URL}library/items/from-catalog`,
                    {
                        assetId: asset.id,
                        userId,
                        organizationId,
                        branchIds: activeBranches.map(b => b.id),
                    },
                    {headers: {Authorization: `Bearer ${accessToken}`}}
                );

                await useLibraryStore.getState().getFilesInLibrary();
                set(s => {
                    s.error = null;
                    s.success = 'Добавлено из магазина в библиотеку';
                });
            } catch (e: any) {
                set(s => {
                    s.error = e?.response?.data?.message || e.message || 'Не удалось добавить в библиотеку';
                });

            }
        },
    }))
);
