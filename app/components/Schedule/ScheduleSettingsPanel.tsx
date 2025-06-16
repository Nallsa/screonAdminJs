// app/components/Schedule/ScheduleSettingsPanel.tsx
'use client'
import React from 'react'
import {Form, Button, Dropdown, InputGroup} from 'react-bootstrap'
import {getCurrentWeekByDate, parseDayToDate, RU_DAYS, timeToMinutes} from '@/app/lib/scheduleUtils'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {motion, LayoutGroup} from 'framer-motion'


export default function ScheduleSettingsPanel() {
    const {
        selectedDate,
        onDateSelected,
        isPlayConstantly,
        togglePlayConstantly,
        isFixedSchedule,
        toggleFixedSchedule,
        isShowBackground,
        toggleShowBackground,
        playlists,
        selectedPlaylist,
        setSelectedPlaylist,
        startTime,
        endTime,
        setStartTime,
        setEndTime,
        selectedDays,
        toggleDay,
        addBlock,
        scheduledItemsFixed,
        scheduledItemsCalendar,
    } = useScheduleStore()


    const handleAdd = () => {
        const targetList = isFixedSchedule
            ? scheduledItemsFixed
            : scheduledItemsCalendar


        const newStart = timeToMinutes(startTime)
        const newEnd = timeToMinutes(endTime)

        for (const dayShort of selectedDays) {

            const dayDate = parseDayToDate(
                dayShort,
                getCurrentWeekByDate(selectedDate)
            ).toISOString().slice(0, 10)


            const conflict = targetList.find(b => {
                if (b.day !== dayDate) return false
                if (b.playlist !== selectedPlaylist) return false

                const existStart = timeToMinutes(b.start)
                const existEnd = timeToMinutes(b.end)


                return newStart < existEnd && existStart < newEnd
            })

            if (conflict) {
                window.alert(
                    `Плейлист "${selectedPlaylist}" уже назначен в ${dayShort} ` +
                    `с ${conflict.start} до ${conflict.end}.`
                )
                return
            }
        }

        // Если ни для одного дня нет конфликта — добавляем блок
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
                                value={selectedDate.toISOString().slice(0, 10)}
                                onChange={e => onDateSelected(new Date(e.target.value))}
                            />
                        </motion.div>
                    )}

                    <motion.div layout>
                        <Form.Check
                            inline
                            label="Зациклено"
                            type="checkbox"
                            checked={isPlayConstantly}
                            onChange={togglePlayConstantly}
                        />
                    </motion.div>

                    <motion.div layout>
                        <Form.Check
                            inline
                            label="Фикс. расписание"
                            type="checkbox"
                            checked={isFixedSchedule}
                            onChange={toggleFixedSchedule}
                        />
                    </motion.div>

                    <motion.div layout>
                        <Form.Check
                            inline
                            label="Фон. видео"
                            type="checkbox"
                            checked={isShowBackground}
                            onChange={toggleShowBackground}
                        />
                    </motion.div>

                    <motion.div layout>
                        <InputGroup style={{maxWidth: 300}}>
                            <InputGroup.Text>С</InputGroup.Text>
                            <Form.Control
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                            />
                            <InputGroup.Text>До</InputGroup.Text>
                            <Form.Control
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                            />
                        </InputGroup>
                    </motion.div>

                    <motion.div layout>
                        <Dropdown onSelect={k => setSelectedPlaylist(k!)}>
                            <Dropdown.Toggle>{selectedPlaylist}</Dropdown.Toggle>
                            <Dropdown.Menu>
                                {playlists.map(pl => (
                                    <Dropdown.Item key={pl} eventKey={pl}>
                                        {pl}
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown>
                    </motion.div>

                    <motion.div layout style={{display: 'flex', gap: 8}}>
                        {RU_DAYS.map(d => (
                            <motion.div layout key={d}>
                                <Button
                                    size="sm"
                                    variant={selectedDays.includes(d) ? 'success' : 'outline-secondary'}
                                    onClick={() => toggleDay(d)}
                                >
                                    {d}
                                </Button>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div layout>
                        <Button onClick={handleAdd}>Добавить</Button>
                    </motion.div>
                </motion.div>
            </LayoutGroup>
        </>
    )
}
