'use client'
import React, {useEffect, useState} from 'react'
import {Form, Button, Dropdown, InputGroup, Card, Col, Row} from 'react-bootstrap'
import {getCurrentWeekByDate, parseDayToDate, RU_DAYS, timeToMinutes, WEEK_DAYS} from '@/app/lib/scheduleUtils'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {motion, LayoutGroup, AnimatePresence} from 'framer-motion'
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {WarningModal} from "@/app/components/Common/WarningModal";
import {useRouter} from "next/navigation";


export default function ScheduleSettingsPanel() {
    const {
        selectedDate,
        onDateSelected,
        isRecurring,
        togglePlayRecurring,
        isFixedSchedule,
        toggleFixedSchedule,
        selectedPlaylist,
        setSelectedPlaylist,
        startTime,
        endTime,
        setStartTime,
        setEndTime,
        selectedDays,
        toggleDay,
        selectedScreens,
        toggleScreen,
        scheduledFixedMap,
        scheduledCalendarMap,
        addBlock,
        priority,
        setPriority,
        showMode,
        setShowMode,
        setIntervalMinutes,
        intervalMinutes,
        pauseMinutes,
        setPauseMinutes,
    } = useScheduleStore()

    const {allScreens} = useScreensStore()
    const {playlistItems} = usePlaylistStore()
    const [noScreensModal, setNoScreensModal] = useState(false)
    const [noPlaylistsModal, setNoPlaylistsModal] = useState(false)
    const router = useRouter();

    useEffect(() => {
        onDateSelected(new Date())
    }, [onDateSelected])

    const handleScreensToggle = (e: React.MouseEvent) => {
        if (allScreens.length === 0) {
            e.preventDefault()
            setNoScreensModal(true)
        }
    }

    const handlePlaylistToggle = (e: React.MouseEvent) => {
        if (playlistItems.length === 0) {
            e.preventDefault()
            setNoPlaylistsModal(true)
        }
    }


    const handleAdd = () => {
        if (!selectedPlaylist) {
            window.alert('Выберите, пожалуйста, плейлист')
            return
        }
        if (selectedScreens.length === 0) {
            window.alert('Выберите хотя бы один экран')
            return
        }
        if (selectedDays.length === 0) {
            window.alert('Выберите хотя бы один день')
            return
        }

        const newStart = timeToMinutes(startTime)
        const newEnd = timeToMinutes(endTime)

        // для каждого экрана проверяем конфликты
        for (const screenId of selectedScreens) {
            const mapKey = isFixedSchedule ? scheduledFixedMap : scheduledCalendarMap
            const existing: typeof mapKey[string] = mapKey[screenId] ?? []

            for (const dayShort of selectedDays) {

                const dateObj = parseDayToDate(dayShort, getCurrentWeekByDate(selectedDate))
                const isoDate = dateObj.toISOString().slice(0, 10)
                const ruIndex = RU_DAYS.indexOf(dayShort)
                if (ruIndex < 0) continue


                const dayOfWeekKey = WEEK_DAYS[ruIndex]

                const playlistName = playlistItems.find(p => p.id === selectedPlaylist)?.name ?? selectedPlaylist


                const conflict = existing.find(b => {
                    if (isFixedSchedule) {
                        if (b.dayOfWeek !== dayOfWeekKey) return false
                    } else {
                        if (b.startDate !== isoDate) return false
                    }
                    if (b.playlistId !== selectedPlaylist) return false

                    const existStart = timeToMinutes(b.startTime)
                    const existEnd = timeToMinutes(b.endTime)
                    // return newStart < existEnd && existStart < newEnd
                })

                if (conflict) {
                    window.alert(
                        `На экране ${screenId} плейлист «${playlistName}» уже назначен в ${dayShort} ` +
                        `с ${conflict.startTime} до ${conflict.endTime}.`
                    )
                    return
                }
            }
        }

        // если для всех экранов конфликтов нет — добавляем
        addBlock()
    }

    return (
        <>
            <LayoutGroup>
                <motion.div
                    layout
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 16,
                        alignItems: 'center',
                        justifyContent: 'space-around',
                    }}
                >
                    {!isFixedSchedule && (
                        <motion.div layout>
                            <input
                                type="date"
                                value={selectedDate.toISOString().slice(0, 10) || ''}
                                onChange={e => onDateSelected(new Date(e.target.value))}
                            />
                        </motion.div>
                    )}

                    {/* Как показывать */}
                    <motion.div layout className="mb-1">
                        <Card>
                            <Card.Header>Как показывать</Card.Header>
                            <Card.Body>
                                <Form.Group>
                                    <div className="d-flex gap-3">
                                        <Form.Check
                                            inline
                                            type="checkbox"
                                            id="mode-recurring"
                                            name="showMode"
                                            label="Зациклено"
                                            checked={showMode === 'cycle'}
                                            onChange={() => {
                                                setShowMode('cycle')
                                                setPauseMinutes(0)
                                                setIntervalMinutes(0)
                                            }}
                                        />
                                        <Form.Check
                                            inline
                                            type="checkbox"
                                            id="mode-repeat-interval"
                                            name="showMode"
                                            label="Играть X минут, потом пауза Y минут"
                                            checked={showMode === 'repeatInterval'}
                                            onChange={() => setShowMode('repeatInterval')}
                                        />
                                    </div>
                                </Form.Group>

                                {showMode === 'repeatInterval' && (
                                    <div className="d-flex align-items-center gap-3 ps-4 mt-2">
                                        <InputGroup style={{width: 240}}>
                                            <InputGroup.Text>Играть</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                min={0}
                                                value={intervalMinutes != null ? intervalMinutes : ''}
                                                onChange={e => setIntervalMinutes(+e.target.value)}
                                            />
                                            <InputGroup.Text>мин</InputGroup.Text>
                                        </InputGroup>

                                        <InputGroup style={{width: 240}}>
                                            <InputGroup.Text>Пауза</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                min={0}
                                                value={pauseMinutes != null ? pauseMinutes : ''}
                                                onChange={e => setPauseMinutes(+e.target.value)}
                                            />
                                            <InputGroup.Text>мин</InputGroup.Text>
                                        </InputGroup>
                                    </div>
                                )}
                            </Card.Body>


                        </Card>
                    </motion.div>

                    {/* Время */}
                    <motion.div layout>
                        <InputGroup style={{maxWidth: 300}}>
                            <InputGroup.Text>С</InputGroup.Text>
                            <Form.Control
                                type="time"
                                value={startTime || ''}
                                onChange={e => {
                                    const t = e.target.value
                                    setStartTime(t)
                                    if (endTime < t) {
                                        setEndTime(t)
                                    }
                                }}
                                max={endTime}
                            />
                            <InputGroup.Text>До</InputGroup.Text>
                            <Form.Control
                                type="time"
                                value={endTime || ''}
                                onChange={e => {
                                    const t = e.target.value
                                    if (t >= startTime) {
                                        setEndTime(t)
                                    }
                                }}
                                min={startTime}
                            />
                        </InputGroup>
                    </motion.div>

                    {/* Экраны / Плейлисты / Дни / Добавить */}
                    <Row className="g-3 d-flex align-items-center justify-content-center">
                        <Col xs="auto">
                            {allScreens.length === 0 ? (
                                // если экранов нет — обычная кнопка, которая открывает модалку
                                <Button variant="secondary" onClick={handleScreensToggle}>
                                    Экраны
                                </Button>
                            ) : (
                                // если экраны есть — полноценный дропдаун
                                <Dropdown autoClose="outside">
                                    <Dropdown.Toggle>Экраны</Dropdown.Toggle>
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
                            )}
                        </Col>

                        <Col xs="auto">
                            {playlistItems.length === 0 ? (
                                <Button variant="secondary" onClick={handlePlaylistToggle}>
                                    Плейлисты
                                </Button>
                            ) : (
                                <Dropdown onSelect={k => setSelectedPlaylist(k!)}>
                                    <Dropdown.Toggle variant="primary">
                                        {playlistItems.find(p => p.id === selectedPlaylist)?.name ?? 'Выберите плейлист'}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        {playlistItems.map(pl => (
                                            <Dropdown.Item key={pl.id} eventKey={pl.id}>
                                                {pl.name}
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                </Dropdown>
                            )}
                        </Col>

                        <Col xs="auto">
                            {showMode === "cycle" ? (
                                    <Dropdown onSelect={k => setPriority(Number(k))}>
                                        <Dropdown.Toggle variant="primary">
                                            Приоритет: {priority}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {Array.from({length: 10}, (_, i) => (
                                                <Dropdown.Item key={i + 1} eventKey={(i + 1).toString()}>
                                                    {i + 1}
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                )
                                :
                                (
                                    <span>Высокий приоритет</span>
                                )
                            }

                        </Col>

                        <Col xs="auto">
                            <div style={{display: 'flex', gap: 8}}>
                                {RU_DAYS.map(d => (
                                    <Button
                                        key={d}
                                        size="sm"
                                        variant={selectedDays.includes(d) ? 'success' : 'outline-secondary'}
                                        onClick={() => toggleDay(d)}
                                    >
                                        {d}
                                    </Button>
                                ))}
                            </div>
                        </Col>


                        <Col xs="auto">
                            <Button
                                onClick={handleAdd}
                                disabled={selectedScreens.length === 0 || !selectedPlaylist}
                            >
                                Добавить
                            </Button>
                        </Col>
                    </Row>
                </motion.div>
            </LayoutGroup>


            <WarningModal
                show={noScreensModal}
                title="Нет экранов"
                message="У вас ещё не добавлено ни одного экрана."
                buttonText="Перейти к экранам"
                onClose={() => {
                    setNoScreensModal(false)
                    router.push('/screens')
                }}
            />

            <WarningModal
                show={noPlaylistsModal}
                title="Нет плейлистов"
                message="У вас ещё нет созданных плейлистов."
                buttonText="Перейти к плейлистам"
                onClose={() => {
                    setNoPlaylistsModal(false)
                    router.push('/playlists')
                }}
            />
        </>
    )
}


{/*<motion.div layout>*/
}
{/*    <Form.Check*/
}
{/*        inline*/
}
{/*        label="Фон. видео"*/
}
{/*        type="checkbox"*/
}
{/*        checked={isShowBackground}*/
}
{/*        onChange={toggleShowBackground}*/
}
{/*    />*/
}
{/*</motion.div>*/
}

{/*/!* Ограничения *!/*/
}
{/*<motion.div layout>*/
}
{/*    <Card>*/
}
{/*        <Card.Header>Ограничения</Card.Header>*/
}
{/*        <Card.Body>*/
}
{/*            <div className="d-flex flex-column gap-3">*/
}
{/*                <motion.div*/
}
{/*                    layout*/
}
{/*                    className="d-flex align-items-center"*/
}
{/*                    style={{maxWidth: 400}}*/
}
{/*                >*/
}
{/*                    <InputGroup>*/
}
{/*                        <InputGroup.Text>Макс. показов/день</InputGroup.Text>*/
}
{/*                        <Form.Control*/
}
{/*                            type="number"*/
}
{/*                            min={0}*/
}
{/*                            value={maxPerDay}*/
}
{/*                            onChange={e => setMaxPerDay(+e.target.value)}*/
}
{/*                        />*/
}
{/*                    </InputGroup>*/
}
{/*                </motion.div>*/
}

{/*                <motion.div*/
}
{/*                    layout*/
}
{/*                    className="d-flex align-items-center"*/
}
{/*                    style={{maxWidth: 400}}*/
}
{/*                >*/
}
{/*                    <InputGroup>*/
}
{/*                        <InputGroup.Text>Макс. показов/час</InputGroup.Text>*/
}
{/*                        <Form.Control*/
}
{/*                            type="number"*/
}
{/*                            min={0}*/
}
{/*                            value={maxPerHour}*/
}
{/*                            onChange={e => setMaxPerHour(+e.target.value)}*/
}
{/*                        />*/
}
{/*                    </InputGroup>*/
}
{/*                </motion.div>*/
}

{/*                <motion.div*/
}
{/*                    layout*/
}
{/*                    className="d-flex align-items-center"*/
}
{/*                    style={{maxWidth: 400}}*/
}
{/*                >*/
}
{/*                    <InputGroup>*/
}
{/*                        <InputGroup.Text>Макс. длит. в день</InputGroup.Text>*/
}
{/*                        <Form.Control*/
}
{/*                            type="number"*/
}
{/*                            min={0}*/
}
{/*                            value={maxTotalDuration}*/
}
{/*                            onChange={e => setMaxTotalDuration(+e.target.value)}*/
}
{/*                        />*/
}
{/*                        <InputGroup.Text>мин</InputGroup.Text>*/
}
{/*                    </InputGroup>*/
}
{/*                </motion.div>*/
}
{/*            </div>*/
}
{/*        </Card.Body>*/
}
{/*    </Card>*/
}
{/*</motion.div>*/
}