/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import {Button} from 'react-bootstrap'

// Простая модалка с одной кнопкой
export function WarningModal({
                                 show,
                                 title,
                                 message,
                                 buttonText,
                                 onClose
                             }: {
    show: boolean
    title: string
    message: string
    buttonText: string
    onClose: () => void
}) {
    if (!show) return null
    return (
        <>
            <div className="modal-backdrop fade show"/>
            <div
                className="modal show d-block"
                tabIndex={-1}
                style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    position: 'fixed',
                    top: 0, left: 0,
                    width: '100vw', height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1050
                }}
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content text-center border-0 p-4">
                        <h5 className="modal-title mb-3">{title}</h5>
                        <p className="mb-4">{message}</p>
                        <Button variant="primary" onClick={onClose}>
                            {buttonText}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}