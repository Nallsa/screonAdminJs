import type {UniqueIdentifier} from "@dnd-kit/core";

export interface PlaylistItem {
    id: string
    name: string
    organizationId: string
    createdBy: string
    previewUrl: string | null
    childFiles: FileItem[]
}


export interface FileItem {
    id: string;
    file?: File | null;
    name: string;
    type: 'VIDEO' | 'IMAGE';
    size: number;
    duration: number;
    previewUrl: string;
    orderIndex: number
}


export interface ScreenData {
    id: string
    name: string
    online: boolean
    groupIds: string[]
}

export interface GroupData {
    id: string
    name: string
}

export interface ScheduledBlock {
    dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
    startDate: string | null
    endDate: string | null
    startTime: string
    endTime: string
    playlistId: string
}