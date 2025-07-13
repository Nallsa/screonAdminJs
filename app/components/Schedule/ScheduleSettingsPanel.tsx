'use client'
import React, {useEffect, useState} from 'react'
import {Form, Button, Dropdown, InputGroup, Card, Col, Row, ListGroup} from 'react-bootstrap'
import {getCurrentWeekByDate, parseDayToDate, RU_DAYS, timeToMinutes, WEEK_DAYS} from '@/app/lib/scheduleUtils'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {motion, LayoutGroup, AnimatePresence} from 'framer-motion'
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {WarningModal} from "@/app/components/Common/WarningModal";
import {useRouter} from "next/navigation";
import DatePicker from "react-datepicker";
import {ru} from 'date-fns/locale'

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
        typeMode,
        setTypeMode,
        // рекламные:
        advertisementShowMode,
        setAdvertisementShowMode,
        advertisementIntervalMinutes,
        setAdvertisementIntervalMinutes,
        advertisementIntervalHours,
        setAdvertisementIntervalHours,
        advertisementSpecificTimes,
        addAdvertisementSpecificTime,
        removeAdvertisementSpecificTime,
    } = useScheduleStore()

    const {allScreens} = useScreensStore()
    const {playlistItems} = usePlaylistStore()
    const [noScreensModal, setNoScreensModal] = useState(false)
    const [noPlaylistsModal, setNoPlaylistsModal] = useState(false)
    const [pendingTime, setPendingTime] = useState<string>('08:00')
    const [open, setOpen] = useState(true)
    const router = useRouter();

    useEffect(() => {
        onDateSelected(new Date())
    }, [onDateSelected])

    useEffect(() => {
        setOpen(true) // показываем сразу после маунта
    }, [])

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
        // Базовые проверки
        if (!selectedPlaylist) {
            window.alert('Выберите, пожалуйста, плейлист');
            return;
        }
        if (selectedScreens.length === 0) {
            window.alert('Выберите хотя бы один экран');
            return;
        }
        if (selectedDays.length === 0) {
            window.alert('Выберите хотя бы один день');
            return;
        }

        if (typeMode === 'ADVERTISEMENT') {
            const playlist = playlistItems.find(p => p.id === selectedPlaylist)!
            const durationMin = Math.ceil(playlist.totalDurationSeconds / 60)

            if (advertisementShowMode === 'minutes' && advertisementIntervalMinutes < durationMin) {
                window.alert(
                    `Интервал между показами ( ${advertisementIntervalMinutes} мин ) меньше общей длительности плейлиста ( ${durationMin} мин ).`
                )
                return
            }
            if (advertisementShowMode === 'hours' && advertisementIntervalHours * 60 < durationMin) {
                window.alert(
                    `Интервал между показами ( ${advertisementIntervalHours} ч = ${advertisementIntervalHours * 60} мин ) меньше общей длительности плейлиста ( ${durationMin} мин ).`
                )
                return
            }
        }

        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);

        // Проверяем конфликты для обычных (PLAYLIST) слотов
        if (typeMode === 'PLAYLIST') {
            for (const screenId of selectedScreens) {
                const existing = (isFixedSchedule
                        ? scheduledFixedMap[screenId] ?? []
                        : scheduledCalendarMap[screenId] ?? []
                );

                for (const dayShort of selectedDays) {
                    const week = getCurrentWeekByDate(selectedDate);
                    const dateObj = parseDayToDate(dayShort, week);
                    const isoDate = dateObj.toISOString().slice(0, 10);
                    const dowKey = WEEK_DAYS[RU_DAYS.indexOf(dayShort)];

                    const conflict = existing.find(b => {
                        // Совпадение дня/даты
                        if (isFixedSchedule) {
                            if (b.dayOfWeek !== dowKey) return false;
                        } else {
                            if (b.startDate !== isoDate) return false;
                        }
                        // Пересечение по времени
                        const existStart = timeToMinutes(b.startTime);
                        const existEnd = timeToMinutes(b.endTime);
                        if (!(newStart < existEnd && existStart < newEnd)) return false;
                        // Совпадение приоритета
                        if (b.priority !== priority) return false;

                        return true;
                    });

                    if (conflict) {
                        const name = allScreens.find(s => s.id === screenId)?.name ?? screenId;
                        window.alert(
                            `На экране «${name}» уже есть слот с приоритетом ${priority} ` +
                            `в ${dayShort} с ${conflict.startTime} до ${conflict.endTime}.`
                        );
                        return;
                    }
                }
            }
        }

        // Проверяем конфликты для рекламных (ADVERTISEMENT) слотов
        if (typeMode === 'ADVERTISEMENT') {
            const playlist = playlistItems.find(p => p.id === selectedPlaylist)!

            type Candidate = { screenId: string; date: string; start: number; end: number };
            const durationMin = Math.ceil(playlist.totalDurationSeconds / 60)
            const candidates: Candidate[] = [];

            // Сбор «кандидатов» по выбранным экранам, дням и режиму рекламы
            for (const screenId of selectedScreens) {
                for (const dayShort of selectedDays) {
                    const week = getCurrentWeekByDate(selectedDate);
                    const dateObj = parseDayToDate(dayShort, week);
                    const isoDate = dateObj.toISOString().slice(0, 10);

                    if (advertisementShowMode === 'minutes') {
                        let cursor = newStart;
                        while (cursor + durationMin <= newEnd) {
                            candidates.push({screenId, date: isoDate, start: cursor, end: cursor + durationMin});
                            cursor += advertisementIntervalMinutes;
                        }
                    } else if (advertisementShowMode === 'hours') {
                        let cursor = newStart;
                        const step = advertisementIntervalHours * 60;
                        while (cursor + durationMin <= newEnd) {
                            candidates.push({screenId, date: isoDate, start: cursor, end: cursor + durationMin});
                            cursor += step;
                        }
                    } else {
                        // specific times
                        advertisementSpecificTimes.forEach(hhmm => {
                            const m = timeToMinutes(hhmm);
                            if (m >= newStart && m + durationMin <= newEnd) {
                                candidates.push({screenId, date: isoDate, start: m, end: m + durationMin});
                            }
                        });
                    }
                }
            }

            // Проверка каждого кандидата на пересечение с уже существующими рекламными слотами
            for (const {screenId, date, start, end} of candidates) {
                const existing = (isFixedSchedule
                        ? scheduledFixedMap[screenId] ?? []
                        : scheduledCalendarMap[screenId] ?? []
                ).filter(b => b.priority === 100);

                const conflict = existing.find(b => {
                    const sameDay = isFixedSchedule
                        ? b.dayOfWeek === WEEK_DAYS[RU_DAYS.indexOf(date.slice(8, 10))]
                        : b.startDate === date;
                    if (!sameDay) return false;
                    const existStart = timeToMinutes(b.startTime);
                    const existEnd = timeToMinutes(b.endTime);
                    return (start < existEnd && existStart < end);
                });

                if (conflict) {
                    const name = allScreens.find(s => s.id === screenId)?.name ?? screenId;
                    window.alert(
                        `На экране «${name}» рекламный слот пересекается с ` +
                        `${conflict.startTime}–${conflict.endTime} в ${date}.`
                    );
                    return;
                }
            }
        }

        // Всё чисто — добавляем
        addBlock();
    };

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
                            <DatePicker
                                selected={selectedDate}
                                onChange={date => onDateSelected(date!)}
                                inline // 👈 Показывает сразу весь календарь
                                dateFormat="dd.MM.yyyy"
                                locale={ru}
                            />
                        </motion.div>

                    )}

                    <motion.div layout>
                        <Card>
                            <Card.Header>Когда показывать</Card.Header>
                            <Card.Body>
                                {/* Время */}

                                <InputGroup className={"mb-3"} style={{maxWidth: 300}}>
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


                            </Card.Body>
                        </Card>
                    </motion.div>

                    {/* Как показывать */}
                    <motion.div layout>
                        <Card>
                            <Card.Header>Тип слотов</Card.Header>
                            <Card.Body>

                                <Form.Group>
                                    <div className="d-flex gap-3 flex-row">
                                        <Form.Check
                                            inline
                                            type="checkbox"
                                            id="mode-playlist"
                                            name="typeMode"
                                            label="Обычный слот"
                                            checked={typeMode === 'PLAYLIST'}
                                            onChange={() => {
                                                setTypeMode('PLAYLIST')
                                            }}
                                        />
                                        <Form.Check
                                            inline
                                            type="checkbox"
                                            id="mode-advertisement"
                                            name="typeMode"
                                            label="Реклама"
                                            checked={typeMode === 'ADVERTISEMENT'}
                                            onChange={() => {
                                                setTypeMode('ADVERTISEMENT')
                                            }}
                                        />
                                    </div>
                                </Form.Group>
                            </Card.Body>

                            <Card.Header className="border-top">Как показывать</Card.Header>
                            <Card.Body>
                                {typeMode === 'PLAYLIST' ? (
                                    <Form.Group>
                                        <div className="d-flex gap-3 flex-row justify-content-around">
                                            <Form.Check inline type="checkbox" label="Один раз"
                                                        checked={showMode === 'once'}
                                                        onChange={() => setShowMode('once')}/>
                                            <Form.Check inline type="checkbox" label="Зациклено"
                                                        checked={showMode === 'cycle'}
                                                        onChange={() => setShowMode('cycle')}/>
                                        </div>
                                    </Form.Group>

                                ) : (
                                    <>
                                        <Form.Check inline type="checkbox" label="Раз в N минут"
                                                    checked={advertisementShowMode === 'minutes'}
                                                    onChange={() => setAdvertisementShowMode('minutes')}/>

                                        <Form.Check inline type="checkbox" label="Раз в N часов"
                                                    checked={advertisementShowMode === 'hours'}
                                                    onChange={() => setAdvertisementShowMode('hours')}/>

                                        <Form.Check inline type="checkbox" label="Раз в определённые часы"
                                                    checked={advertisementShowMode === 'specific'}
                                                    onChange={() => setAdvertisementShowMode('specific')}/>

                                    </>
                                )}


                                <div className="d-flex justify-content-center align-content-center">
                                    {/* инпуты под каждой опцией */}
                                    {typeMode === 'ADVERTISEMENT' && (
                                        <div className="mt-3">
                                            {advertisementShowMode === 'minutes' && (
                                                <InputGroup style={{maxWidth: 300}} className="mb-2">
                                                    <InputGroup.Text>Интервал, мин</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        value={advertisementIntervalMinutes}
                                                        onChange={e => setAdvertisementIntervalMinutes(+e.target.value)}
                                                    />
                                                </InputGroup>
                                            )}

                                            {advertisementShowMode === 'hours' && (
                                                <InputGroup style={{maxWidth: 300}} className="mb-2">
                                                    <InputGroup.Text>Интервал, ч</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        value={advertisementIntervalHours}
                                                        onChange={e => setAdvertisementIntervalHours(+e.target.value)}
                                                    />
                                                </InputGroup>
                                            )}

                                            {advertisementShowMode === 'specific' && (
                                                <>

                                                    <div className="d-flex justify-content-center align-content-center">
                                                        <Form.Select
                                                            style={{marginRight: 12, maxWidth: 150}}
                                                            value={pendingTime}
                                                            onChange={e => setPendingTime(e.target.value)}
                                                        >
                                                            {Array.from({length: 24}, (_, i) => {
                                                                const hh = String(i).padStart(2, '0') + ':00';
                                                                return (
                                                                    // опция будет отключена, если час меньше startTime или больше endTime
                                                                    <option key={hh} value={hh}
                                                                            disabled={hh < startTime || hh >= endTime}>
                                                                        {hh}
                                                                    </option>
                                                                )
                                                            })}
                                                        </Form.Select>
                                                        <Button
                                                            style={{width: 220}}
                                                            disabled={pendingTime < startTime || pendingTime > endTime}
                                                            onClick={() => addAdvertisementSpecificTime(pendingTime)}
                                                        >
                                                            Добавить
                                                        </Button>
                                                    </div>

                                                    <ListGroup style={{maxWidth: 200}} className="mb-2">
                                                        {advertisementSpecificTimes.map(t => (
                                                            <ListGroup.Item key={t}
                                                                            className="d-flex justify-content-between">
                                                                {t}
                                                                <Button

                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => removeAdvertisementSpecificTime(t)}
                                                                >
                                                                    &times;
                                                                </Button>
                                                            </ListGroup.Item>
                                                        ))}
                                                    </ListGroup>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </motion.div>
                    <motion.div layout>
                        <Card>
                            <Card.Header>Что показывать</Card.Header>
                            <Card.Body>

                                <div className="d-flex flex-row justify-content-center align-content-center gap-3">
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

                                    <Col
                                        className="d-flex flex-column justify-content-center align-content-center text-center"
                                        xs="auto">
                                        {typeMode !== "ADVERTISEMENT" ? (
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
                                                <span
                                                    className="d-flex flex-column justify-content-center align-content-center text-center">Высокий приоритет</span>
                                            )
                                        }

                                    </Col>
                                </div>


                            </Card.Body>

                            <Card.Header className="border-top">Где показывать</Card.Header>
                            <Card.Body>
                                <div className="d-flex flex-row justify-content-lg-evenly align-content-center gap-3">
                                    <Col xs="auto">
                                        {allScreens.length === 0 ? (
                                            // если экранов нет — обычная кнопка, которая открывает модалку
                                            <Button variant="secondary" onClick={handleScreensToggle}>
                                                Экраны
                                            </Button>
                                        ) : (
                                            // если экраны есть — полноценный дропдаун
                                            <Dropdown autoClose="outside">
                                                <Dropdown.Toggle
                                                    style={{paddingLeft: 40, paddingRight: 40}}>Экраны</Dropdown.Toggle>
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
                                        <Button
                                            variant="success"
                                            onClick={handleAdd}
                                            style={{paddingLeft: 40, paddingRight: 40}}
                                            disabled={selectedScreens.length === 0 || !selectedPlaylist}
                                        >
                                            Добавить
                                        </Button>
                                    </Col>
                                </div>
                            </Card.Body>
                        </Card>
                    </motion.div>

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

