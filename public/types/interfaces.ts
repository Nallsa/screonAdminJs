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