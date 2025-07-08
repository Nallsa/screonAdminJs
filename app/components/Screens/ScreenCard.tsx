'use client'

import React, {useState} from 'react'
import {Card, Button, Form, Modal} from 'react-bootstrap'
import {useScreensStore} from '@/app/store/screensStore'
import {DeviceStatus, GroupData, ScreenData} from "@/public/types/interfaces";
import ConfirmModal from "@/app/components/Common/ConfirmModal";

interface ScreenCardProps {
    screen: ScreenData
    isCreatingGroup: boolean
    isSelected: boolean
    onSelect?: () => void
}

export default function ScreenCard({
                                       screen,
                                       isCreatingGroup,
                                       isSelected,
                                       onSelect,
                                   }: ScreenCardProps) {

    const delScreen = useScreensStore(state => state.delScreen)
    const groups = useScreensStore(state => state.groups)
    const assignGroupToScreen = useScreensStore(state => state.assignGroupToScreen)
    const updateScreenName = useScreensStore(state => state.updateScreenName)

    const [showConfirm, setShowConfirm] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)

    const [editModalName, setEditModalName] = useState(screen.name)
    const [editModalGroup, setEditModalGroup] = useState<string | null>(screen.groupId ?? null);

    // Собираем имена групп, в которые входит этот экран
    const groupName = screen.groupId
        ? groups.find(g => g.id === screen.groupId)?.name || '— без группы —'
        : '— без группы —'


    function handleDelete() {
        delScreen(screen.id)
        setShowConfirm(false)
    }

    function openEdit() {
        setEditModalName(screen.name);
        setEditModalGroup(screen.groupId ?? null);
        setShowEditModal(true);
    }

    async function saveEditModal() {
        try {
            await updateScreenName(screen.id, editModalName)

            await assignGroupToScreen(screen.id, editModalGroup)

            setShowEditModal(false)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <>
            <Card
                className="shadow-sm position-relative"
                style={{width: 240, borderRadius: 8}}
            >
                {isCreatingGroup && onSelect && (
                    <Form.Check
                        type="checkbox"
                        checked={isSelected}
                        onChange={onSelect}
                        className="position-absolute"
                        style={{top: 8, right: 8, zIndex: 10}}
                    />
                )}

                {/* Превью */}
                <div
                    style={{
                        height: 140,
                        background: '#000',
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                    }}
                />

                <Card.Body className="p-2">
                    {/* Название */}
                    <Card.Title as="h6" className="mb-1">
                        {screen.name}
                    </Card.Title>

                    {/* Статус */}
                    <div className="d-flex align-items-center mb-1" style={{gap: 6}}>
          <span
              style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: screen.status ? 'green' : 'red',
              }}
          />

                        Онлайн

                    </div>

                    {/* Группа */}
                    <div className="mb-3">
                        <strong>Группа:</strong> {groupName}
                    </div>

                    {/* Действия */}
                    <div className="d-flex flex-wrap gap-2">
                        {screen.status ? (
                            ['Показать', 'Редактировать', 'Выключить', 'Удалить'].map(label => (
                                <Button
                                    key={label}
                                    size="sm"
                                    variant="outline-primary"
                                    className="flex-grow-1"

                                    onClick={() => {
                                        if (label == 'Удалить') {
                                            setShowConfirm(true)
                                        }
                                        if (label === 'Редактировать') openEdit()

                                    }}
                                >
                                    {label}
                                </Button>
                            ))
                        ) : (
                            ['Перезапуск', 'Диагностика'].map(label => (
                                <Button
                                    key={label}
                                    size="sm"
                                    variant="outline-primary"
                                    className="flex-grow-1"
                                >
                                    {label}
                                </Button>
                            ))
                        )}
                    </div>
                </Card.Body>
            </Card>


            {/* Модальное окно подтверждения удаления */}
            <ConfirmModal
                show={showConfirm}
                title="Подтвердите удаление"
                message={`Вы уверены, что хотите удалить экран «${screen.name}»?`}
                confirmText="Удалить"
                cancelText="Отмена"
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
            />


            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Редактировать экран</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-4">
                            <Form.Label>Имя экрана</Form.Label>
                            <Form.Control
                                type="text"
                                value={editModalName}
                                onChange={e => setEditModalName(e.target.value)}
                                placeholder="Введите новое имя"
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>Группа</Form.Label>
                            <Form.Select
                                value={editModalGroup || ''}
                                onChange={e => setEditModalGroup(e.target.value)}
                            >
                                <option value="">— без группы —</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        Отмена
                    </Button>
                    <Button
                        variant="primary"
                        onClick={saveEditModal}
                        disabled={!editModalName.trim()}
                    >
                        Сохранить
                    </Button>
                </Modal.Footer>
            </Modal>
        </>

    )
}
