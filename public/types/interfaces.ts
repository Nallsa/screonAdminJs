export interface PlaylistItem {
    id: number;
    title: string;
    image: string;
    type: string;
    duration: number;
}

export interface LibraryItem {
    id: number;
    title: string;
    image: string;
}


export interface MediaItem {
    id: string
    fileId: string
    title: string
    type: string
    duration: number
    previewUrl: string
    videoUrl: string
    isVisible: boolean
    orderIndex?: number
}

export interface PlaylistData {
    id: string
    name: string
    organizationId: string
    createdBy: string
    previewUrl: string
    duration: number
    active: boolean
    items?: MediaItem[]
}
