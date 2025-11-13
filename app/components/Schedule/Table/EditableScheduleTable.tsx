/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

'use client'
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import type {ShowMode} from '@/app/store/scheduleStore'
import {useScheduleStore} from '@/app/store/scheduleStore'
import {dateToIsoLocal, generateTimeSlots, timeToMinutes, WEEK_DAYS} from '@/app/lib/scheduleUtils'
import {ScheduledBlock, SplitCount, TypeMode, ZoneIndex, ZonePlaylists} from "@/public/types/interfaces";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import {Button, Form, Modal} from "react-bootstrap";
import {Grade, licenseControl} from "@/app/store/licenseStore";
import SectionsSelection from "@/app/components/Schedule/Settings/ScreenSelection/SectionsSelection";
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
        selectedGroup,
        clearDaySlots,
    } = useScheduleStore()

    const {allScreens} = useScreensStore()
    const {playlistItems} = usePlaylistStore()

    const screenBranchById = useMemo(() => {
        const map = new Map<string, string>();
        allScreens.forEach(s => map.set(s.id, s.branchId));
        return map;
    }, [allScreens]);

    const getBranchOf = (screenId: string) => screenBranchById.get(screenId);

    const times = generateTimeSlots('00:00', '23:30', 30)

    const allMeta: Meta[] = useMemo(() => {
        const stepLocal = 30; // локальная константа, не конфликтует
        const list: Meta[] = [];

        const weekDates = currentWeek.map(d => dateToIsoLocal(d));
        const screens = selectedGroup
            ? allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id)
            : selectedScreens;

        for (const screenId of screens) {
            const blocks = isFixedSchedule
                ? (scheduledFixedMap[screenId] ?? [])
                : (scheduledCalendarMap[screenId] ?? []).filter(b => weekDates.includes(b.startDate!));

            for (const b of blocks) {
                const dayIndex = isFixedSchedule
                    ? WEEK_DAYS.indexOf(b.dayOfWeek)
                    : currentWeek.findIndex(d => dateToIsoLocal(d) === b.startDate);
                if (dayIndex < 0) continue;

                const [h0, m0] = b.startTime.split(':').map(Number);
                const [h1, m1] = b.endTime.split(':').map(Number);
                const startMin = h0 * 60 + m0;
                const endMin = h1 * 60 + m1;

                list.push({
                    screenId,
                    block: b,
                    dayIndex,
                    startRow: startMin / stepLocal,
                    endRow: endMin / stepLocal,
                });
            }
        }
        return list;
    }, [
        currentWeek,
        isFixedSchedule,
        scheduledFixedMap,
        scheduledCalendarMap,
        selectedScreens,
        selectedGroup,
        allScreens,
    ]);

// 3) metasWithIdx и всё ниже оставь:
    const metasWithIdx = useMemo(
        () => allMeta.map((m, i) => ({...m, _i: i})),
        [allMeta]
    );

    const metasByDay = useMemo(() => {
        const map = new Map<number, Array<Meta & { _i: number }>>();
        for (const m of metasWithIdx) {
            if (m.dayIndex < 0) continue;
            if (!map.has(m.dayIndex)) map.set(m.dayIndex, []);
            map.get(m.dayIndex)!.push(m);
        }
        return map;
    }, [metasWithIdx]);

// считаем колонки и делители ширины для каждого дня
    const layout = useMemo(() => {
        const colByIndex = new Map<number, number>();
        const colsByIndex = new Map<number, number>();

        metasByDay.forEach((arr /*, day */) => {
            const colsMap = assignColumnsForDay(arr);
            const widthsMap = computeColsForDay(arr, colsMap);

            colsMap.forEach((v, k) => {
                colByIndex.set(k, v);
            });
            widthsMap.forEach((v, k) => {
                colsByIndex.set(k, v);
            });
        });

        return {colByIndex, colsByIndex};
    }, [metasByDay]);

    const screensForTable = useMemo(() => (
        selectedGroup
            ? allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id)
            : selectedScreens
    ), [selectedGroup, selectedScreens, allScreens])

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

    //  мобилка
    const [isMobile, setIsMobile] = useState(false)
    const [selectedDay, setSelectedDay] = useState(0)
    const dayShort = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(max-width: 1100px)')
        const onChange = () => setIsMobile(mq.matches)
        onChange()
        mq.addEventListener?.('change', onChange)
        return () => mq.removeEventListener?.('change', onChange)
    }, [])

    // по умолчанию ставим сегодня
    useEffect(() => {
        const js = new Date().getDay()
        const mondayFirst = (js + 6) % 7
        setSelectedDay(mondayFirst)
    }, [])

    //  видимые дни
    const visibleWeek = isMobile ? [currentWeek[selectedDay]].filter(Boolean) : currentWeek

    // const totalCols = currentWeek.length + 1
    const totalCols = visibleWeek.length + 1
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
    const [editSplitCount, setEditSplitCount] = useState<SplitCount>(1);
    const [editZonePlaylists, setEditZonePlaylists] = useState<ZonePlaylists>({0: null});
    const [activeZoneModal, setActiveZoneModal] = useState<ZoneIndex | null>(null);
    const [editPriority, setEditPriority] = useState(1)
    const [editScreens, setEditScreens] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)


    //  стейты для выбора внутри модалки
    const [editTypeMode, setEditTypeMode] = useState<TypeMode>('PLAYLIST')
    const [editShowMode, setEditShowMode] = useState<ShowMode>('once')

    const playlistById = useMemo(
        () => new Map(playlistItems.map(p => [p.id, p])),
        [playlistItems]
    );

// максимальная длительность среди выбранных зон в модалке
    const modalMaxDurationMin = useMemo(() => {
        let maxMin = 0;
        for (let i = 0; i < (editSplitCount === 4 ? 4 : editSplitCount === 2 ? 2 : 1); i++) {
            const id = editZonePlaylists[i as ZoneIndex];
            if (!id) continue;
            const pl = playlistById.get(id);
            if (!pl) continue;
            const mins = Math.ceil((pl.totalDurationSeconds || 0) / 60);
            if (mins > maxMin) maxMin = mins;
        }
        return maxMin;
    }, [editSplitCount, editZonePlaylists, playlistById]);

    const modalZonesComplete = useMemo(() => {
        const need = editSplitCount === 4 ? 4 : editSplitCount === 2 ? 2 : 1;
        for (let i = 0; i < need; i++) {
            if (!editZonePlaylists[i as ZoneIndex]) return false;
        }
        return true;
    }, [editSplitCount, editZonePlaylists]);


    // инициализация при открытии
    useEffect(() => {
        if (!editingMeta) return;
        const b = editingMeta.block;

        setEditStart(b.startTime.slice(0, 5));
        const end5 = b.endTime.slice(0, 5);
        setEditEnd(end5 === '24:00' ? '00:00' : end5);
        setEditPriority(b.priority);
        setEditScreens([editingMeta.screenId]);
        setError(null);
        setEditTypeMode(b.type === 'ADVERTISEMENT' ? 'ADVERTISEMENT' : 'PLAYLIST');
        setEditShowMode(b.isRecurring ? 'cycle' : 'once');

        const count = b.zoneAssignments?.count ?? 1;
        const zones = b.zoneAssignments?.zonePlaylists ?? ({0: b.playlistIds ?? null} as ZonePlaylists);

        setEditSplitCount(count as SplitCount);
        setEditZonePlaylists(zones);
        setActiveZoneModal(null);
    }, [editingMeta]);

    useEffect(() => {
        if (!editingMeta) return;

        if (
            editTypeMode === 'ADVERTISEMENT' ||
            (editTypeMode === 'PLAYLIST' && editShowMode === 'once')
        ) {
            if (modalMaxDurationMin > 0 && editStart) {
                const [h, m] = editStart.split(':').map(Number);
                const total = h * 60 + m + modalMaxDurationMin;
                const hh = Math.floor(total / 60);
                const mm = total % 60;
                setEditEnd(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
            }
        }
    }, [editTypeMode, editShowMode, editStart, modalMaxDurationMin, editingMeta]);

    const onSelectPlaylistForZoneModal = (z: ZoneIndex, idOrEmpty: string) => {
        const id = idOrEmpty || null;
        setEditZonePlaylists(prev => ({...prev, [z]: id}));
    };

    const onClearZoneModal = (z: ZoneIndex) => {
        setEditZonePlaylists(prev => ({...prev, [z]: null}));
    };

    // чистая проверка без сообщений
    const canSave = () => {
        if (!editingMeta) return false;
        if (!editStart || !editEnd) return false;

        const isFullDay = editTypeMode === 'PLAYLIST' && editShowMode === 'cycle'
            && editStart === '00:00' && editEnd === '00:00';

        if (editTypeMode === 'PLAYLIST' && editShowMode === 'cycle' && !isFullDay) {
            if (editStart >= editEnd) return false;
        }

        if (!modalZonesComplete) return false;
        if (editScreens.length === 0) return false;

        return true;
    };

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

        const candidateBranchId =
            editingMeta.block.branchId ?? getBranchOf(editScreens[0]);
        if (!candidateBranchId) {
            setError('Не удалось определить филиал для слота');
            return false;
        }
        const bad = editScreens.find(id => getBranchOf(id) !== candidateBranchId);
        if (bad) {
            setError('Нельзя смешивать экраны из разных филиалов. Выберите экраны одного филиала.');
            return false;
        }

        const isFullDay = editTypeMode === 'PLAYLIST' && editShowMode === 'cycle'
            && editStart === '00:00' && editEnd === '00:00';

        if (editTypeMode === 'PLAYLIST' && editShowMode === 'cycle' && !isFullDay) {
            if (editStart >= editEnd) {
                setError('Начало должно быть раньше конца');
                return false;
            }
        }

        // зоны должны быть заполнены
        if (!modalZonesComplete) {
            setError('Назначьте плейлисты для всех секций.');
            return false;
        }

        // при once/ADVERTISEMENT должна быть ненулевая длительность
        if (
            (editTypeMode === 'PLAYLIST' && editShowMode === 'once') ||
            editTypeMode === 'ADVERTISEMENT'
        ) {
            if (modalMaxDurationMin <= 0) {
                setError('Длительность выбранных плейлистов равна 0 мин.');
                return false;
            }
        }

        const candidateStart = timeToMinutes(editStart);
        const candidateEnd = editTypeMode === 'ADVERTISEMENT' || (editTypeMode === 'PLAYLIST' && editShowMode === 'once')
            ? candidateStart + modalMaxDurationMin
            : timeToMinutes(editEnd);

        if (editTypeMode === 'PLAYLIST' && editShowMode === 'once') {
            const store = useScheduleStore.getState();
            const mapKey = store.isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap';

            for (const screenId of editScreens) {
                const existing = (store as any)[mapKey][screenId] as ScheduledBlock[] | undefined;
                if (!existing) continue;
                const conflict = existing.find(b =>
                    b !== editingMeta!.block &&
                    (store.isFixedSchedule
                        ? b.dayOfWeek === editingMeta!.block.dayOfWeek
                        : b.startDate === editingMeta!.block.startDate) &&
                    !(candidateEnd <= timeToMinutes(b.startTime) ||
                        timeToMinutes(b.endTime) <= candidateStart) &&
                    b.priority === editPriority &&
                    b.branchId === candidateBranchId
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
            const store = useScheduleStore.getState();
            const mapKey = store.isFixedSchedule ? 'scheduledFixedMap' : 'scheduledCalendarMap';

            for (const screenId of editScreens) {
                let existing = (store as any)[mapKey][screenId] as ScheduledBlock[] | undefined;
                if (!existing) existing = [];
                existing = existing.filter(b => b.type === 'ADVERTISEMENT' && b !== editingMeta!.block);

                const conflict = existing.find(b => {
                    const sameDay = store.isFixedSchedule
                        ? b.dayOfWeek === editingMeta!.block.dayOfWeek
                        : b.startDate === editingMeta!.block.startDate;
                    if (!sameDay) return false;
                    if (b.branchId !== candidateBranchId) return false;
                    const s = timeToMinutes(b.startTime);
                    const e = timeToMinutes(b.endTime);
                    return !(candidateEnd <= s || e <= candidateStart);
                });

                if (conflict) {
                    setError(
                        `На экране пересекается реклама с ${conflict.startTime.slice(0, 5)}–${conflict.endTime.slice(0, 5)} ` +
                        `${store.isFixedSchedule ? `в день ${conflict.dayOfWeek}` : `в ${conflict.startDate}`}.`
                    );
                    return false;
                }
            }
        }

        return true;
    };

    // сохранить изменения таймслота
    const onSave = () => {
        if (!validateAndSetError()) return;

        const isFullDay = editTypeMode === 'PLAYLIST' && editShowMode === 'cycle'
            && editStart === '00:00' && editEnd === '00:00';

        const startStr = `${editStart}:00`;
        const endStr =
            isFullDay
                ? '24:00:00'
                : (editTypeMode === 'ADVERTISEMENT' || (editTypeMode === 'PLAYLIST' && editShowMode === 'once'))
                    ? (() => {
                        // «once/adv»: длина = max длительность зон
                        const [h, m] = editStart.split(':').map(Number);
                        const total = h * 60 + m + Math.max(1, modalMaxDurationMin);
                        const hh = Math.floor(total / 60);
                        const mm = total % 60;
                        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
                    })()
                    : `${editEnd}:00`;
        

        // удалить старый блок
        removeBlock(editingMeta!.screenId, editingMeta!.block);

// подготовить локальные зоны/плейлисты для нового слота
        const zoneAssignments = {
            count: editSplitCount,
            zonePlaylists: editZonePlaylists,
        } as const;

        const playlistIds = Array.from(
            new Set(Object.values(editZonePlaylists).filter(Boolean) as string[])
        );

// добавить обновлённый блок на выбранные экраны — ОДИН раз
        editScreens.forEach(screenId =>
            addEditedBlock(screenId, {
                ...editingMeta!.block,
                screenId, // на всякий случай
                type: editTypeMode,
                isRecurring: editTypeMode === 'PLAYLIST' && editShowMode === 'cycle',
                startTime: startStr,
                endTime: endStr,
                priority: editPriority,
                branchId: editingMeta!.block.branchId,
                zoneAssignments,
                playlistIds,
            })
        );

        setEditingMeta(null);
    };


    return (
        <div style={{position: 'relative', overflowX: 'auto'}}>
            {/* Переключатель дня — только на мобиле */}
            {isMobile && (
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <button className="btn btn-outline-secondary btn-sm"
                            onClick={() => setSelectedDay(d => d === 0 ? 6 : d - 1)}>‹
                    </button>
                    <div className="fw-semibold">
                        {dayShort[selectedDay]} {currentWeek[selectedDay]?.getDate() ?? ''}
                    </div>
                    <button className="btn btn-outline-secondary btn-sm"
                            onClick={() => setSelectedDay(d => d === 6 ? 0 : d + 1)}>›
                    </button>
                </div>
            )}

            <div style={{position: 'relative'}}>
                {/* Таблица */}
                <table
                    ref={tableRef}
                    style={{width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed'}}
                >
                    <thead>
                    <tr>
                        <th style={headerCell()}>Время</th>
                        {visibleWeek.map((d, i) => {
                            const origIdx = isMobile ? selectedDay : i
                            return (
                                <th key={origIdx} style={headerCell()}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div/>
                                        {isFixedSchedule ? dayShort[origIdx] : `${dayShort[origIdx]} ${d.getDate()}`}
                                        <button
                                            type="button"
                                            className="btn btn-sm d-inline-flex align-items-center"
                                            title="Очистить слоты этого дня"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                clearDaySlots(currentWeek[origIdx], screensForTable)
                                            }}
                                            style={{lineHeight: 1, padding: '2px 2px', borderRadius: 6}}
                                        >
                                            <i className="bi bi-x-lg" aria-hidden="true"/>
                                        </button>
                                    </div>
                                </th>
                            )
                        })}
                    </tr>
                    </thead>

                    <tbody>
                    {times.map(t => (
                        <tr key={t}>
                            <td style={timeCell()}>{t}</td>
                            {visibleWeek.map((_, i) => (
                                <td key={i} style={slotCell()}/>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>

                {/* Блоки поверх таблицы */}
                {metasWithIdx.map((m) => {
                    // индекс колонки и число колонок для этого блока
                    const idx = layout.colByIndex.get(m._i) ?? 0;
                    const cols = layout.colsByIndex.get(m._i) ?? 1;

                    const relDay = isMobile ? 0 : m.dayIndex

                    const left = (1 + relDay + idx / cols) * colWidth
                    const width = colWidth / cols

                    const top = headerH + m.startRow * slotH;
                    const height = (m.endRow - m.startRow) * slotH;

                    // const playlistName = playlistItems.find(p => p.id === m.block.playlistId)?.name ?? m.block.playlistId;
                    const screenName = allScreens.find(s => s.id === m.screenId)?.name ?? m.screenId;
                    const isAd = m.block.type === 'ADVERTISEMENT';

                    const screenColorsMap = new Map<string, string>();
                    allScreens.forEach((screen, index) => {
                        const color = screenColors[index % screenColors.length];
                        screenColorsMap.set(screen.id, color);
                    });
                    const backgroundColor = screenColorsMap.get(m.screenId) ?? '#cccccc';
                    const isHovered = hoveredBlock === m.block;

                    return (
                        <div
                            key={`${m.screenId}-${m._i}`}
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
                                justifyContent: 'flex-start', // было 'center'
                                alignItems: 'center',         // горизонтальный центр
                                paddingTop: 2,
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
                                    fontWeight: 'bold',
                                }}
                            >
                                {isAd
                                    ? `Реклама: ${screenName}`
                                    : screenName
                                }
                            </div>


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
                            {/*  выбор типа слота */}
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
                                <Form.Control type="time" value={editStart}
                                              onChange={e => setEditStart(e.target.value)}/>
                            </Form.Group>
                            {editTypeMode === 'PLAYLIST' && editShowMode === 'cycle' && (
                                <Form.Group className="mb-3">
                                    <Form.Label>До</Form.Label>
                                    <Form.Control type="time" value={editEnd}
                                                  onChange={e => setEditEnd(e.target.value)}/>
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

                                <SectionsSelection
                                    count={editSplitCount}
                                    activeZone={activeZoneModal}
                                    onChangeActive={setActiveZoneModal}
                                    zonePlaylists={editZonePlaylists}
                                    playlists={playlistItems}
                                    onSelectPlaylistForZone={onSelectPlaylistForZoneModal}
                                    onClearZone={onClearZoneModal}
                                />
                            </Form.Group>
                            {licenseControl([Grade.PRO]) &&
                                (
                                    editTypeMode === 'PLAYLIST' ? (
                                        <Form.Group className="mb-3">
                                            <Form.Label>Приоритет</Form.Label>
                                            <Form.Select value={editPriority}
                                                         onChange={e => setEditPriority(+e.target.value)}>
                                                {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    ) : (
                                        <div className="mb-3">Высокий приоритет у рекламы</div>
                                    )
                                )
                            }
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

    }
}

function slotCell(): React.CSSProperties {
    return {
        border: '1px solid #eee',

        height: 45,
        padding: 0,
        fontSize: 10,
    }
}

function rowsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
    return aStart < bEnd && bStart < aEnd;
}

// назначение колонок для слотов одного дня
function assignColumnsForDay(dayMetas: Array<Meta & { _i: number }>) {
    // сортируем по началу, затем по длительности (длинные раньше — чуть устойчивее)
    const sorted = [...dayMetas].sort((a, b) =>
        a.startRow - b.startRow || (b.endRow - b.startRow) - (a.endRow - a.startRow)
    );

    // активные интервалы: { endRow, col, ref }
    const active: Array<{ endRow: number; col: number; ref: Meta & { _i: number } }> = [];

    // сюда положим назначенные колонки
    const colByIndex = new Map<number, number>();

    for (const m of sorted) {
        // снимаем завершившиеся
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].endRow <= m.startRow) active.splice(i, 1);
        }

        // какие колонки сейчас заняты
        const used = new Set(active.map(a => a.col));
        // находим минимальный свободный индекс
        let col = 0;
        while (used.has(col)) col++;
        colByIndex.set(m._i, col);

        // кладём в активные
        active.push({endRow: m.endRow, col, ref: m});
    }

    return colByIndex;
}


function computeColsForDay(
    dayMetas: Array<Meta & { _i: number }>,
    colByIndex: Map<number, number>
) {
    const colsByIndex = new Map<number, number>();

    for (const m of dayMetas) {
        // все, кто реально пересекается с m
        const overl = dayMetas.filter(o => rowsOverlap(m.startRow, m.endRow, o.startRow, o.endRow));
        // максимальный индекс колонки среди пересекающихся
        let maxCol = 0;
        for (const o of overl) {
            const c = colByIndex.get(o._i) ?? 0;
            if (c > maxCol) maxCol = c;
        }
        colsByIndex.set(m._i, maxCol + 1); // +1, потому что индексы с нуля
    }

    return colsByIndex;
}

