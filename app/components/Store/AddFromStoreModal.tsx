/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

// app/components/Store/AssetModal.tsx
'use client';

import Image from 'next/image';
import {Modal, Button, Badge} from 'react-bootstrap';
import React, {useState} from 'react';
import {motion} from 'framer-motion';
import {useCatalogStore} from '@/app/store/catalogStore';
import {CatalogAsset} from "@/public/types/interfaces";
import PreviewImage from "@/app/components/Common/PreviewImage";

type Props = {
    show: boolean;
    onHide: () => void;
    asset: CatalogAsset | null;
};

export default function AddFromStoreModal({show, onHide, asset}: Props) {
    const [submitting, setSubmitting] = useState(false);
    const addFromCatalog = useCatalogStore((s) => s.addFromCatalog);

    if (!asset) return null;

    const isVideo = asset.contentType?.startsWith('video');

    const handleAdd = async () => {
        try {
            setSubmitting(true);
            await addFromCatalog(asset);
            onHide();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title className="d-flex gap-2 align-items-center">
                    {asset.title}
                    <Badge bg="secondary" className="text-uppercase">
                        {asset.contentType.split('/')[0]}
                    </Badge>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row g-4">
                    <div className="col-12 col-md-6">
                        <motion.div
                            initial={{opacity: 0, y: 8}}
                            animate={{opacity: 1, y: 0}}
                            className="ratio ratio-9x16 rounded-3 overflow-hidden bg-light border"
                        >
                            {/* превью: если видео — картинка-превью; если картинка — просто её */}
                            {asset.fileId ? (
                                // через обычный <img>, т.к. это presigned URL
                                <PreviewImage
                                    id={asset.fileId}
                                    name={asset.title}
                                    fill
                                    aspectRatio={16 / 9}
                                />
                            ) : isVideo ? (
                                <div className="d-flex align-items-center justify-content-center text-muted">
                                    Нет превью
                                </div>
                            ) : (
                                <PreviewImage
                                    id={asset.fileId}
                                    name={asset.title}
                                    fill
                                    aspectRatio={16 / 9}
                                />
                            )}
                        </motion.div>
                    </div>

                    <div className="col-12 col-md-6">
                        <div className="d-flex flex-column gap-2">
                            <div className="fw-semibold">Информация</div>
                            <div className="small text-muted">
                                Тип: {asset.contentType} <br/>
                                Размер: {(asset.size / (1024 * 1024)).toFixed(2)} МБ <br/>
                                {asset.width && asset.height && (
                                    <>
                                        Разрешение: {asset.width}×{asset.height} <br/>
                                    </>
                                )}
                                {asset.duration && <>Длительность: {asset.duration.toFixed(2)} c</>}
                            </div>

                            <div className="mt-3">
                                <div className="fw-semibold">Описание</div>
                                <div className="text-muted small">
                                    {asset.title} — {asset.description}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className="d-flex ">
                <div className="d-flex gap-2 justify-content-end">
                    <Button className="ms-auto" onClick={handleAdd} disabled={submitting}>
                        {submitting ? 'Добавляем…' : 'Добавить в библиотеку'}
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
}
