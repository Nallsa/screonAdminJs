'use client';
import React, {useEffect, useMemo, useState} from "react";
import {Button, ButtonGroup, Card, Form, ToggleButton} from "react-bootstrap";
import {SplitCount, ZoneIndex, ZonePlaylists} from "@/public/types/interfaces";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {usePlaylistStore} from "@/app/store/playlistStore";
import {useScreensStore} from "@/app/store/screensStore";
import SectionsSelection from "@/app/components/Schedule/Settings/ScreenSelection/SectionsSelection";

export default function SectionsSelectionCard() {

    const selectedScreens = useScheduleStore(s => s.selectedScreens);
    const selectedGroup = useScheduleStore(s => s.selectedGroup);
    const splitCountByScreen = useScheduleStore(s => s.splitCountByScreen);
    const zonePlaylistsByScreen = useScheduleStore(s => s.zonePlaylistsByScreen);
    const setSplitCount = useScheduleStore(s => s.setSplitCount);
    const setActiveZoneStore = useScheduleStore(s => s.setActiveZone);
    const assignZonePlaylist = useScheduleStore(s => s.assignZonePlaylist);
    const clearZonePlaylist = useScheduleStore(s => s.clearZonePlaylist);

    const {allScreens} = useScreensStore();
    const {playlistItems} = usePlaylistStore();

    const targetScreens = useMemo(() => {
        if (selectedGroup) {
            return allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id);
        }
        return selectedScreens;
    }, [selectedGroup, selectedScreens, allScreens]);

    const [activeZone, setActiveZoneLocal] = useState<ZoneIndex | null>(null);

    const baseScreenId = targetScreens[0] ?? null;

    const baseSplit: SplitCount = (baseScreenId ? (splitCountByScreen[baseScreenId] ?? 1) : 1) as SplitCount;
    const baseZones: ZonePlaylists = baseScreenId ? (zonePlaylistsByScreen[baseScreenId] ?? {0: null}) : {0: null};

    const zoneCount = baseSplit === 4 ? 4 : baseSplit === 2 ? 2 : 1;
    const zones = Array.from({length: zoneCount}, (_, i) => i as ZoneIndex);

    // приводим все экраны к единому состоянию
    useEffect(() => {
        if (!baseScreenId) return;

        //  синхронизируем split
        for (const sid of targetScreens) {
            if ((splitCountByScreen[sid] ?? 1) !== baseSplit) {
                setSplitCount(sid, baseSplit);
            }
        }

        //  синхронизируем плейлисты по зонам
        for (let z = 0; z < zoneCount; z++) {
            const desired = baseZones[z as ZoneIndex] ?? null;
            for (const sid of targetScreens) {
                const current = (zonePlaylistsByScreen[sid] ?? {0: null})[z as ZoneIndex] ?? null;
                if (current !== desired) {
                    assignZonePlaylist(sid, z as ZoneIndex, desired);
                }
            }
        }


        if (activeZone != null && activeZone >= zoneCount) {
            setActiveZoneLocal(null);
            for (const sid of targetScreens) setActiveZoneStore(sid, null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        baseScreenId,
        baseSplit,
        JSON.stringify(baseZones),
        JSON.stringify(targetScreens),
        zoneCount
    ]);


    const onSetSplit = (n: SplitCount) => {
        // применяем единое деление ко всем
        for (const sid of targetScreens) setSplitCount(sid, n);
        if (activeZone != null && activeZone >= (n === 4 ? 4 : n === 2 ? 2 : 1)) {
            setActiveZoneLocal(null);
            for (const sid of targetScreens) setActiveZoneStore(sid, null);
        }
    };

    const onSetActive = (z: ZoneIndex | null) => {
        setActiveZoneLocal(z);
        for (const sid of targetScreens) setActiveZoneStore(sid, z);
    };

    const onSelectPlaylistForZone = (z: ZoneIndex, idOrEmpty: string) => {
        const id = idOrEmpty || null;
        for (const sid of targetScreens) assignZonePlaylist(sid, z, id);
    };

    const onClearZone = (z: ZoneIndex) => {
        for (const sid of targetScreens) clearZonePlaylist(sid, z);
    };


    if (playlistItems.length === 0) {
        return <Button variant="secondary">Плейлисты</Button>;
    }

    if (!baseScreenId) {
        return (
            <Card>
                <Card.Header className="border-top">Разделение экрана</Card.Header>
                <Card.Body className="text-muted">
                    Выберите экраны (или группу), чтобы настроить зоны и плейлисты.
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card>
            <Card.Header className="border-top d-flex align-items-center justify-content-between">
                <span>Разделение экрана</span>
                <ButtonGroup aria-label="Выбор деления">
                    {[1, 2, 4].map((n) => (
                        <ToggleButton
                            key={n}
                            id={`split-${n}`}
                            type="radio"
                            variant={baseSplit === n ? "primary" : "outline-primary"}
                            name="split"
                            value={n}
                            checked={baseSplit === (n as SplitCount)}
                            onChange={() => onSetSplit(n as SplitCount)}
                        >
                            {n}
                        </ToggleButton>
                    ))}
                </ButtonGroup>
            </Card.Header>

            {zoneCount > 2 && (
                <span style={{width: 'clamp(260px, 90vw, 450px)', padding: 16, fontSize: 14}}>⚠️ Разделение экрана на несколько секций это экспериментальная функция, которая при нескольких тяжёлых видео может сильно нагружать телевизор. Лучше всего это подходит для показа изображений</span>
            )}

            <Card.Body>
                <SectionsSelection
                    count={baseSplit}
                    activeZone={activeZone}
                    onChangeActive={onSetActive}
                    zonePlaylists={baseZones}
                    playlists={playlistItems}
                    onSelectPlaylistForZone={onSelectPlaylistForZone}
                    onClearZone={onClearZone}
                    width={'clamp(260px, 90vw, 450px)'}>
                </SectionsSelection>
            </Card.Body>
        </Card>
    );
}
