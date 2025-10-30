'use client';
import React, {useState} from "react";
import {Badge, Button, ButtonGroup, Card, Dropdown, Form, ToggleButton} from "react-bootstrap";
import DropDownSelect from "@/app/components/Schedule/Settings/ScreenSelection/DropDownSelect";
import SplitScreen from "@/app/components/Schedule/Settings/ScreenSelection/SplitScreen";
import {SplitCount, ZoneIndex, ZonePlaylists} from "@/public/types/interfaces";
import {useScheduleStore} from "@/app/store/scheduleStore";
import {usePlaylistStore} from "@/app/store/playlistStore";



export default function ScreenSelection() {
    // читаем всё из стора
    const selectedScreens        = useScheduleStore(s => s.selectedScreens);
    const splitCountByScreen     = useScheduleStore(s => s.splitCountByScreen);
    const zonePlaylistsByScreen  = useScheduleStore(s => s.zonePlaylistsByScreen);
    const activeZoneByScreen     = useScheduleStore(s => s.activeZoneByScreen);

    const setSplitCount      = useScheduleStore(s => s.setSplitCount);
    const setActiveZone      = useScheduleStore(s => s.setActiveZone);
    const assignZonePlaylist = useScheduleStore(s => s.assignZonePlaylist);
    const clearZonePlaylist  = useScheduleStore(s => s.clearZonePlaylist);

    const {playlistItems} = usePlaylistStore()

    if (playlistItems.length === 0) {
        return (
            <Button variant="secondary">
                Плейлисты
            </Button>
        )
    }

    // выбираем текущий экран (первый из выбранных)
    const screenId = selectedScreens[0];

    if (!screenId) {
        return (
            <Card>
                <Card.Header className="border-top">Разделение экрана</Card.Header>
                <Card.Body className="text-muted">
                    Выберите экран, чтобы настроить зоны и плейлисты.
                </Card.Body>
            </Card>
        );
    }

    const splitCount: SplitCount = splitCountByScreen[screenId] ?? 1;
    const zonePlaylists: ZonePlaylists = zonePlaylistsByScreen[screenId] ?? { 0: null };
    const activeZone = activeZoneByScreen[screenId] ?? null;

    const zoneCount = splitCount === 4 ? 4 : splitCount === 2 ? 2 : 1;
    const zones = Array.from({ length: zoneCount }, (_, i) => i as ZoneIndex);

    const onSetSplit = (n: SplitCount) => {
        if (splitCount !== n) setSplitCount(screenId, n);
    };
    const onSetActive = (z: ZoneIndex | null) => {
        if (activeZone !== z) setActiveZone(screenId, z);
    };

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
                            variant={splitCount === n ? "primary" : "outline-primary"}
                            name="split"
                            value={n}
                            checked={splitCount === (n as SplitCount)}
                            onChange={() => onSetSplit(n as SplitCount)}
                        >
                            {n}
                        </ToggleButton>
                    ))}
                </ButtonGroup>
            </Card.Header>

            <Card.Body>
                <div className="d-flex flex-column gap-3 align-items-start">
                    <SplitScreen
                        count={splitCount}
                        value={activeZone}
                        onChange={onSetActive}
                    />

                    <div className="w-100">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <Badge bg="secondary">Зоны: {zoneCount}</Badge>
                            <span className="text-muted">Кликните на область выше и выберите плейлист.</span>
                        </div>

                        <div className="row g-3">
                            {zones.map((z) => (
                                <div key={z} className="col-12 col-md-6 col-lg-3">
                                    <div className={`p-3 rounded border ${activeZone === z ? "border-primary" : "border-light"}`}>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong>Зона {z + 1}</strong>
                                            {zonePlaylists[z] ? (
                                                <Badge bg="success">назначен</Badge>
                                            ) : (
                                                <Badge bg="light" text="dark">пусто</Badge>
                                            )}
                                        </div>

                                        <Form.Select
                                            aria-label={`Плейлист для зоны ${z + 1}`}
                                            value={zonePlaylists[z] ?? ""}           // здесь должен быть ID или ""
                                            onChange={(e) => {
                                                const id = e.currentTarget.value || null; // string | null
                                                assignZonePlaylist(screenId, z, id);
                                            }}
                                            onFocus={() => onSetActive(z)}
                                        >
                                            <option value="">Выберите плейлист…</option>
                                            {playlistItems.map((pl) => (
                                                <option key={pl.id} value={pl.id}>   {/* <-- ВАЖНО: value={pl.id} */}
                                                    {pl.name}
                                                </option>
                                            ))}
                                        </Form.Select>



                                        {zonePlaylists[z] && (
                                            <button
                                                className="btn btn-link px-0 mt-2"
                                                onClick={() => clearZonePlaylist(screenId, z)}
                                            >
                                                Очистить
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <pre className="mt-3 small text-muted">
            {JSON.stringify({ screenId, splitCount, activeZone, zonePlaylists }, null, 2)}
          </pre>
                </div>
            </Card.Body>
        </Card>
    );
}