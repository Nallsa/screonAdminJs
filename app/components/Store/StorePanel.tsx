/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

// app/components/Store/StorePanel.tsx
'use client';

import {useEffect, useMemo, useState} from 'react';
import {ListGroup, Form, Spinner, OverlayTrigger, Tooltip, Badge, Button} from 'react-bootstrap';
import {motion, AnimatePresence} from 'framer-motion';
import {useCatalogStore} from '@/app/store/catalogStore';
import {CatalogAsset} from "@/public/types/interfaces";
import AddFromStoreModal from "@/app/components/Store/AddFromStoreModal";
import PreviewImage from "@/app/components/Common/PreviewImage";


export default function StorePanel() {
    const {assets, loading, error, fetchAssets} = useCatalogStore();
    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<CatalogAsset | null>(null);
    const [modal, setModal] = useState(false);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return assets;
        return assets.filter(
            (a) =>
                a.originalName.toLowerCase().includes(qq) ||
                a.contentType.toLowerCase().includes(qq)
        );
    }, [assets, q]);

    return (
        <div style={{width: 520}} className="ps-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4>Магазин</h4>
                <Badge bg="light" text="dark">
                    {assets.length}
                </Badge>
            </div>

            <Form.Control
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск в магазине…"
                className="mb-3"
            />

            <div className="border rounded-3 p-3 bg-white">
                {loading && (
                    <div className="p-4 text-center text-muted">
                        <Spinner animation="border" size="sm" className="me-2"/>
                        Загружаем каталог…
                    </div>
                )}

                {!loading && error && (
                    <div className="p-3 small text-danger">{error}</div>
                )}

                {!loading && !error && (
                    <div
                        className="row g-3"
                        style={{maxHeight: 720, overflowY: 'auto'}}
                    >
                        <AnimatePresence initial={false}>
                            {filtered.map((a) => (
                                <motion.div
                                    key={a.id}
                                    className="col-12 col-md-6"
                                    initial={{opacity: 0, y: 12}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -12}}
                                >
                                    <div
                                        className="card shadow-sm border-0 overflow-hidden h-100"
                                        style={{borderRadius: 16, cursor: 'pointer'}}
                                        onClick={() => {
                                            setSelected(a);
                                            setModal(true);
                                        }}
                                    >
                                        <div className="position-relative">
                                            <PreviewImage
                                                fill
                                                aspectRatio={16 / 9}
                                                id={a.previewPath}
                                                name={a.originalName}
                                            />

                                            {/* Hover overlay */}
                                            <div
                                                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end"
                                                style={{
                                                    background:
                                                        'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.55) 100%)',
                                                    padding: 12,
                                                }}
                                            >
                                                <div className="text-white fw-semibold text-truncate">
                                                    {a.originalName}
                                                </div>

                                            </div>
                                        </div>

                                        {/* нижняя часть карточки */}
                                        <div className="card-body">
                                            <div className="d-flex small text-muted justify-content-between">
                                                <div className="text-truncate">
                                                    {a.width && a.height ? `${a.width}×${a.height}` : '—'}
                                                </div>
                                                <div>
                                                    {a.duration ? `${a.duration.toFixed(1)} с` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <AddFromStoreModal show={modal} onHide={() => setModal(false)} asset={selected}/>
        </div>
    );
}
