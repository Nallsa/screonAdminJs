'use client'

import React, {useEffect, useState} from 'react'
import {Button, Form, Dropdown, InputGroup} from 'react-bootstrap'
import {v4 as uuid} from 'uuid'

import ScreenCard from '@/app/components/Screens/ScreenCard'
import {useScreensStore} from '@/app/store/screensStore'

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
        addScreen,
    } = useScreensStore()

    // локальные UI-стейты
    const [search, setSearch] = useState('')
    const [groupFilter, setGroupFilter] = useState<'all' | 'nogroup' | string>('all')


    // первичный фильтр
    useEffect(() => {
        filterScreens('', 'all')
    }, [filterScreens])


    useEffect(() => {
        filterScreens(search, groupFilter)
    }, [search, groupFilter, filterScreens])


    return (
        <div className="p-4">
            {/* заголовок */}
            <div className="d-flex justify-content-between align-items-center mb-3 p-3 rounded">
                <h4 className="mb-0">Экраны</h4>
                <div className="d-flex gap-2">
                    <Button variant="success">
                        Добавить экран
                    </Button>
                    <Button variant="primary" onClick={startCreateGroup}>
                        Создать группу
                    </Button>
                </div>
            </div>

            {/* Поиск и фильтр */}
            <div className="d-flex align-items-center gap-3 mb-3">
                <Form.Control
                    type="text"
                    placeholder="Поиск по названию..."
                    style={{maxWidth: 300}}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                <Dropdown onSelect={k => setGroupFilter(k!)}>
                    <Dropdown.Toggle variant="secondary">
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
        </div>
    )
}
