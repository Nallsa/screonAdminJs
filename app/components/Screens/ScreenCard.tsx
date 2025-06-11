'use client'

import React from 'react'
import {Card, Button, Form} from 'react-bootstrap'
import {GroupData, ScreenData, useScreensStore} from '@/app/store/screensStore'

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

    const groupNames = screen.groupIds
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
                  background: screen.online ? 'green' : 'red',
              }}
          />
                    <small className="text-muted">
                        {screen.online ? 'Онлайн' : 'Оффлайн'}
                    </small>
                </div>

                <div className="mb-3">
                    <text>Группы:</text>
                    {' '}
                    {groupNames.length > 0 ? groupNames.join(', ') : 'Без группы'}
                </div>

                {/* Действия */}
                <div className="d-flex flex-wrap gap-2">
                    {screen.online ? (
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
