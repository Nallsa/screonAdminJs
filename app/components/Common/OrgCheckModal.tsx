'use client'

import React, {useEffect, useState} from "react";
import {usePathname, useRouter} from "next/navigation";

export default function OrgCheckModal() {
    const [show, setShow] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const organizationId = localStorage.getItem("organizationId");
        if (!organizationId?.trim() && pathname !== "/createOrg") {
            setShow(true);
        }
    }, [pathname]);

    if (!show) return null;

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
                    zIndex: 1050
                }}
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content text-center border-0 p-4">
                        <h5 className="modal-title mb-3">Создание организации</h5>
                        <p className="mb-4">Для начала создадим организацию</p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                setShow(false);
                                router.push('/createOrg');
                            }}
                        >
                            Приступим!
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
