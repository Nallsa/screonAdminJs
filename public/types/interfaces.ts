import type {UniqueIdentifier} from "@dnd-kit/core";

export interface PlaylistItem {
    id: string
    name: string
    organizationId: string
    createdBy: string
    filePreviewId: string | null
    childFiles: FileItem[],
    totalDurationSeconds: number;
}


export interface FileItem {
    id: string;
    fileId: string;
    file?: File | null;
    name: string;
    type: string;
    size: number;
    duration: number;
    previewUrl: string;
    orderIndex: number
}

export interface CatalogAsset {
    id: string;
    bucket: string;
    path: string;
    previewPath: string;
    contentType: string;
    size: number;
    sha256: string;
    width?: number;
    height?: number;
    duration?: number;
    originalName: string;
    createdAt?: string;
    isMain?: boolean;
}

export interface AddToLibraryReq {
    userId: string;
    organizationId: string;
    bucket: string;
    path: string;
    previewPath?: string;
    contentType: string;
    size: number;
    sha256: string;
    width?: number;
    height?: number;
    duration?: number;
    originalName: string;
}

export enum DeviceStatus {
    'ONLINE',
    'OFFLINE',
    'ERROR'
}

export interface ScreenData {
    id: string
    name: string
    groupId: string | null
    serialNumber: string;
    model: string;
    os: string;
    status: DeviceStatus;
    locationId: string;
}

export interface GroupData {
    id: string
    name: string
}

export type TypeMode = 'PLAYLIST' | 'ADVERTISEMENT' | 'EMERGENCY';


export interface ScheduledBlock {
    dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
    startDate: string | null
    endDate: string | null
    startTime: string
    endTime: string
    playlistId: string,
    priority: number,
    type: TypeMode,
    isRecurring: boolean,
    screenId: string,
}


export interface OrganizationDto {
    id: string;
    name: string;
    branches: BranchDto[];
    photoUrl?: string | null;
    role?: string | null;
}

export interface BranchDto {
    id: string;
    name: string;
    logoUrl?: string | null;
    description?: string | null;
}

export type UpdateInfoDto = {
    id: string
    latestVersionCode: number
    minSupportedVersionCode: number
    versionName: string
    apkUrl: string
    sizeBytes: number
    sha256: string
    releaseNotes?: string | null
    force?: boolean
}
