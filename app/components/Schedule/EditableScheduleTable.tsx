'use client'
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {generateTimeSlots, WEEK_DAYS} from '@/app/lib/scheduleUtils'
import {ScheduledBlock} from "@/public/types/interfaces";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {Button, Dropdown, Form, InputGroup, Modal} from "react-bootstrap";
import type {ShowMode} from '@/app/store/scheduleStore'
// подготавливаем метаданные для позиционирования
type Meta = {
    screenId: string
    block: ScheduledBlock
    dayIndex: number
    startRow: number
    endRow: number
}

export default function EditableScheduleTable() {
    const {
        currentWeek,
        isFixedSchedule,
        scheduledFixedMap,
        scheduledCalendarMap,
        hoveredBlock,
        setHoveredBlock,
        removeBlock,
        selectedScreens,
        addEditedBlock,
        showMode
    } = useScheduleStore()
    const {allScreens} = useScreensStore()
    const {playlistItems} = usePlaylistStore()

    const times = generateTimeSlots('00:00', '23:30', 30)
    const step = 30

    const allMeta: Meta[] = []

    for (const screenId of selectedScreens) {
        const blocks = isFixedSchedule
            ? scheduledFixedMap[screenId] ?? []
            : (scheduledCalendarMap[screenId] ?? []).filter(b =>
                currentWeek.map(d => d.toISOString().slice(0, 10)).includes(b.startDate!)
            )

        for (const b of blocks) {
            const dayIndex = isFixedSchedule
                ? WEEK_DAYS.indexOf(b.dayOfWeek)
                : currentWeek.findIndex(d => d.toISOString().slice(0, 10) === b.startDate)

            const [h0, m0] = b.startTime.split(':').map(Number)
            const [h1, m1] = b.endTime.split(':').map(Number)
            const startMin = h0 * 60 + m0
            const endMin = h1 * 60 + m1

            allMeta.push({
                screenId,
                block: b,
                dayIndex,
                startRow: startMin / step,
                endRow: endMin / step,
            })
        }
    }
    // для позиционирования
    const tableRef = useRef<HTMLTableElement>(null)
    const [headerH, setHeaderH] = useState(0)
    const [slotH, setSlotH] = useState(0)
    useLayoutEffect(() => {
        if (!tableRef.current) return
        const thead = tableRef.current.querySelector('thead')
        if (thead) setHeaderH(thead.getBoundingClientRect().height)
        const firstRow = tableRef.current.querySelector('tbody tr')
        if (firstRow) setSlotH(firstRow.getBoundingClientRect().height)
    }, [])

    const totalCols = currentWeek.length + 1
    const colWidth = 100 / totalCols

    const screenColors = [
        '#4dabf7',  // ярко-синий
        '#20c997',  // мятный
        '#ff922b',  // оранжево-персиковый
        '#845ef7',  // фиолетовый
        '#f06595',  // малиновый
        '#339af0',  // светло-синий
        '#51cf66',  // травянисто-зелёный
        '#fcc419',  // жёлто-золотой
        '#ff6b6b',  // кораллово-красный
        '#3bc9db',  // бирюзово-голубой
        '#d0bfff',  // нежно-сиреневый
        '#a9e34b',  // лаймово-зелёный
    ]


    //модалка таймслота
    const [editingMeta, setEditingMeta] = useState<Meta | null>(null)
    const [editStart, setEditStart] = useState('')
    const [editEnd, setEditEnd] = useState('')
    const [editPlaylist, setEditPlaylist] = useState('')
    const [editPriority, setEditPriority] = useState(1)
    const [editScreens, setEditScreens] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [editShowMode, setEditShowMode] = useState<ShowMode>('cycle')
    const [editInterval, setEditInterval] = useState<number>(0)
    const [editPause, setEditPause] = useState<number>(0)

// при открытии модалки инициализировать:
    useEffect(() => {
        if (!editingMeta) return
        const b = editingMeta.block

        // базовые поля
        setEditStart(b.startTime.slice(0, 5))
        setEditEnd(b.endTime.slice(0, 5))
        setEditPlaylist(b.playlistId)
        setEditPriority(b.priority)
        setEditScreens([editingMeta.screenId])
        setError(null)

        // определяем showMode
        const hasInterval =
            b.repeatIntervalMinutes != null && b.durationMinutes != null

        if (!b.isRecurring && !hasInterval) {
            setEditShowMode('once')
            setEditPause(0)
            setEditInterval(0)

        } else if (hasInterval) {
            setEditShowMode('repeatInterval')
            setEditPause(b.repeatIntervalMinutes!!)
            setEditInterval(b.durationMinutes!!)

        } else {
            setEditShowMode('cycle')
            setEditPause(0)
            setEditInterval(0)
        }
    }, [editingMeta])

    // переключатель экрана
    const toggleEditScreen = (screenId: string) => {
        setEditScreens(prev =>
            prev.includes(screenId)
                ? prev.filter(id => id !== screenId)
                : [...prev, screenId]
        )
    }

    // чистая проверка без сообщений
    const canSave = () => {
        if (!editingMeta) return false
        if (!editStart || !editEnd) return false
        if (editStart >= editEnd) return false
        if (!playlistItems.some(p => p.id === editPlaylist)) return false
        if (editScreens.length === 0) return false

        return true
    }

    // валидация
    const validateAndSetError = (): boolean => {
        setError(null);
        if (!editingMeta) {
            setError('Нечего сохранять');
            return false;
        }
        if (!editStart || !editEnd) {
            setError('Введите время');
            return false;
        }
        if (editStart >= editEnd) {
            setError('Начало должно быть раньше конца');
            return false;
        }
        if (!playlistItems.some(p => p.id === editPlaylist)) {
            setError('Выберите плейлист');
            return false;
        }
        if (editScreens.length === 0) {
            setError('Выберите экран(ы)');
            return false;
        }

        // валидация приоритета для режимов once и cycle
        if (editShowMode !== 'repeatInterval') {
            const store = useScheduleStore.getState()
            const mapKey = store.isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap'

            for (const screenId of editScreens) {
                const existing = (store as any)[mapKey][screenId] as ScheduledBlock[] | undefined
                if (!existing) continue

                const dupe = existing.find(b =>
                    // не сравниваем с тем блоком, который редактируем
                    b !== editingMeta.block &&
                    // для календарных слотов — сравниваем дату
                    (store.isFixedSchedule
                        ? b.dayOfWeek === editingMeta.block.dayOfWeek
                        : b.startDate === editingMeta.block.startDate) &&
                    // и время/приоритет
                    b.startTime.slice(0, 5) === editStart &&
                    b.endTime.slice(0, 5) === editEnd &&
                    b.priority === editPriority
                )

                if (dupe) {
                    setError(
                        `На экране уже есть слот в ${
                            store.isFixedSchedule
                                ? `день ${dupe.dayOfWeek}`
                                : `дату ${dupe.startDate}`
                        } с ${editStart}–${editEnd} и приоритетом ${editPriority}`
                    )
                    return false
                }
            }
        }

        return true;
    };

    // сохранить изменения таймслота
    const onSave = () => {
        if (!validateAndSetError()) return
        removeBlock(editingMeta!.screenId, editingMeta!.block)
        editScreens.forEach(screenId =>
            addEditedBlock(screenId, {
                ...editingMeta!.block,
                startTime: editStart + ':00',
                endTime: editEnd + ':00',
                playlistId: editPlaylist,
                priority: editPriority,
                isRecurring: editShowMode === 'cycle',
                repeatIntervalMinutes: editShowMode === 'repeatInterval' ? editPause : undefined,
                durationMinutes: editShowMode === 'repeatInterval' ? editInterval : undefined,
            })
        )
        setEditingMeta(null)
    }
    return (
        <div style={{position: 'relative', overflowX: 'auto'}}>
            {/* Таблица */}
            <table
                ref={tableRef}
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                }}
            >
                <thead>
                <tr>
                    <th style={headerCell()}>Время</th>
                    {currentWeek.map((d, i) => (
                        <th key={i} style={headerCell()}>
                            {isFixedSchedule
                                ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i]
                                : `${['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i]} ${d.getDate()}`}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {times.map(t => (
                    <tr key={t}>
                        <td style={timeCell()}>{t}</td>
                        {currentWeek.map((_, ci) => (
                            <td key={ci} style={slotCell()}/>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Блоки поверх таблицы */}
            {allMeta.map((m, i) => {
                // находим все пересекающиеся с этим блоки
                const group = allMeta.filter(x =>
                    x.dayIndex === m.dayIndex &&
                    x.startRow < m.endRow &&
                    m.startRow < x.endRow
                )
                const idx = group.findIndex(x => x.screenId === m.screenId && x.block === m.block)
                const size = group.length

                const left = (1 + m.dayIndex + idx / size) * colWidth
                const width = colWidth / size
                const top = headerH + m.startRow * slotH
                const height = (m.endRow - m.startRow) * slotH

                const playlistName = playlistItems.find(p => p.id === m.block.playlistId)?.name
                    ?? m.block.playlistId

                const screenName = allScreens.find(s => s.id === m.screenId)?.name
                    ?? m.screenId

                // Определяем цвет по screenId
                const screenColorsMap = new Map<string, string>()

                allScreens.forEach((screen, index) => {
                    const color = screenColors[index % screenColors.length]
                    screenColorsMap.set(screen.id, color)
                })

                const backgroundColor = screenColorsMap.get(m.screenId) ?? '#cccccc'

                return (
                    <div
                        key={`${m.screenId}-${i}`}
                        style={{
                            position: 'absolute',
                            top,
                            left: `${left}%`,
                            width: `${width}%`,
                            height,
                            backgroundColor: backgroundColor,
                            borderRadius: 4,
                            padding: '4px 2px',
                            border: '1px solid #fff',
                            boxSizing: 'border-box',
                            fontSize: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                        }}
                        onMouseEnter={() => setHoveredBlock(m.block)}
                        onMouseLeave={() => setHoveredBlock(null)}
                        onClick={() => setEditingMeta(m)}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                marginBottom: 2,
                                width: '100%',
                                textAlign: 'center',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {screenName}
                        </div>

                        <div
                            style={{
                                flexGrow: 1,
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}
                        >
            <span
                style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                }}
            >
                {playlistName}
            </span>
                        </div>

                        {hoveredBlock === m.block && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeBlock(m.screenId, m.block)
                                }}
                                style={removeCircle()}
                            >
                ×
            </span>
                        )}
                    </div>
                )
            })}


            {/* --- МОДАЛКА РЕДАКТИРОВАНИЯ ТАЙМСЛОТА --- */}
            <Modal show={!!editingMeta} onHide={() => setEditingMeta(null)} centered>
                <Modal.Header className="border-0" closeButton>
                    <Modal.Title>Редактировать слот</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="text-danger mb-2">{error}</div>}

                    <Form>


                        <Form.Group style={{display: "flex", justifyContent: "center"}} className="mb-3">
                            <div className="d-flex gap-3">
                                <Form.Check
                                    inline
                                    type="checkbox"
                                    id="mode-once"
                                    name="editShowMode"
                                    label="Один раз"
                                    checked={editShowMode === 'once'}
                                    onChange={() => {
                                        setEditShowMode('once');
                                        setEditPause(0);
                                        setEditInterval(0);
                                    }}
                                />
                                <Form.Check
                                    inline
                                    type="checkbox"
                                    id="mode-cycle"
                                    name="editShowMode"
                                    label="Зациклено"
                                    checked={editShowMode === 'cycle'}
                                    onChange={() => {
                                        setEditShowMode('cycle');
                                        setEditPause(0);
                                        setEditInterval(0);
                                    }}
                                />
                                <Form.Check
                                    inline
                                    type="checkbox"
                                    id="edit-mode-repeat"
                                    name="editShowMode"
                                    label="Играть X мин, пауза Y мин"
                                    checked={editShowMode === 'repeatInterval'}
                                    onChange={() => setEditShowMode('repeatInterval')}
                                />
                            </div>

                        </Form.Group>

                        {editShowMode === 'repeatInterval' && (
                            <div className="d-flex justify-content-center gap-3 ps-4 mb-3">
                                <InputGroup style={{width: 200}}>
                                    <InputGroup.Text>Играть</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        value={editInterval}
                                        onChange={e => setEditInterval(+e.target.value)}
                                    />
                                    <InputGroup.Text>мин</InputGroup.Text>
                                </InputGroup>
                                <InputGroup style={{width: 200}}>
                                    <InputGroup.Text>Пауза</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        value={editPause}
                                        onChange={e => setEditPause(+e.target.value)}
                                    />
                                    <InputGroup.Text>мин</InputGroup.Text>
                                </InputGroup>
                            </div>
                        )}


                        <Form.Group className="mb-3">
                            <Form.Label>Время с</Form.Label>
                            <Form.Control
                                type="time"
                                value={editStart}
                                onChange={e => setEditStart(e.target.value)}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>До</Form.Label>
                            <Form.Control
                                type="time"
                                value={editEnd}
                                onChange={e => setEditEnd(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Экраны</Form.Label>
                            <Form.Select
                                multiple
                                value={editScreens}
                                onChange={e => {
                                    const opts = Array.from(e.target.selectedOptions)
                                        .map(opt => opt.value)
                                    setEditScreens(opts)
                                }}
                                style={{height: 100}} // можно подогнать высоту
                            >
                                {allScreens.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Плейлист</Form.Label>
                            <Form.Select
                                value={editPlaylist}
                                onChange={e => setEditPlaylist(e.target.value)}
                            >
                                {playlistItems.map(pl => (
                                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        {editShowMode !== 'repeatInterval' ? (
                                <Form.Group className="mb-3">
                                    <Form.Label>Приоритет</Form.Label>
                                    <Form.Select
                                        value={editPriority}
                                        onChange={e => setEditPriority(Number(e.target.value))}
                                    >
                                        {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            )
                            :
                            (
                                <span>Высокий приоритет</span>
                            )
                        }


                    </Form>
                    <div style={{display: "flex", justifyContent: "end"}}>

                    </div>
                </Modal.Body>
                <Modal.Footer style={{display: "flex", justifyContent: "center", paddingBottom: 20, paddingTop: 0,}}
                              className="gap-4 border-0">

                    <Button
                        variant="primary"
                        onClick={onSave}
                        disabled={!editingMeta || !canSave()}
                    >
                        Сохранить
                    </Button>

                    <Button
                        variant="danger"
                        onClick={() => {
                            removeBlock(editingMeta!.screenId, editingMeta!.block)
                            setEditingMeta(null)
                        }}
                    >
                        Удалить слот
                    </Button>

                    {/*<Button variant="secondary" onClick={() => setEditingMeta(null)}>*/}
                    {/*    Отмена*/}
                    {/*</Button>*/}
                </Modal.Footer>
            </Modal>
        </div>
    )
}


function removeCircle(): React.CSSProperties {
    return {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 16,
        height: 16,
        backgroundColor: 'red',
        color: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        cursor: 'pointer',
    }
}

function headerCell(): React.CSSProperties {
    return {
        backgroundColor: '#f0f0f0',
        border: '1px solid #ddd',
        padding: 4,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 12,
    }
}

function timeCell(): React.CSSProperties {
    return {
        backgroundColor: '#fafafa',
        border: '1px solid #eee',
        padding: '4px',
        fontSize: 12,
        textAlign: 'center',
        width: '12.5%',
    }
}

function slotCell(): React.CSSProperties {
    return {
        border: '1px solid #eee',
        width: '12.5%',
        height: 20,
        padding: 0,
    }
}