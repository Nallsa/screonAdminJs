/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'; // Ensure this import
import {useOrganizationStore} from "@/app/store/organizationStore";
import {useState} from "react";

export default function CreateOrgElementsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialIsBranch = searchParams.get('isBranch') === 'true';

    const { createOrganization, createBranch, joinOrganizationByCode, setError, setSuccess } = useOrganizationStore(); // Добавил joinBranch; если его нет в store, реализуйте

    const [mode, setMode] = useState<'create-org' | 'create-branch' | 'join-branch'>(initialIsBranch ? 'create-branch' : 'create-org');
    const [name, setName] = useState(''); // for organization
    const [branchName, setBranchName] = useState(''); // for branch
    const [branchDescription, setBranchDescription] = useState(''); // for branch
    const [branchCode, setBranchCode] = useState(''); // for join branch
    const [localError, setLocalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const title = mode === 'create-branch' ? 'Создание филиала' : mode === 'join-branch' ? 'Подключение к филиалу' : 'Создание организации';
    const subtitle = mode === 'create-branch'
        ? 'Укажите название и описание филиала.'
        : mode === 'join-branch'
            ? 'Введите код филиала для подключения.'
            : 'Укажите название — позже добавим детали и участников.';

    const handleSubmit = async () => {
        // Local validation
        if ((mode === 'create-org' && !name.trim()) ||
            (mode === 'create-branch' && !branchName.trim()) ||
            (mode === 'join-branch' && !branchCode.trim())) {
            setLocalError('Проверьте обязательные поля');
            return;
        }

        setLocalError(null);
        setIsSubmitting(true);

        if (mode === 'create-org') {
            // Create organization
            createOrganization(name, (id, err) => {
                setIsSubmitting(false);
                if (err) {
                    setLocalError(err);
                    setError(err);
                } else if (id) {
                    setSuccess(`Организация «${name}» создана`);
                    setTimeout(() => {
                        router.push('/organization');
                    }, 1000);
                } else {
                    const msg = 'Неизвестная ошибка при создании организации';
                    setLocalError(msg);
                    setError(msg);
                }
            });
        } else if (mode === 'create-branch') {
            // Create branch
            createBranch(branchName, branchDescription.trim() || null, (id, err) => {
                setIsSubmitting(false);
                if (err) {
                    setLocalError(err);
                    setError(err);
                } else if (id) {
                    setSuccess(`Филиал «${branchName}» создан`);
                    router.push('/organization');
                } else {
                    const msg = 'Неизвестная ошибка при создании филиала';
                    setLocalError(msg);
                    setError(msg);
                }
            });
        } else if (mode === 'join-branch') {
            try {
                const success = await joinOrganizationByCode(branchCode);
                setIsSubmitting(false);
                if (success) {
                    setSuccess(`Успешно подключены к филиалу по коду «${branchCode}»`);
                    // Редирект выполняется в useEffect, когда successMessage обновится
                }
            } catch (e: any) {
                setIsSubmitting(false);
                const msg = e.message ?? 'Ошибка при подключении к филиалу';
                setLocalError(msg);
                setError(msg);
            }
        }
    };

    const handleReset = () => {
        setName('');
        setBranchName('');
        setBranchDescription('');
        setBranchCode('');
        setLocalError(null);
    };

    const handleSwitchToJoin = () => {
        setMode('join-branch');
        setLocalError(null);
        handleReset();
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="card w-100 shadow" style={{ maxWidth: '400px', backgroundColor: '#F5F5F5', borderRadius: '20px' }}>
                <div className="card-body p-4">
                    <h5 className="text-center fw-semibold mb-2">{title}</h5>
                    <p className="text-center text-muted mb-4">{subtitle}</p>

                    {mode === 'create-org' ? (
                        <div className="mb-3">
                            <label htmlFor="orgName" className="form-label">Название организации</label>
                            <input
                                type="text"
                                className={`form-control ${localError && !name.trim() ? 'is-invalid' : ''}`}
                                id="orgName"
                                placeholder="Например, Aurora Studio"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (localError) setLocalError(null);
                                }}
                            />
                            {localError && !name.trim() && <div className="invalid-feedback">Введите название организации</div>}
                        </div>
                    ) : mode === 'create-branch' ? (
                        <>
                            <div className="mb-3">
                                <label htmlFor="branchName" className="form-label">Название филиала</label>
                                <input
                                    type="text"
                                    className={`form-control ${localError && !branchName.trim() ? 'is-invalid' : ''}`}
                                    id="branchName"
                                    placeholder="Например, Aurora Studio — СПб"
                                    value={branchName}
                                    onChange={(e) => {
                                        setBranchName(e.target.value);
                                        if (localError) setLocalError(null);
                                    }}
                                />
                                {localError && !branchName.trim() && <div className="invalid-feedback">Введите название филиала</div>}
                            </div>
                            <div className="mb-3">
                                <label htmlFor="branchDescription" className="form-label">Описание</label>
                                <textarea
                                    className="form-control"
                                    id="branchDescription"
                                    placeholder="Кратко: адрес, зона обслуживания, особенности..."
                                    rows={3}
                                    value={branchDescription}
                                    onChange={(e) => setBranchDescription(e.target.value)}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="mb-3">
                            <label htmlFor="branchCode" className="form-label">Код филиала</label>
                            <input
                                type="text"
                                className={`form-control ${localError && !branchCode.trim() ? 'is-invalid' : ''}`}
                                id="branchCode"
                                placeholder="Введите код филиала"
                                value={branchCode}
                                onChange={(e) => {
                                    setBranchCode(e.target.value);
                                    if (localError) setLocalError(null);
                                }}
                            />
                            {localError && !branchCode.trim() && <div className="invalid-feedback">Введите код филиала</div>}
                        </div>
                    )}

                    <button
                        className="btn btn-primary w-100 mb-2"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{ height: '52px', borderRadius: '16px' }}
                    >
                        {isSubmitting ? (
                            <div className="spinner-border spinner-border-sm text-light" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        ) : (
                            mode === 'create-branch' ? 'Создать филиал' : mode === 'join-branch' ? 'Подключиться' : 'Создать'
                        )}
                    </button>

                    {/* Кнопка для переключения в режим подключения; показываем только если не в join-mode */}
                    {mode !== 'join-branch' && (
                        <button
                            className="btn btn-outline-primary w-100 mb-2"
                            onClick={handleSwitchToJoin}
                            disabled={isSubmitting}
                        >
                            Или подключиться к филиалу по коду
                        </button>
                    )}

                    <button
                        className="btn btn-link w-100 text-muted"
                        onClick={handleReset}
                        disabled={isSubmitting}
                    >
                        Сбросить
                    </button>
                </div>
            </div>
        </div>
    );
}