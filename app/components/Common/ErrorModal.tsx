/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React from 'react'
import {Button} from 'react-bootstrap'

interface ErrorModalProps {
    show: boolean
    message: string
    onClose: () => void
}

export default function ErrorModal({show, message, onClose}: ErrorModalProps) {
    if (!show) return null

    return (
        <>
            <div className="modal-backdrop fade show"></div>
            <div
                className="modal show d-block"
                tabIndex={-1}
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1050,
                }}
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content text-center border-0 p-4 rounded shadow">
                        <div className="position-relative">
                            <h5 className="modal-title mb-3 text-danger fw-semibold">Ошибка</h5>
                            <button
                                type="button"
                                className="btn-close position-absolute"
                                style={{top: '0', right: '0'}}
                                onClick={onClose}
                                aria-label="Закрыть"
                            />
                        </div>
                        <p className="mb-4 text-muted">{message}</p>
                        <div className="d-flex justify-content-center">
                            <Button variant="danger" onClick={onClose}>
                                Закрыть
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
