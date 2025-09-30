/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

import {create} from 'zustand';
import {SERVER_URL} from "@/app/API/api";
import {BranchDto, OrganizationDto, UserRole} from "@/public/types/interfaces";
import {addValueInStorage, getValueInStorage} from "@/app/API/localStorage";
import {useAuthStore} from "@/app/store/authStore";
import axios from "axios";

const baseUrl = SERVER_URL // Or whatever the actual base is
type ApiOk = string; // если сервер отдаёт JSON — можно сменить на unknown/any и парсить

const api = {
    get: async (url: string, isNotNeedToken = false): Promise<ApiOk | null> => {
        const headers: HeadersInit = {'Content-Type': 'application/json'};
        if (!isNotNeedToken) {
            const token = getValueInStorage('accessToken');
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(`${baseUrl}${url}`, {method: 'GET', headers});
            if (!response.ok) return null;
            // если сервер может вернуть пустой ответ
            if (response.status === 204) return '';
            return await response.text();
        } catch {
            return null;
        }
    },

    post: async (url: string, data: string, isNotNeedToken = false): Promise<ApiOk | null> => {
        const headers: HeadersInit = {'Content-Type': 'application/json'};
        if (!isNotNeedToken) {
            const token = getValueInStorage('accessToken');
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(`${baseUrl}${url}`, {method: 'POST', headers, body: data});
            if (!response.ok) return null;
            if (response.status === 204) return '';
            return await response.text();
        } catch {
            return null;
        }
    },

    // 👇 добавлен метод удаления
    del: async (url: string, isNotNeedToken = false): Promise<ApiOk | null> => {
        const headers: HeadersInit = {'Content-Type': 'application/json'};
        if (!isNotNeedToken) {
            const token = getValueInStorage('accessToken');
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(`${baseUrl}${url}`, {method: 'DELETE', headers});
            if (!response.ok) return null;
            if (response.status === 204) return ''; // no content — считаем успехом
            return await response.text();
        } catch {
            return null;
        }
    },
};


interface OrganizationState {
    organizationInfo: OrganizationDto | null;
    role: UserRole | null;
    inviteCode: string | null;
    isGenerating: boolean;
    isCheckingOrg: boolean;
    hasOrg: boolean;
    errorMessage: string | null;
    successMessage: string | null;
    orgBranches: BranchDto[] | null;
    activeBranches: BranchDto[]; // New: array of active branches
    selectBranch: BranchDto | null; // New: array of active branches

    setHasOrg: (value: boolean) => void;
    clearInviteCode: () => void;
    setError: (msg: string | null) => void;
    setSuccess: (msg: string | null) => void;
    createOrganization: (name: string, onResult: (id: string | null, error: string | null) => void) => void;
    addAdmin: (branchId: string) => Promise<string | null>;
    createBranch: (branchName: string, description: string | null, onResult: (id: string | null, error: string | null) => void) => void;
    generateInviteCode: (branchId: string) => void;
    setSelectBranch: (value: BranchDto) => void;


    joinOrganizationByCode: (referralCode: string) => Promise<boolean>
    toggleActiveBranch: (branch: BranchDto) => void; // New: toggle active branch


    getInfoOrg: () => Promise<boolean>;
    delOrganization: (id: string) => Promise<boolean>;

}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
    organizationInfo: null,
    role: null,
    inviteCode: null,
    isGenerating: false,
    isCheckingOrg: false,
    hasOrg: false,
    errorMessage: null,
    successMessage: null,
    orgBranches: null,
    activeBranches: [], // New: initial empty array
    selectBranch: null, // New: initial empty array

    setHasOrg: (value) => set({hasOrg: value}),

    clearInviteCode: () => set({inviteCode: null}),

    setError: (msg) => set({errorMessage: msg}),

    setSuccess: (msg) => {
        set({successMessage: msg});
        if (msg && msg.trim() !== '') {
            setTimeout(() => set({successMessage: null}), 2000);
        }
    },

    createOrganization: async (name, onResult) => {
        const trimmed = name.trim();
        if (trimmed === '') {
            const err = 'Название организации не может быть пустым.';
            get().setError(err);
            onResult(null, err);
            return;
        }

        const userId = getValueInStorage('userId');
        if (!userId) {
            const err = 'Нет userId или accessToken.';
            get().setError(err);
            onResult(null, err);
            return;
        }

        get().setError(null);
        get().setSuccess(null);

        try {
            const body = JSON.stringify({
                name: trimmed,
                creatorUserId: userId,
            });

            const responseText = await api.post('organizations', body, false);

            if (!responseText) {
                const err = 'Ошибка создания организации.';
                get().setError(err);
                onResult(null, err);
                return;
            }

            const json: OrganizationDto = JSON.parse(responseText);

            addValueInStorage('organizationId', json.id);
            set({hasOrg: true, organizationInfo: json}); // Update state directly


            const store = useAuthStore.getState(); // Access active branches from the other store

            await store.checkToken()

            get().setSuccess('Организация создана.');

            onResult(json.id, null);
        } catch (e: any) {
            const err = e.message || 'Ошибка при создании организации.';
            get().setError(err);
            onResult(null, err);
        }
    },

    addAdmin: async (branchId) => {
        const userId = getValueInStorage('userId');
        const organizationId = getValueInStorage('organizationId');

        const url = `organizations/${organizationId}/invite-code?userId=${userId}&branchId=${branchId}`;

        try {
            const response = await api.get(url);

            if (response) {
                console.log('Invite code:', response);
                return response;
            } else {
                console.log('Failed to create invite code: No response or invalid response');
                return null;
            }
        } catch (e) {
            console.log('Error creating invite code:', e);
            return null;
        }
    },

    createBranch: async (branchName, description, onResult) => {
        const trimmed = branchName.trim();
        if (trimmed === '') {
            const err = 'Название филиала не может быть пустым.';
            get().setError(err);
            onResult(null, err);
            return;
        }

        get().setError(null);
        get().setSuccess(null);

        try {
            const body = JSON.stringify({
                name: trimmed,
                // description, // Uncomment if needed
            });

            const responseText = await api.post('organizations/branches', body, false);

            if (!responseText) {
                const err = 'Ошибка создания филиала.';
                get().setError(err);
                onResult(null, err);
                return;
            }

            const createdOrg: OrganizationDto = JSON.parse(responseText); // Assuming response is OrganizationDto

            await get().getInfoOrg(); // Refresh org info

            get().setSuccess('Филиал создан.');
            onResult(createdOrg.id, null);
        } catch (e: any) {
            const err = e.message || 'Ошибка при создании филиала.';
            get().setError(err);
            onResult(null, err);
        }
    },

    generateInviteCode: async (branchId: string) => {
        const {organizationInfo} = get();
        const userId = getValueInStorage('userId');

        if (!organizationInfo?.id || !userId) {
            get().setError('Не хватает данных: organizationId, userId или accessToken.');
            return;
        }

        set({isGenerating: true});
        get().setError(null);
        get().setSuccess(null);

        try {
            const url = `organizations/${organizationInfo.id}/invite-code?userId=${userId}&branchId=${branchId}`;

            const responseText = await api.post(url, '',); // data is empty string

            if (responseText && responseText.trim() !== '') {
                let code: string | null = null;
                const trimmed = responseText.trim();

                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                    code = JSON.parse(trimmed);
                } else if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
                    code = trimmed;
                } else {
                    const json = JSON.parse(trimmed);
                    code = json.code || null;
                }

                if (code) {
                    set({inviteCode: code});
                    get().setSuccess('Код успешно сгенерирован.');
                } else {
                    get().setError('Не удалось получить код из ответа.');
                }
            } else {
                get().setError('Неожиданный ответ от сервера при генерации кода.');
            }
        } catch (e: any) {
            get().setError(e.message || 'Ошибка при генерации invite code.');
        } finally {
            set({isGenerating: false});
        }
    },

    getInfoOrg: async () => {
        set({isCheckingOrg: true}); // Added for parity, though not in original
        const result = await api.get('organizations/organization');

        if (result) {
            try {
                const orgInfo: OrganizationDto = JSON.parse(result);

                addValueInStorage('organizationId', orgInfo.id);

                let newActiveBranches: BranchDto[] = get().activeBranches

                if (newActiveBranches.length == 0) {
                    newActiveBranches = [orgInfo.branches[0]]
                }

                set({organizationInfo: orgInfo, hasOrg: true, activeBranches: newActiveBranches, role: orgInfo.role});

                return true;
            } catch (e) {
                console.log('Ошибка парсинга:', e);
                return false;
            }
        } else {
            console.log('Не удалось получить данные организации');
            return false;
        }
    },


    delOrganization: async (id: string) => {
        // аккуратная подстановка параметров
        const url = `organizations/branches/${id}/owner/${getValueInStorage("userId")}`;

        const result = await api.del(url);

        if (result) {

            set((state) => {
                state.getInfoOrg()
                return state;
            })
        }

        return result !== null;
    },


    joinOrganizationByCode: async (referralCode: string): Promise<boolean> => {

        const accessToken = getValueInStorage("accessToken")
        const userId = getValueInStorage("userId")

        if (!userId || !accessToken) {
            set({errorMessage: 'Нет userId или accessToken.'})
            return false
        }

        set({errorMessage: null, successMessage: null})

        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL!
            const res = await axios.post(
                `${SERVER}organizations/join`,
                {referralCode, userId},
                {headers: {Authorization: `Bearer ${accessToken}`}}
            )

            if (res.status === 200) {
                localStorage.setItem('organizationId', res.data.id)
                // set({
                //     organizationId: res.data.id,
                //     hasOrg: true,
                //     successMessage: 'Успешно вступили в организацию.',
                // })
                return true
            } else {
                set({errorMessage: 'Неожиданный ответ от сервера при вступлении в организацию.'})
                return false
            }
        } catch (e: any) {
            const msg = e.response?.data?.message ?? e.message ?? 'Ошибка при вступлении.'
            set({errorMessage: msg})
            return false
        }
    },
    setSelectBranch: (branch: BranchDto) => {
        set({selectBranch: branch});
    },
    toggleActiveBranch: (branch) =>
        set((state) => {
            const isActive = state.activeBranches.some((b) => b.id === branch.id);
            return {
                activeBranches: isActive
                    ? state.activeBranches.filter((b) => b.id !== branch.id)
                    : [...state.activeBranches, branch],
            };
        }),
}));
// Optional: Call getInfoOrg on init if needed, but typically call from component
// useOrganizationStore.getState().getInfoOrg();