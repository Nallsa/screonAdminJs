/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import {useRouter, useParams, useSearchParams} from 'next/navigation';
import Image from 'next/image';
import {InitialsAvatar} from "@/app/components/Organization/Organization";
import {useOrganizationStore} from '@/app/store/organizationStore';
import {useEffect, useState} from "react";
import {BranchDto, MemberDto} from "@/public/types/interfaces";
import {LICENSE, licenseControl} from "@/app/store/settingsStore";


export default function OrgBranchPage() {
    const params = useParams();
    const router = useRouter();
    const {organizationInfo, getInfoOrg, selectBranch} = useOrganizationStore();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    useEffect(() => {
        getInfoOrg(); // Fetch org info if needed
    }, [getInfoOrg]);

    const handleDelete = () => {
        // TODO: organizationViewModel.deleteBranch(branch.id)
        router.push('/organization');
        setShowDeleteDialog(false);
    };

    const branchesCount = organizationInfo?.branches?.length ?? 0;

    if (!selectBranch) {
        return router.push('/organization');
    }

    return (
        <div className="container py-4">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                    {/* Top Bar */}
                    <div className="d-flex align-items-center mb-4">
                        <button className="btn btn-outline-secondary me-2" onClick={() => router.push('/organization')}>
                            Назад
                        </button>
                        <h4 className="mb-0">{selectBranch.name}</h4>
                    </div>

                    {/* Logo */}
                    <div className="bg-light rounded-3 d-flex align-items-center justify-content-center mb-4"
                         style={{height: '180px'}}>
                        {selectBranch.logoUrl ? (
                            <Image src={selectBranch.logoUrl} alt="Логотип филиала" width={96} height={96}
                                   className="rounded-circle"/>
                        ) : (
                            <InitialsAvatar text={selectBranch.name} size={96}/>
                        )}
                    </div>

                    {/* General Info Card */}
                    <div className="card shadow-sm mb-3">
                        <div className="card-body">
                            <h5 className="card-title fw-semibold">Общая информация</h5>
                            <p>Организация: {organizationInfo?.name || 'Примерная Организация'}</p>
                            <p>Филиал: {selectBranch.name}</p>
                        </div>
                    </div>

                    {/* Description Card */}
                    {selectBranch.description && (
                        <div className="card shadow-sm mb-3">
                            <div className="card-body">
                                <h5 className="card-title fw-semibold">Описание</h5>
                                <p>{selectBranch.description}</p>
                            </div>
                        </div>
                    )}


                    {branchesCount < 1 && (
                        <button className="btn btn-danger w-100 mb-3" onClick={() => setShowDeleteDialog(true)}>
                            <i className="bi bi-trash me-2"></i> Удалить филиал
                        </button>
                    )}

                    {/* Invite Code Generator */}
                    {licenseControl([LICENSE.ADVANCED, LICENSE.ULTIMATE]) &&
                        <InviteCodeGenerator branchId={selectBranch.id}/>}

                    {/* Participants */}
                    <ParticipantsSection participants={selectBranch.members}/>

                    {/* Delete Dialog (Modal) */}
                    {showDeleteDialog && (
                        <div className="modal fade show d-block" tabIndex={-1}
                             style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">Удалить филиал?</h5>
                                        <button type="button" className="btn-close"
                                                onClick={() => setShowDeleteDialog(false)}></button>
                                    </div>
                                    <div className="modal-body">
                                        <p>Вы уверены, что хотите удалить филиал {selectBranch.name}? Это действие
                                            нельзя
                                            отменить.</p>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary"
                                                onClick={() => setShowDeleteDialog(false)}>Отмена
                                        </button>
                                        <button type="button" className="btn btn-danger"
                                                onClick={handleDelete}>Удалить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


function ParticipantsSection({participants}: { participants: MemberDto[] }) {
    return (
        <div className="card shadow-sm mt-4">
            <div className="card-body">
                <h5 className="card-title fw-semibold mb-3">Участники</h5>
                {participants.map((p) => (
                    <div key={p.id} className="d-flex align-items-center bg-light rounded p-2 mb-2">
                        <InitialsAvatar text={p.username} size={40}/>
                        <div className="ms-3">
                            <p className="mb-0 fw-medium">{p.username}</p>
                            <small className="text-muted">{p.email}</small>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface InviteCodeGeneratorProps {
    branchId?: string
}

function InviteCodeGenerator({branchId}: InviteCodeGeneratorProps) {
    const {
        inviteCode,
        isGenerating,
        successMessage,
        errorMessage,
        generateInviteCode,
        clearInviteCode,
        setSuccess
    } = useOrganizationStore();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(inviteCode);
            setSuccess('Скопировано в буфер обмена');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="border border-secondary rounded p-3">
            <h5 className="mb-3">Пригласить участников</h5>
            <p className="text-muted small mb-3">Сгенерируйте уникальный код, чтобы пригласить других пользователей в
                организацию.</p>
            <button className="btn btn-primary w-100 mb-3" onClick={() => {
                branchId && generateInviteCode(branchId)
            }} disabled={isGenerating}>
                {isGenerating ? 'Генерируем...' : 'Сгенерировать код'}
            </button>
            {inviteCode && (
                <div>
                    <div className="bg-light p-3 rounded mb-3 text-center">{inviteCode}</div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success w-100" onClick={handleCopy}>Скопировать</button>
                        <button className="btn btn-outline-secondary w-100" onClick={clearInviteCode}>Очистить</button>
                    </div>
                </div>
            )}
            {successMessage && <p className="text-success mt-2">{successMessage}</p>}
            {errorMessage && <p className="text-danger mt-2">{errorMessage}</p>}
        </div>
    );
}