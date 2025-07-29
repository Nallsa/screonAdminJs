'use client'
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'
import type {ShowMode} from '@/app/store/scheduleStore'
import {TypeMode, useScheduleStore} from '@/app/store/scheduleStore'
import {generateTimeSlots, timeToMinutes, WEEK_DAYS} from '@/app/lib/scheduleUtils'
import {ScheduledBlock} from "@/public/types/interfaces";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {Button, Form, Modal} from "react-bootstrap";
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

    //  стейты для выбора внутри модалки
    const [editTypeMode, setEditTypeMode] = useState<TypeMode>('PLAYLIST')
    const [editShowMode, setEditShowMode] = useState<ShowMode>('once')


    // инициализация при открытии
    useEffect(() => {
        if (!editingMeta) return
        const b = editingMeta.block
        setEditStart(b.startTime.slice(0, 5))
        setEditEnd(b.endTime.slice(0, 5))
        setEditPlaylist(b.playlistId)
        setEditPriority(b.priority)
        setEditScreens([editingMeta.screenId])
        setError(null)
        setEditTypeMode(b.type === 'ADVERTISEMENT' ? 'ADVERTISEMENT' : 'PLAYLIST')
        setEditShowMode(b.isRecurring ? 'cycle' : 'once')

    }, [editingMeta])

    useEffect(() => {
        if (!editingMeta) return;

        if (
            editTypeMode === 'ADVERTISEMENT' ||
            (editTypeMode === 'PLAYLIST' && editShowMode === 'once')
        ) {
            const pl = playlistItems.find(p => p.id === editPlaylist);
            if (!pl) return;
            // рассчитаем длительность в минутах
            const durMin = Math.ceil(pl.totalDurationSeconds / 60);

            const [h, m] = editStart.split(':').map(Number);
            let total = h * 60 + m + durMin;
            const hh = Math.floor(total / 60);
            const mm = total % 60;
            setEditEnd(
                `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
            );
        }
    }, [editTypeMode, editShowMode, editStart, editPlaylist, playlistItems, editingMeta]);

    // чистая проверка без сообщений
    const canSave = () => {
        if (!editingMeta) return false
        if (!editStart || !editEnd) return false
        if (editTypeMode === 'PLAYLIST' && editShowMode === 'cycle') {
            if (editStart >= editEnd) return false
        }
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

        const candidateStart = timeToMinutes(editStart);
        const candidateEnd = timeToMinutes(editEnd);

        if (editTypeMode === 'PLAYLIST' && editShowMode === 'once') {
            const store = useScheduleStore.getState();
            const mapKey = store.isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap';

            for (const screenId of editScreens) {
                const existing = (store as any)[mapKey][screenId] as ScheduledBlock[] | undefined;
                if (!existing) continue;
                const conflict = existing.find(b =>
                    // пропускаем то же самое
                    b !== editingMeta!.block &&
                    // совпадение дня или даты
                    (store.isFixedSchedule
                        ? b.dayOfWeek === editingMeta!.block.dayOfWeek
                        : b.startDate === editingMeta!.block.startDate) &&
                    // пересечение по времени
                    !(candidateEnd <= timeToMinutes(b.startTime) ||
                        timeToMinutes(b.endTime) <= candidateStart) &&
                    // совпадение приоритета
                    b.priority === editPriority
                );
                if (conflict) {
                    setError(
                        `На экране уже есть слот с приоритетом ${editPriority} ` +
                        `в ${store.isFixedSchedule
                            ? `день ${conflict.dayOfWeek}`
                            : `дату ${conflict.startDate}`} ` +
                        `с ${conflict.startTime.slice(0, 5)} до ${conflict.endTime.slice(0, 5)}.`
                    );
                    return false;
                }
            }
        }

        if (editTypeMode === 'ADVERTISEMENT') {
            const store = useScheduleStore.getState()
            const mapKey = store.isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap'

            // длительность плейлиста в минутах
            const playlist = playlistItems.find(p => p.id === editPlaylist)!
            const durationMin = Math.ceil(playlist.totalDurationSeconds / 60)

            // кандидат на новое время
            const candidateStart = timeToMinutes(editStart)
            const candidateEnd = candidateStart + durationMin

            for (const screenId of editScreens) {
                let existing = (store as any)[mapKey][screenId] as ScheduledBlock[] | undefined
                if (!existing) existing = []
                // сначала уберём все, кроме рекламы, и сам редактируемый блок
                existing = existing
                    .filter(b => b.type === 'ADVERTISEMENT' && b !== editingMeta!.block)

                const conflict = existing.find(b => {
                    const sameDay = store.isFixedSchedule
                        ? b.dayOfWeek === editingMeta!.block.dayOfWeek
                        : b.startDate === editingMeta!.block.startDate
                    if (!sameDay) return false
                    const s = timeToMinutes(b.startTime)
                    const e = timeToMinutes(b.endTime)
                    // проверка пересечения [candidateStart,candidateEnd) с [s,e)
                    return !(candidateEnd <= s || e <= candidateStart)
                })

                if (conflict) {
                    setError(
                        `На экране пересекается реклама с ${conflict.startTime.slice(0, 5)}` +
                        `–${conflict.endTime.slice(0, 5)} в ${
                            store.isFixedSchedule ? `день ${conflict.dayOfWeek}` : conflict.startDate
                        }.`
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
                isRecurring: editTypeMode === 'PLAYLIST' && editShowMode === 'cycle'
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

                const isAd = m.block.type === 'ADVERTISEMENT'


                // Определяем цвет по screenId
                const screenColorsMap = new Map<string, string>()

                allScreens.forEach((screen, index) => {
                    const color = screenColors[index % screenColors.length]
                    screenColorsMap.set(screen.id, color)
                })

                const backgroundColor = screenColorsMap.get(m.screenId) ?? '#cccccc'
                const isHovered = hoveredBlock === m.block;

                return (
                    <div
                        key={`${m.screenId}-${i}`}
                        style={{
                            position: 'absolute',
                            top,
                            left: `${left}%`,
                            width: `${width}%`,
                            height,
                            minHeight: 24,
                            backgroundColor: backgroundColor,
                            borderRadius: 4,
                            padding: '4px 2px',
                            border: '1px solid #fff',
                            boxSizing: 'border-box',
                            fontSize: 9,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',

                            zIndex: isHovered ? 10 : 1,
                            boxShadow: isHovered
                                ? '0 4px 8px rgba(0,0,0,0.15)'
                                : undefined,
                            transform: isHovered
                                ? 'translateY(-4px)'
                                : undefined,
                            transition: 'all .1s ease-in-out',
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
                                justifyContent: 'center',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {isAd
                                ? `Реклама: ${screenName}`
                                : screenName
                            }
                        </div>

                        {/*            <div*/}
                        {/*                style={{*/}
                        {/*                    flexGrow: 1,*/}
                        {/*                    width: '100%',*/}
                        {/*                    display: 'flex',*/}
                        {/*                    alignItems: 'center',*/}
                        {/*                    justifyContent: 'center',*/}
                        {/*                    overflow: 'hidden',*/}
                        {/*                }}*/}
                        {/*            >*/}
                        {/*<span*/}
                        {/*    style={{*/}
                        {/*        overflow: 'hidden',*/}
                        {/*        whiteSpace: 'nowrap',*/}
                        {/*        textOverflow: 'ellipsis',*/}
                        {/*        maxWidth: '100%',*/}
                        {/*    }}*/}
                        {/*>*/}
                        {/*    {playlistName}*/}
                        {/*</span>*/}
                        {/*            </div>*/}

                        {hoveredBlock === m.block && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeBlock(m.screenId, m.block)
                                    console.log(scheduledCalendarMap, "asfasfasfasfasfasfasfasfasfasfasf")
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
                <Modal.Header closeButton><Modal.Title>Редактировать слот</Modal.Title></Modal.Header>
                <Modal.Body>
                    {error && <div className="text-danger mb-2">{error}</div>}
                    <Form>
                        {/* 1. выбор типа слота */}
                        <Form.Group className="mb-3">
                            <Form.Label>Тип слота</Form.Label>
                            <div className="d-flex gap-3">
                                <Form.Check
                                    inline type="checkbox" id="edit-type-playlist" name="editTypeMode"
                                    label="Обычный слот"
                                    checked={editTypeMode === 'PLAYLIST'}
                                    onChange={() => setEditTypeMode('PLAYLIST')}
                                />
                                <Form.Check
                                    inline type="checkbox" id="edit-type-ad" name="editTypeMode"
                                    label="Реклама"
                                    checked={editTypeMode === 'ADVERTISEMENT'}
                                    onChange={() => setEditTypeMode('ADVERTISEMENT')}
                                />
                            </div>
                        </Form.Group>

                        {/* 2.a. если обычный слот — once / cycle */}
                        {editTypeMode === 'PLAYLIST' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Режим показа</Form.Label>
                                <div className="d-flex gap-3">
                                    <Form.Check
                                        inline type="checkbox" id="edit-show-once" name="editShowMode"
                                        label="Один раз"
                                        checked={editShowMode === 'once'}
                                        onChange={() => setEditShowMode('once')}
                                    />
                                    <Form.Check
                                        inline type="checkbox" id="edit-show-cycle" name="editShowMode"
                                        label="Зациклено"
                                        checked={editShowMode === 'cycle'}
                                        onChange={() => setEditShowMode('cycle')}
                                    />
                                </div>
                            </Form.Group>
                        )}


                        {/* общие поля: время, экраны, плейлист, приоритет */}
                        <Form.Group className="mb-3">
                            <Form.Label>Время с</Form.Label>
                            <Form.Control type="time" value={editStart} onChange={e => setEditStart(e.target.value)}/>
                        </Form.Group>
                        {editTypeMode === 'PLAYLIST' && editShowMode === 'cycle' && (
                            <Form.Group className="mb-3">
                                <Form.Label>До</Form.Label>
                                <Form.Control type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}/>
                            </Form.Group>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>Экраны</Form.Label>
                            <Form.Select multiple value={editScreens} style={{height: 100}}
                                         onChange={e => {
                                             const opts = Array.from(e.target.selectedOptions).map(o => o.value)
                                             setEditScreens(opts)
                                         }}
                            >
                                {allScreens.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Плейлист</Form.Label>
                            <Form.Select value={editPlaylist} onChange={e => setEditPlaylist(e.target.value)}>
                                {playlistItems.map(pl => (
                                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        {editTypeMode === 'PLAYLIST' ? (
                            <Form.Group className="mb-3">
                                <Form.Label>Приоритет</Form.Label>
                                <Form.Select value={editPriority} onChange={e => setEditPriority(+e.target.value)}>
                                    {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        ) : (
                            <div className="mb-3">Высокий приоритет у рекламы</div>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer className="justify-content-center gap-3 border-0">
                    <Button variant="primary" onClick={onSave} disabled={!canSave()}>Сохранить</Button>
                    <Button variant="danger" onClick={() => {
                        if (editingMeta) removeBlock(editingMeta.screenId, editingMeta.block)
                        setEditingMeta(null)
                    }}>Удалить</Button>
                </Modal.Footer>
            </Modal>

        </div>
    )
}


function removeCircle(): React.CSSProperties {
    return {
        position: 'absolute',
        top: 1,
        right: 1,
        width: 14,
        height: 14,
        backgroundColor: 'red',
        color: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        textAlign: 'center',
        lineHeight: '14px',
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
        height: 45,
        padding: 0,
        fontSize: 10,
    }
}