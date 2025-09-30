/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'

import React, {useEffect, useState} from 'react'
import {Button, Form, Dropdown, InputGroup, Modal} from 'react-bootstrap'
import {v4 as uuid} from 'uuid'

import ScreenCard from '@/app/components/Screens/ScreenCard'
import {useScreensStore} from '@/app/store/screensStore'
import {log} from "node:util";
import {useAuthStore} from "@/app/store/authStore";
import {connectWebSocket} from "@/app/API/ws";
import ErrorModal from "@/app/components/Common/ErrorModal";
import {useOrganizationStore} from "@/app/store/organizationStore";
import {WarningModal} from "@/app/components/Common/WarningModal";

export default function ScreensPage() {
    const {
        allScreens,
        filteredScreens,
        groups,
        isCreatingGroup,
        newGroupName,
        setNewGroupName,
        selectedForNewGroup,
        startCreateGroup,
        cancelCreateGroup,
        toggleNewGroupScreen,
        saveGroup,
        filterScreens,
        addPairingConfirm,
        getScreens,
        connectWsForScreen,
        errorMessage,
        setError,
        successMessage,
        setSuccess
    } = useScreensStore()


    const [search, setSearch] = useState('')
    const [groupFilter, setGroupFilter] = useState<'all' | 'nogroup' | string>('all')

    // для модалки Добавить экран
    const [showAddModal, setShowAddModal] = useState(false)
    const [screenCode, setScreenCode] = useState('')
    const [certificateCode, setCertificateCode] = useState('')

    const {organizationInfo} = useOrganizationStore();
    const branches = organizationInfo?.branches ?? [];
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");


    useEffect(() => {
        const initialize = async () => {
            await connectWsForScreen()
        };

        initialize();
    }, [connectWsForScreen]);


    const handleOpenAddModal = () => {
        setScreenCode('')
        if (!selectedBranchId && branches.length > 0) {
            setSelectedBranchId(branches[0].id);
        }
        setShowAddModal(true)
    }
    const handleCloseAddModal = () => {
        setShowAddModal(false)
    }
    const handleConfirmAdd = () => {
        if (!screenCode) {
            alert('Пожалуйста, введите код экрана')
            return
        }
        // if (!certificateCode) {
        //     alert('Пожалуйста, введите сертификат')
        //     return
        // }

        if (!selectedBranchId) {
            alert("Пожалуйста, выберите филиал");
            return;
        }

        addPairingConfirm(screenCode, selectedBranchId).then(r => setShowAddModal(false))
    }

    // первичный фильтр
    useEffect(() => {
        filterScreens('', 'all')
    }, [filterScreens])


    useEffect(() => {
        filterScreens(search, groupFilter)
    }, [search, groupFilter, filterScreens])


    return (
        <div className="p-4">
            {/* Хедер */}
            <div className="mb-3">
                <div className="row g-2 align-items-center">
                    <div className="col">
                        <h4 className="mb-0">Экраны</h4>
                    </div>

                    {/* xs: col-12 на всю ширину; md+: auto и прижатие вправо */}
                    <div className="col-12 col-md-auto ms-md-auto d-grid d-sm-inline-flex gap-2">
                        <Button className="px-sm-4" variant="primary" onClick={handleOpenAddModal}>
                            Добавить экран
                        </Button>
                        <Button
                            className="px-sm-4"
                            variant="primary"
                            onClick={startCreateGroup}
                            disabled={allScreens.length === 0}
                        >
                            Создать группу
                        </Button>
                    </div>
                </div>
            </div>

            {/* Поиск и фильтр */}
            <div className="row g-2 g-md-3 mb-3">
                <div className="col-12 col-md-auto">
                    <Dropdown onSelect={(k) => setGroupFilter(k!)} className="w-100">
                        <Dropdown.Toggle disabled={allScreens.length === 0} variant="outline-primary" className="w-100">
                            {groupFilter === 'all'
                                ? 'Все группы'
                                : groupFilter === 'nogroup'
                                    ? 'Без группы'
                                    : groups.find((g) => g.id === groupFilter)?.name}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey="all">Все группы</Dropdown.Item>
                            <Dropdown.Item eventKey="nogroup">Без группы</Dropdown.Item>
                            {groups.map((g) => (
                                <Dropdown.Item key={g.id} eventKey={g.id}>
                                    {g.name}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                <div className="col-12 col-md">
                    <Form.Control
                        type="text"
                        placeholder="Поиск по названию..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Форма создания группы */}
            {isCreatingGroup && (
                <div className="row g-2 mb-4">
                    <div className="col-12 col-md-6 col-lg-4">
                        <InputGroup>
                            <InputGroup.Text>Название группы</InputGroup.Text>
                            <Form.Control value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}/>
                        </InputGroup>
                    </div>
                    <div className="col-12 col-md-auto d-flex gap-2">
                        <Button size="sm" variant="success" onClick={saveGroup}>
                            Сохранить группу
                        </Button>
                        <Button size="sm" variant="secondary" onClick={cancelCreateGroup}>
                            Отмена
                        </Button>
                    </div>
                </div>
            )}

            {/* Список экранов */}
            <div className="d-flex flex-wrap gap-3">
                {filteredScreens.map(screen => (
                    <ScreenCard
                        key={screen.id}
                        screen={screen}
                        isCreatingGroup={isCreatingGroup}
                        isSelected={selectedForNewGroup.includes(screen.id)}
                        onSelect={() => toggleNewGroupScreen(screen.id)}
                    />
                ))}
            </div>


            {/* добавление экрана */}
            <Modal show={showAddModal} onHide={handleCloseAddModal} centered>
                <Modal.Header
                    className="border-0 position-relative"
                    style={{justifyContent: 'center'}}
                >
                    <Modal.Title>Введите код экрана и сертификата</Modal.Title>

                    {/* свой крестик */}
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={handleCloseAddModal}
                        style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '1rem',
                        }}
                    />
                </Modal.Header>

                <Modal.Body className="d-flex flex-column align-items-center">
                    <Form.Group controlId="screenCode" className="w-50">
                        <Form.Label>Код экрана</Form.Label>
                        <Form.Control
                            maxLength={8}
                            className="mb-2"
                            size="sm"
                            type="text"
                            inputMode="text"
                            pattern="[A-Z0-9]*"
                            placeholder="ABC123"
                            value={screenCode}
                            onChange={(e) => {
                                const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                setScreenCode(upper);
                            }}
                        />
                    </Form.Group>

                    {/*<Form.Group controlId="certificateCode" className="w-50">*/}
                    {/*    <Form.Label>Код сертификата</Form.Label>*/}
                    {/*    <Form.Control*/}
                    {/*        className="mb-2"*/}
                    {/*        size="sm"*/}
                    {/*        type="text"*/}
                    {/*        inputMode="text"*/}
                    {/*        pattern="[A-Z0-9]*"*/}
                    {/*        placeholder="XYZ789"*/}
                    {/*        value={certificateCode}*/}
                    {/*        onChange={(e) => {*/}
                    {/*            const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');*/}
                    {/*            setCertificateCode(upper);*/}
                    {/*        }}*/}
                    {/*    />*/}
                    {/*</Form.Group>*/}

                    <Form.Group controlId="branchSelect" className="w-50 mt-3">
                        <Form.Label>Филиал</Form.Label>
                        <Form.Select
                            size="sm"
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                        >
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer className="border-0 justify-content-center">
                    <Button
                        variant="success"
                        onClick={() => handleConfirmAdd()}
                        disabled={screenCode.length !== 8
                            || !selectedBranchId
                            // || certificateCode.length !== 8
                        }
                    >
                        Добавить экран
                    </Button>
                </Modal.Footer>
            </Modal>


            <WarningModal show={!!successMessage} title="Готово" message={successMessage || ''} buttonText="Ок"
                          onClose={() => setSuccess(null)}/>
            <ErrorModal
                show={!!errorMessage}
                message={errorMessage || ''}
                onClose={() => setError(null)}
            />
        </div>
    )
}
