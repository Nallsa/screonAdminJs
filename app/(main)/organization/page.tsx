/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation'
import {useOrganizationStore} from "@/app/store/organizationStore";
import {BranchDto} from "@/public/types/interfaces";
import {InitialsAvatar} from "@/app/components/Organization/Organization";
import {Button} from "react-bootstrap";
import {useAuthStore} from "@/app/store/authStore";
import {LICENSE, licenseControl} from "@/app/store/settingsStore";
import {WarningModal} from "@/app/components/Common/WarningModal";
import ErrorModal from "@/app/components/Common/ErrorModal";

export default function OrganizationPage() {
    const router = useRouter();
    const {
        organizationInfo,
        orgBranches,
        getInfoOrg,
        activeBranches, // New: pull activeBranches from store
        toggleActiveBranch, // New: pull toggle function from store
        successMessage,
        errorMessage,
        setError,
        setSuccess,
    } = useOrganizationStore();

    useEffect(() => {
        async function fetchOrg() {
            const success = await getInfoOrg();
            if (!success) {
                router.push('/organization/createOrgElements?isBranch=false');
            }
        }

        fetchOrg();
    }, [getInfoOrg, router]);

    const signOut = useAuthStore(s => s.signOut)

    const handleLogout = () => {
        signOut()
        router.push('/auth/login')
    }


    const orgInfo = organizationInfo
    const branches = (orgBranches as BranchDto[] | null) ?? orgInfo?.branches ?? [];

    if (!orgInfo) {
        return (
            <div className="container py-4">
                <div className="row justify-content-center">
                    <div className="col-md-8 col-lg-6">
                        <EmptyOrganizationState onRetry={() => getInfoOrg()}/>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container py-4">
                <div className="row justify-content-center">
                    <div className="col-md-8 col-lg-6">
                        {/* Header: photo + name */}
                        <div className="text-center mb-4">
                            {orgInfo.photoUrl ? (
                                <></>
                            ) : (
                                <InitialsAvatar text={orgInfo.name} size={96}/>

                            )}

                            <h4 className="mt-3 fw-bold">{orgInfo.name}</h4>
                        </div>

                        {/* Branches section */}


                        <div className="d-flex justify-content-between align-items-center mb-3 px-2">
                            <h5 className="mb-0">Филиалы</h5>
                            {licenseControl([LICENSE.ULTIMATE]) &&
                                <button
                                    className="btn btn-primary rounded-pill px-3 py-1"
                                    onClick={() => router.push('/organization/createOrgElements?isBranch=true')} // Adjust route; assuming separate route for branch creation
                                >
                                    <i className="bi bi-plus fs-5"></i> Создать филиал
                                </button>}
                        </div>


                        {branches.length === 0 ? (
                            <p className="text-muted px-2">Пока филиалов нет</p>
                        ) : (
                            <div className="row px-2">
                                {branches.map((branch: BranchDto) => (
                                    <div key={branch.id} className="col-12 col-sm-6 mb-3">
                                        <BranchCard
                                            branch={branch}
                                            onClick={() => toggleActiveBranch(branch)} // Changed: toggle active instead of redirect
                                            isActive={activeBranches.some((b) => b.id === branch.id)} // New: pass isActive prop
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <WarningModal show={!!successMessage} title="Готово" message={successMessage || ''} buttonText="Ок"
                              onClose={() => setSuccess(null)}/>
                <ErrorModal show={!!errorMessage} message={errorMessage || ''} onClose={() => setError(null)}/>
            </div>
        </>
    );
}


function BranchCard({branch, onClick, isActive}: { branch: BranchDto; onClick: () => void; isActive: boolean }) { // Updated: accept isActive prop
    const router = useRouter();
    const {setSelectBranch} = useOrganizationStore()

    const handleNavigate = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the card's onClick

        setSelectBranch(branch);
        // Переходим на маршрут
        router.push(`/organization/orgBranch`);
    };

    return (
        <div
            className={`card shadow rounded-3 ${isActive ? 'border border-success border-2' : ''}`} // Updated: add green border if active (Bootstrap's border-success is light green)
            onClick={onClick}
            style={{cursor: 'pointer'}}
        >
            <div className="card-body p-3">
                <div
                    className="bg-light rounded d-flex align-items-center justify-content-center"
                    style={{height: '120px'}}
                >
                    {branch.logoUrl ? (
                        <></>
                    ) : (
                        <InitialsAvatar text={branch.name} size={72}/>
                    )}
                </div>
                <h6 className="mt-2 mb-0 text-truncate">{branch.name}</h6>
                <button
                    className="btn btn-outline-primary btn-sm mt-2 " // Updated: btn-outline-primary for transparent background, rounded-pill for beautiful look, removed w-100 to make smaller
                    onClick={handleNavigate}
                >
                    Перейти
                </button>
            </div>
        </div>
    );
}

function EmptyOrganizationState({onRetry}: { onRetry: () => void }) {
    return (
        <div className="text-center py-5">
            <p className="text-muted">Организация не найдена или произошла ошибка.</p>
            <button className="btn btn-secondary" onClick={onRetry}>
                Повторить
            </button>
        </div>
    );
}