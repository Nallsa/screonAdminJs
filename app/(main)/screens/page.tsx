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
        setError
    } = useScreensStore()


    const [search, setSearch] = useState('')
    const [groupFilter, setGroupFilter] = useState<'all' | 'nogroup' | string>('all')

    // для модалки Добавить экран
    const [showAddModal, setShowAddModal] = useState(false)
    const [screenCode, setScreenCode] = useState('')

    useEffect(() => {
        const initialize = async () => {
            await connectWsForScreen()
        };

        initialize();
    }, [connectWsForScreen]);


    const handleOpenAddModal = () => {
        setScreenCode('')
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

        addPairingConfirm(screenCode).then(r => setShowAddModal(false))
    }

    useEffect(() => {
        getScreens().then(r => console.log(""))
    }, [getScreens]);

    // первичный фильтр
    useEffect(() => {
        filterScreens('', 'all')
    }, [filterScreens])


    useEffect(() => {
        filterScreens(search, groupFilter)
    }, [search, groupFilter, filterScreens])


    return (
        <div className="p-4">
            {/* хэдер */}
            <div className="d-flex justify-content-between align-items-center mb-3 rounded">
                <h4 className="mb-0">Экраны</h4>
                <div className="d-flex gap-4">
                    <Button variant="primary" onClick={handleOpenAddModal}>
                        Добавить экран
                    </Button>
                    <Button
                        variant="success"
                        onClick={startCreateGroup}
                        disabled={allScreens.length === 0}
                    >
                        Создать группу
                    </Button>
                </div>
            </div>

            {/* Поиск и фильтр */}
            <div className="d-flex align-items-center gap-3 mb-3">
                <Form.Control
                    type="text"
                    placeholder="Поиск по названию..."
                    style={{maxWidth: 1500}}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                <Dropdown onSelect={k => setGroupFilter(k!)}>
                    <Dropdown.Toggle disabled={allScreens.length === 0} style={{paddingLeft: 20, paddingRight: 20}}
                                     variant="success">
                        {groupFilter === 'all'
                            ? 'Все группы'
                            : groupFilter === 'nogroup'
                                ? 'Без группы'
                                : groups.find(g => g.id === groupFilter)?.name}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item eventKey="all">Все группы</Dropdown.Item>
                        <Dropdown.Item eventKey="nogroup">Без группы</Dropdown.Item>
                        {groups.map(g => (
                            <Dropdown.Item key={g.id} eventKey={g.id}>
                                {g.name}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
            </div>

            {/* Форма создания группы */}
            {isCreatingGroup && (
                <div className="mb-4 rounded d-flex flex-row">
                    <InputGroup className="mb-2" style={{maxWidth: 400}}>
                        <InputGroup.Text>Название группы</InputGroup.Text>
                        <Form.Control
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                        />
                    </InputGroup>


                    <div className="d-flex gap-2 ms-2 mb-2">
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
                    <Modal.Title>Введите код экрана</Modal.Title>

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

                <Modal.Body className="d-flex justify-content-center">
                    <Form.Group controlId="screenCode" className="w-50">
                        <Form.Control
                            size="sm"
                            type="text"
                            inputMode="text"
                            pattern="[A-Z0-9]*"
                            placeholder="ABC123"
                            value={screenCode}
                            onChange={e => {
                                const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                                setScreenCode(upper)
                            }}
                        />
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer className="border-0 justify-content-center">
                    <Button
                        variant="success"
                        onClick={handleConfirmAdd}
                        disabled={screenCode.length < 8 || screenCode.length > 8}
                    >
                        Добавить экран
                    </Button>
                </Modal.Footer>
            </Modal>

            <ErrorModal
                show={!!errorMessage}
                message={errorMessage || ''}
                onClose={() => setError(null)}
            />
        </div>
    )
}
