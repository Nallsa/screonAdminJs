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