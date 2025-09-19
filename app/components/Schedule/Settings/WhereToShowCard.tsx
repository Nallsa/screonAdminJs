/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React from 'react'
import {Button, Dropdown, Form, Col} from 'react-bootstrap'
import {useScreensStore} from '@/app/store/screensStore'
import {useScheduleStore} from '@/app/store/scheduleStore'

type Props = {
    onNoScreensClick: (e: React.MouseEvent) => void
}

export default function WhereToShowCard({onNoScreensClick}: Props) {
    const {allScreens, groups} = useScreensStore()
    const {
        selectedScreens,
        toggleScreen,
        selectedGroup,
        setSelectedGroup,
        selectedPlaylist,
    } = useScheduleStore()

    return (
        <div className="d-flex flex-column justify-content-lg-evenly align-content-center gap-3">
            <Col xs="auto">
                {allScreens.length === 0 ? (
                    <Button variant="secondary" onClick={onNoScreensClick}>
                        Экраны
                    </Button>
                ) : (
                    <div className="d-flex flex-row justify-content-lg-evenly align-content-center gap-3">
                        {/* Экраны */}
                        <Dropdown autoClose="outside">
                            <Dropdown.Toggle disabled={!!selectedGroup} style={{paddingLeft: 40, paddingRight: 40}}>
                                Экраны
                            </Dropdown.Toggle>
                            <Dropdown.Menu style={{padding: 0}}>
                                <Dropdown.Item
                                    as="label"
                                    htmlFor="screen-all"
                                    className="d-flex align-items-center px-3 py-2"
                                >
                                    <Form.Check
                                        type="checkbox"
                                        id="screen-all"
                                        checked={selectedScreens.length === allScreens.length}
                                        onChange={() => {
                                            if (selectedScreens.length === allScreens.length) {
                                                selectedScreens.forEach(id => toggleScreen(id))
                                            } else {
                                                allScreens.forEach(s => {
                                                    if (!selectedScreens.includes(s.id)) toggleScreen(s.id)
                                                })
                                            }
                                        }}
                                        className="me-2 mb-0"
                                    />
                                    <span>Выбрать всё</span>
                                </Dropdown.Item>

                                {allScreens.map(s => (
                                    <Dropdown.Item
                                        as="label"
                                        htmlFor={`screen-${s.id}`}
                                        key={s.id}
                                        className="d-flex align-items-center px-3 py-2"
                                    >
                                        <Form.Check
                                            type="checkbox"
                                            id={`screen-${s.id}`}
                                            checked={selectedScreens.includes(s.id)}
                                            onChange={() => toggleScreen(s.id)}
                                            className="me-2 mb-0"
                                        />
                                        <span>{s.name}</span>
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown>

                        {/* Группа экранов */}
                        <Dropdown>
                            <Dropdown.Toggle style={{paddingLeft: 40, paddingRight: 40}}>
                                {selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : 'Группа экранов'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu style={{minWidth: 200}}>
                                <Dropdown.Item onClick={() => setSelectedGroup(null)}>
                                    — не использовать группу —
                                </Dropdown.Item>
                                <Dropdown.Divider/>
                                {groups.map(g => (
                                    <Dropdown.Item key={g.id} onClick={() => setSelectedGroup(g.id)}>
                                        {g.name}
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                )}
            </Col>

        </div>
    )
}
