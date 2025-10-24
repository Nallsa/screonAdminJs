import type {UniqueIdentifier} from "@dnd-kit/core";

export interface PlaylistItem {
    id: string
    name: string
    organizationId: string
    createdBy: string
    filePreviewId: string | null
    childFiles: FileItem[],
    totalDurationSeconds: number;
    branchId: string | undefined,
}

export type BackgroundInfo = {
    playlistId: string | null
    configured: boolean
}

export interface FileItem {
    id: string
    fileId: string
    file?: File | null
    name: string
    type: string
    size: number
    duration?: number | null
    width?: number | null
    height?: number | null
    sha256?: string
    createdAt?: string
    uploadedBy?: string
    organizationId?: string
    branchId?: string
    hasPreview: boolean
    previewUrl?: string
    downloadUrl?: string
    orderIndex: number
}

export interface CatalogAsset {
    id: string;
    fileId: string;
    previewPath: string;
    contentType: string;
    title: string,
    size: number;
    sha256: string;
    width?: number;
    height?: number;
    duration?: number;
    originalName: string;
    createdAt?: string;
    hasPreview: boolean;
    description: string;
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
    branchId: string;
}

export type LiveStatus = {
    status?: string;
    temperature?: number;
    cpuLoad?: number;
    ramUsage?: number;
    playerVersion?: string;
    lastSeenAt?: string;
    orientation?: 'vertical' | 'horizontal' | string;
    isRealTime?: boolean;
};

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
    branchId: string,
}

export type ZoneIndex = 0 | 1 | 2 | 3;
export type SplitCount = 1 | 2 | 4;

export type ZonePlaylistsByScreen = Record<
    string,
    Partial<Record<ZoneIndex, string | null>>
>;

export type SplitCountByScreen = Record<string, SplitCount>;



export interface MemberDto {
    id: string;
    username: string;
    email: string;
}

export interface BranchDto {
    id: string;
    name: string;
    logoUrl?: string | null;
    description?: string | null;
    members: MemberDto[];
}

export interface OrganizationDto {
    id: string;
    name: string;
    branches: BranchDto[];
    photoUrl?: string | null;
    role?: UserRole | null;
}

export enum UserRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
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
