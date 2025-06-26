'use client'

import React from 'react'
import {Button} from 'react-bootstrap'

interface ConfirmModalProps {
    show: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmModal({
                                         show,
                                         title = 'Подтвердите действие',
                                         message = 'Вы уверены, что хотите продолжить?',
                                         confirmText = 'Да',
                                         cancelText = 'Отмена',
                                         onConfirm,
                                         onCancel,
                                     }: ConfirmModalProps) {
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
                    <div className="modal-content text-center border-0 p-4">
                        <h5 className="modal-title mb-3">{title}</h5>
                        <p className="mb-4">{message}</p>
                        <div className="d-flex justify-content-center gap-3">
                            <Button variant="secondary" onClick={onCancel}>
                                {cancelText}
                            </Button>
                            <Button variant="danger" onClick={onConfirm}>
                                {confirmText}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
