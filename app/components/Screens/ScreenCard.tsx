'use client'

import React from 'react'
import {Card, Button, Form} from 'react-bootstrap'
import {useScreensStore} from '@/app/store/screensStore'
import {DeviceStatus, GroupData, ScreenData} from "@/public/types/interfaces";

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

    const groups = useScreensStore(state => state.groups)

    // Собираем имена групп, в которые входит этот экран
    const groupNames = (screen.groupIds ?? [])
        .map(id => groups.find((g: GroupData) => g.id === id)?.name)
        .filter(Boolean) as string[]

    return (
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
                <div className="d-flex align-items-center mb-2" style={{gap: 6}}>
          <span
              style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: screen.status ? 'green' : 'red',
              }}
          />
                    <small className="text-muted">
                        {screen.status ? DeviceStatus.ONLINE : 'Оффлайн'}
                    </small>
                </div>

                {/* Список групп */}
                <div className="mb-3">
                    <strong>Группы:</strong>{' '}
                    {groupNames.length > 0 ? groupNames.join(', ') : 'Без группы'}
                </div>

                {/* Действия */}
                <div className="d-flex flex-wrap gap-2">
                    {screen.status ? (
                        ['Показать', 'Редактировать', 'Выключить'].map(label => (
                            <Button
                                key={label}
                                size="sm"
                                variant="outline-primary"
                                className="flex-grow-1"
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
    )
}
