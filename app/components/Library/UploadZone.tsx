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

                    console.log("percent", percent)
                    const total = Math.round(((index + percent / 100) / files.length) * 100)
                    setUploadProgress(total)
                },
                async (fileId) => {
                    if (fileId) {

                        const isVideo = file.type.startsWith('video/')
                        const previewUrl = URL.createObjectURL(file)

                        let duration: number
                        if (isVideo) {
                            duration = await new Promise<number>((resolve) => {
                                const video = document.createElement('video')
                                video.preload = 'metadata'
                                video.src = previewUrl
                                video.onloadedmetadata = () => {
                                    resolve(Math.ceil(video.duration))
                                    URL.revokeObjectURL(previewUrl)
                                }
                            })
                        } else {
                            duration = 30
                        }

                        const newItem: FileItem = {
                            id: "",
                            fileId: fileId,
                            file,
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            duration,
                            previewUrl: URL.createObjectURL(file),
                            orderIndex: 0
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
    const {getRootProps, getInputProps, open, isDragActive} = useDropzone({
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
                className="upload-area p-4 mb-4 text-center text-muted rounded"
                style={{
                    cursor: 'pointer',
                    border: '2px dashed #ced4da',
                    borderColor: isDragActive ? '#0d6efd' : '#ced4da',
                    transition: 'border-color 150ms ease-in-out'


                }}
            >
                <input {...getInputProps()} />
                <div>📤 Перетащите файлы сюда для загрузки или нажмите, чтобы выбрать</div>
                <small>Поддерживаются форматы: jpg, png, gif, webp, mp4, mpeg, mov, avi</small>
            </div>

            <Modal show={showUploadModal} centered>
                <Modal.Header>
                    <Modal.Title>Загрузка файлов…</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{position: 'relative'}}>
                        <ProgressBar now={uploadProgress}/>
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none', // чтобы клики шли через этот слой на ProgressBar
                            }}
                        >
        <span style={{color: uploadProgress > 50 ? '#fff' : '#000'}}>
          {uploadProgress}%
        </span>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    )
}
