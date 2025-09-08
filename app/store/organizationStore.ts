import {create} from 'zustand';
import axios from 'axios';
import {SERVER_URL} from '@/app/API/api';
import {BranchDto, OrganizationDto, RoleType} from '@/public/types/interfaces';
import {addValueInStorage, getValueInStorage} from '@/app/API/localStorage';
import {useAuthStore} from '@/app/store/authStore';

const baseUrl = SERVER_URL // Or whatever the actual base is
const api = {
    get: async (url: string, isNotNeedToken = false) => {
        const headers: HeadersInit = {'Content-Type': 'application/json'};
        if (!isNotNeedToken) {
            const token = getValueInStorage('accessToken'); // Assuming token storage
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${baseUrl}${url}`, {method: 'GET', headers});
        if (!response.ok) return null;
        return await response.text();
    },
    post: async (url: string, data: string, isNotNeedToken = false) => {
        const headers: HeadersInit = {'Content-Type': 'application/json'};
        if (!isNotNeedToken) {
            const token = getValueInStorage('accessToken'); // Assuming token storage
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${baseUrl}${url}`, {method: 'POST', headers, body: data});
        if (!response.ok) return null;
        return await response.text();
    },
};

interface OrganizationState {
    organizationInfo: OrganizationDto | null;
    inviteCode: string | null;
    isGenerating: boolean;
    isCheckingOrg: boolean;
    hasOrg: boolean;
    errorMessage: string | null;
    successMessage: string | null;
    orgBranches: BranchDto[] | null;
    activeBranches: BranchDto[];
    role: RoleType | null;

    setHasOrg: (value: boolean) => void;
    clearInviteCode: () => void;
    setError: (msg: string | null) => void;
    setSuccess: (msg: string | null) => void;
    createOrganization: (name: string, onResult: (id: string | null, error: string | null) => void) => void;
    addAdmin: (branchId: string) => Promise<string | null>;
    createBranch: (branchName: string, description: string | null, onResult: (id: string | null, error: string | null) => void) => void;
    generateInviteCode: (branchId: string) => void;
    getInfoOrg: () => Promise<boolean>;
    joinOrganizationByCode: (referralCode: string) => Promise<boolean>;
    toggleActiveBranch: (branch: BranchDto) => void;
    leaveFromBranch: () => void;
    removeBranch: (branchId: string) => Promise<boolean>; // New
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
    organizationInfo: null,
    inviteCode: null,
    isGenerating: false,
    isCheckingOrg: false,
    hasOrg: false,
    errorMessage: null,
    successMessage: null,
    orgBranches: null,
    activeBranches: [],
    role: null,

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
            set({hasOrg: true, organizationInfo: json});

            const store = useAuthStore.getState();
            await store.checkToken();

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
                description,
            });

            const responseText = await api.post('organizations/branches', body, false);

            if (!responseText) {
                const err = 'Ошибка создания филиала.';
                get().setError(err);
                onResult(null, err);
                return;
            }

            const createdOrg: OrganizationDto = JSON.parse(responseText);

            await get().getInfoOrg();
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
            const responseText = await api.post(url, '');

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
        set({isCheckingOrg: true});
        const result = await api.get('organizations/organization');

        if (result) {
            try {
                const orgInfo: OrganizationDto = JSON.parse(result);

                addValueInStorage('organizationId', orgInfo.id);

                let newActiveBranches: BranchDto[] = get().activeBranches;

                if (newActiveBranches.length === 0) {
                    newActiveBranches = orgInfo.branches ? [orgInfo.branches[0]] : [];
                }

                set({
                    organizationInfo: orgInfo,
                    hasOrg: true,
                    activeBranches: newActiveBranches,
                    role: orgInfo.role,
                });

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

    joinOrganizationByCode: async (referralCode: string): Promise<boolean> => {
        const accessToken = getValueInStorage('accessToken');
        const userId = getValueInStorage('userId');

        if (!userId || !accessToken) {
            set({errorMessage: 'Нет userId или accessToken.'});
            return false;
        }

        set({errorMessage: null, successMessage: null});

        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL!;
            const res = await axios.post(
                `${SERVER}organizations/join`,
                {referralCode, userId},
                {headers: {Authorization: `Bearer ${accessToken}`}}
            );

            if (res.status === 200) {
                localStorage.setItem('organizationId', res.data.id);
                set({successMessage: 'Успешно вступили в организацию.'});
                return true;
            } else {
                set({errorMessage: 'Неожиданный ответ от сервера при вступлении в организацию.'});
                return false;
            }
        } catch (e: any) {
            const msg = e.response?.data?.message ?? e.message ?? 'Ошибка при вступлении.';
            set({errorMessage: msg});
            return false;
        }
    },

    toggleActiveBranch: (branch) =>
        set((state) => {
            const isActive = state.activeBranches.some((b) => b.id === branch.id);

            if (state.activeBranches.length === 1 && isActive) {
                return {activeBranches: state.activeBranches};
            }

            return {
                activeBranches: isActive
                    ? state.activeBranches.filter((b) => b.id !== branch.id)
                    : [...state.activeBranches, branch],
            };
        }),

    leaveFromBranch: () => {
        set({inviteCode: null});
    },

    removeBranch: async (branchId: string): Promise<boolean> => {
        const accessToken = getValueInStorage('accessToken');
        const userId = getValueInStorage('userId');

        if (!userId || !accessToken || !branchId) {
            set({errorMessage: 'Не хватает данных: userId, accessToken, branchId, adminId или ownerId.'});
            return false;
        }

        if (get().role !== 'OWNER') {
            set({errorMessage: 'Только владелец может удалить филиал.'});
            return false;
        }

        set({errorMessage: null, successMessage: null});

        try {
            const SERVER = process.env.NEXT_PUBLIC_SERVER_URL!;
            const res = await axios.delete(
                `${SERVER}organizations/${branchId}/owner/${userId}`,
                {headers: {Authorization: `Bearer ${accessToken}`}}
            );

            if (res.status === 204) {
                // Обновляем orgBranches и activeBranches, удаляя филиал
                set((state) => ({
                    orgBranches: state.orgBranches ? state.orgBranches.filter((b) => b.id !== branchId) : null,
                    activeBranches: state.activeBranches.filter((b) => b.id !== branchId),
                    successMessage: 'Филиал успешно удален.',
                }));
                // Обновляем информацию об организации
                await get().getInfoOrg();
                return true;
            } else {
                set({errorMessage: 'Неожиданный ответ от сервера при удалении филиала.'});
                return false;
            }
        } catch (e: any) {
            const msg = e.response?.data?.message ?? e.message ?? 'Ошибка при удалении филиала.';
            set({errorMessage: msg});
            return false;
        }
    },
}));