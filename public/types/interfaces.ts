import type {UniqueIdentifier} from "@dnd-kit/core";

export interface PlaylistItem {
    id: string
    name: string
    duration: number // в секундах
    isActive: boolean
    thumbnail?: string
    childFiles: FileItem[]
}

export interface FileItem {
    id: string;
    file: File;
    name: string;
    type: 'VIDEO' | 'IMAGE';
    size: number;
    duration: number;
    url: string;
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
    day: string
    start: string
    end: string
    playlist: string
}