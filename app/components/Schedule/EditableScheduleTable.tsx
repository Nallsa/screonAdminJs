'use client'
import React, {useLayoutEffect, useRef, useState} from 'react'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {generateTimeSlots, WEEK_DAYS} from '@/app/lib/scheduleUtils'
import {ScheduledBlock} from "@/public/types/interfaces";
import {usePlaylistStore} from "@/app/store/playlistStore";


export default function EditableScheduleTable() {
    const {
        currentWeek,
        isFixedSchedule,
        scheduledItemsFixed,
        scheduledItemsCalendar,
        hoveredBlock,
        setHoveredBlock,
        removeBlock,
    } = useScheduleStore()

    const {playlistItems} = usePlaylistStore()
    const times = generateTimeSlots('00:00', '23:30', 30)

    // блоки на рендер
    const visible = isFixedSchedule
        ? scheduledItemsFixed
        : scheduledItemsCalendar.filter(b =>
            currentWeek
                .map(d => d.toISOString().slice(0, 10))
                .includes(b.startDate!)
        )

    // мета-инфа столбец и ряды
    type Meta = {
        block: ScheduledBlock
        dayIndex: number
        startRow: number
        endRow: number
    }
    const step = 30

    const meta: Meta[] = visible.map(b => {
        // вычисляем индекс дня недели
        const dayIndex = isFixedSchedule
            // для фиксированного: по перечислению MONDAY→0, … , SUNDAY→6
            ? WEEK_DAYS.indexOf(b.dayOfWeek)
            // для календарного: по дате в startDate
            : currentWeek.findIndex(
                d => d.toISOString().slice(0, 10) === b.startDate
            )

        // парсим часы и минуты
        const [h0, m0] = b.startTime.split(':').map(Number)
        const [h1, m1] = b.endTime.split(':').map(Number)

        // переводим в минуты от полуночи
        const startMin = h0 * 60 + m0
        const endMin = h1 * 60 + m1

        // дробная строка — может быть нецелой
        const startRow = startMin / step
        const endRow = endMin / step

        return {block: b, dayIndex, startRow, endRow}
    })

    const tableRef = useRef<HTMLTableElement>(null)
    const [headerH, setHeaderH] = useState(0)
    const [slotH, setSlotH] = useState(0)


    useLayoutEffect(() => {
        if (!tableRef.current) return
        // высота шапки
        const thead = tableRef.current.querySelector('thead')
        if (thead) setHeaderH(thead.getBoundingClientRect().height)

        // высота одной строки (берём первый <tr> tbody)
        const firstRow = tableRef.current.querySelector('tbody tr')
        if (firstRow) setSlotH(firstRow.getBoundingClientRect().height)
    }, [])

    return (
        <div style={{position: 'relative', overflowX: 'auto'}}>
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

            {/* блоки поверх таблицы */}
            {meta.map((m, i) => {

                // группа, индекс внутри неё, количество
                const group = meta.filter(x => x.dayIndex === m.dayIndex
                    && x.startRow < m.endRow && m.startRow < x.endRow)
                const idx = group.findIndex(x => x.block === m.block)
                const groupSize = group.length

                // стили колонки
                const cols = currentWeek.length + 1
                const colWidth = 100 / cols
                const left = (1 + m.dayIndex + idx / groupSize) * colWidth
                const width = colWidth / groupSize

                // позиционирование по вертикали
                const top = headerH + m.startRow * slotH
                const height = (m.endRow - m.startRow) * slotH

                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            top,
                            left: `${left}%`,
                            width: `${width}%`,
                            height,
                            backgroundColor: '#c7dcb1',
                            borderRadius: 4,
                            padding: '4px 2px',
                            border: '1px solid #fff',
                            boxSizing: 'border-box',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                        }}
                        onMouseEnter={() => setHoveredBlock(m.block)}
                        onMouseLeave={() => setHoveredBlock(null)}
                    >
                        {
                            playlistItems.find(p => p.id === m.block.playlistId)?.name
                            ?? m.block.playlistId
                        }
                        {hoveredBlock === m.block && (
                            <span
                                onClick={() => removeBlock(m.block)}
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