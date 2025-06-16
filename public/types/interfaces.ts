import type {UniqueIdentifier} from "@dnd-kit/core";

export interface PlaylistItem {
    id: string
    name: string
    organizationId: string
    createdBy: string
    previewUrl: string | null
    childFiles: FileItem[]
}


// {
//     "id": "938ca8a5-a531-43a5-949b-8cb7616a617a",
//     "name": "My Playlist TEST UPDATE",
//     "organizationId": "cb963d92-c9df-4107-ada1-4473a52d1a34",
//     "createdBy": "979ffbcb-3a74-40b6-8c87-837ccd244380",
//     "childFiles": [
//     {
//         "id": "dcd6a421-ba03-4497-87b5-86c45a96cc88",
//         "orderIndex": 0,
//         "name": "sadasdas",
//         "previewUrl": "2025/6/preview/preview_sadasdas.jpg",
//         "type": "video/quicktime",
//         "duration": 5.935967
//     },
//     {
//         "id": "604aa174-0072-4bc7-9b99-c966d9c74d5a",
//         "orderIndex": 1,
//         "name": "Hydrolic Press 5 M=.mp4",
//         "previewUrl": "",
//         "type": "video/mp4",
//         "duration": 303.2029
//     }
// ]
// }

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
    day: string
    start: string
    end: string
    playlist: string
}