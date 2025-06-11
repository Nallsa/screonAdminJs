


import axios from 'axios';

export async function uploadFile(
    url: string,
    file: File,
    onProgress: (percent: number) => void,
    onComplete: (fileId: string | null) => void
): Promise<void> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    try {
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            },
        });

        const fileId = response.data?.fileId ?? null;
        onComplete(fileId);
    } catch (error) {
        console.error('❌ Upload failed', error);
        onComplete(null);
    }
}
