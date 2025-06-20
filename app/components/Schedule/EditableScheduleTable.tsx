'use client'
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {generateTimeSlots, WEEK_DAYS} from '@/app/lib/scheduleUtils'
import {ScheduledBlock} from "@/public/types/interfaces";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {Dropdown} from "react-bootstrap";

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
                                onClick={() => removeBlock(m.screenId, m.block)}
                                style={removeCircle()}
                            >
                ×
            </span>
                        )}
                    </div>
                )
            })}
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