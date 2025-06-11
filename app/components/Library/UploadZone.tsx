'use client'

import React, {useState, useCallback} from 'react'
import {useDropzone} from 'react-dropzone'
import {Modal, ProgressBar} from 'react-bootstrap'
import {useLibraryStore} from '@/app/store/libraryStore'
import {FileItem} from '@/public/types/interfaces'

export default function UploadZone() {
    const {uploadFile, uploadFileMetaData, addLibraryItem} = useLibraryStore()
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)

    const startUpload = useCallback((files: File[]) => {
        if (!files.length) return

        setShowUploadModal(true)
        setUploadProgress(0)

        const uploadNext = async (index: number) => {
            const file = files[index]

            await uploadFile(
                `${process.env.NEXT_PUBLIC_SERVER_URL}files/upload`,
                file,
                (percent) => {
                    const total = Math.round(((index + percent / 100) / files.length) * 100)
                    setUploadProgress(total)
                },
                async (fileId) => {
                    if (fileId) {
                        const newItem: FileItem = {
                            id: fileId,
                            file,
                            name: file.name,
                            type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                            size: file.size,
                            duration: 0,
                            url: URL.createObjectURL(file),
                        }
                        addLibraryItem(newItem)
                        await uploadFileMetaData(newItem)
                    }
                    if (index + 1 < files.length) {
                        await uploadNext(index + 1)
                    } else {
                        setShowUploadModal(false)
                        setUploadProgress(0)
                    }
                }
            )
        }

        uploadNext(0)
    }, [uploadFile, uploadFileMetaData, addLibraryItem])

    const onDrop = useCallback(
        (accepted: File[]) => startUpload(accepted),
        [startUpload]
    )
    const {getRootProps, getInputProps, open} = useDropzone({
        onDrop,
        multiple: true,
        noClick: true,
        accept: {'image/*': [], 'video/*': []},
    })

    return (
        <>
            <div
                {...getRootProps({
                    onClick: e => {
                        e.preventDefault()
                        open()
                    },
                })}
                className="upload-area border border-dashed p-4 mb-4 text-center text-muted bg-light rounded"
                style={{cursor: 'pointer'}}
            >
                <input {...getInputProps()} />
                <div>📤 Drop files here to upload, or click to select files</div>
                <small>Supports: jpg, png, gif, webp, mp4, mpeg, mov, avi</small>
            </div>

            <Modal show={showUploadModal} centered>
                <Modal.Header>
                    <Modal.Title>Uploading files…</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ProgressBar now={uploadProgress} label={`${uploadProgress}%`}/>
                </Modal.Body>
            </Modal>
        </>
    )
}
