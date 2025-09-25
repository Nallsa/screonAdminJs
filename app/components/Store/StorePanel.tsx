/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client';

import {useEffect, useMemo, useState} from 'react';
import {ListGroup, Form, Spinner, OverlayTrigger, Tooltip, Badge, Button} from 'react-bootstrap';
import {motion, AnimatePresence} from 'framer-motion';
import {useCatalogStore} from '@/app/store/catalogStore';
import {CatalogAsset} from "@/public/types/interfaces";
import AddFromStoreModal from "@/app/components/Store/AddFromStoreModal";
import PreviewImage from "@/app/components/Common/PreviewImage";
import ErrorModal from "@/app/components/Common/ErrorModal";
import {WarningModal} from "@/app/components/Common/WarningModal";


export default function StorePanel() {
    const {assets, loading, error, setError, success, setSuccess, getAssets} = useCatalogStore();
    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<CatalogAsset | null>(null);
    const [modal, setModal] = useState(false);

    useEffect(() => {
        getAssets();
    }, [getAssets]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return assets;
        return assets.filter(
            (a) =>
                a.title.toLowerCase().includes(qq) ||
                a.contentType.toLowerCase().includes(qq)
        );
    }, [assets, q]);

    return (
        <div className="ps-0">
            {/*<div className="d-flex align-items-center justify-content-between mb-3">*/}
            {/*    <h4 className="mb-0">Магазин</h4>*/}
            {/*    <Badge bg="light" text="dark">{assets.length}</Badge>*/}
            {/*</div>*/}

            <Form.Control
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск в магазине…"
                className="mb-3"
            />

            <div className=" rounded-3 pt-3 bg-white">
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
                        className="d-flex flex-wrap gap-3 pb-4 pt-2"
                        style={{maxHeight: 720, overflowY: 'auto'}}
                    >
                        <AnimatePresence initial={false}>
                            {filtered.map(a => (
                                <motion.div
                                    key={a.id}
                                    initial={{opacity: 0, y: 12}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -12}}
                                >
                                    <div
                                        className="card border-0 overflow-hidden hover-lift"
                                        style={{width: 300, borderRadius: 16, cursor: 'pointer'}}
                                        onClick={() => {
                                            setSelected(a);
                                            setModal(true)
                                        }}
                                    >
                                        <div className="position-relative">
                                            <PreviewImage
                                                fill
                                                aspectRatio={16 / 9}
                                                id={a.fileId}
                                                name={a.title}
                                            />
                                            <div
                                                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end"
                                                style={{
                                                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.55) 100%)',
                                                    padding: 12,
                                                }}
                                            >
                                                <div className="text-white fw-semibold text-truncate">
                                                    {a.title}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-body">
                                            <div className="d-flex small text-muted justify-content-between">
                                                <div className="text-truncate">
                                                    {a.width && a.height ? `${a.width}×${a.height}` : '—'}
                                                </div>
                                                <div>{a.duration ? `${a.duration.toFixed(1)} с` : ''}</div>
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
            <ErrorModal show={!!error} message={error || ''} onClose={() => setError(null)}/>
            <WarningModal show={!!success} title="Готово" message={success || ''} buttonText="Ок"
                          onClose={() => setSuccess(null)}/>

            <style jsx>{`
                .hover-lift {
                    box-shadow: 0 2px 6px rgba(0, 0, 0, .06);
                    transition: transform .18s ease, box-shadow .18s ease;
                    will-change: transform, box-shadow;
                }

                .hover-lift:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0, 0, 0, .12);
                }
            `}</style>
        </div>


    )


}