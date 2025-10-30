'use client';
import React, {useMemo} from 'react';
import {Badge, Form} from 'react-bootstrap';
import SplitScreen from '@/app/components/Schedule/Settings/ScreenSelection/SplitScreen';
import {SplitCount, ZoneIndex, ZonePlaylists} from '@/public/types/interfaces';

type SimplePlaylist = { id: string; name: string };

export type SectionsSelectionProps = {
    count: SplitCount;
    activeZone: ZoneIndex | null;
    onChangeActive: (z: ZoneIndex | null) => void;

    zonePlaylists: ZonePlaylists;
    playlists: SimplePlaylist[];

    onSelectPlaylistForZone: (z: ZoneIndex, idOrEmpty: string) => void;
    onClearZone: (z: ZoneIndex) => void;

    width?: string;
    className?: string;
};

export default function SectionsSelection({
                                              count,
                                              activeZone,
                                              onChangeActive,
                                              zonePlaylists,
                                              playlists,
                                              onSelectPlaylistForZone,
                                              onClearZone,
                                              width = 'clamp(260px, 90vw, 450px)',
                                              className,
                                          }: SectionsSelectionProps) {
    const zoneCount = count === 4 ? 4 : count === 2 ? 2 : 1;
    const zones = useMemo(() => Array.from({length: zoneCount}, (_, i) => i as ZoneIndex), [zoneCount]);

    return (
        <div className={`d-flex flex-column gap-3 align-items-start ${className ?? ''}`}>
            <SplitScreen
                count={count}
                value={activeZone}
                onChange={onChangeActive}
                width={width}
            />

            <div className="mx-auto" style={{width: '100%', maxWidth: 450, minWidth: 260}}>
                <div className="d-flex align-items-center gap-2 mb-2 small">
                    <Badge bg="secondary">Зоны: {zoneCount}</Badge>
                    <span className="text-muted">Кликните на область выше и выберите плейлист.</span>
                </div>

                <div className="row g-2 row-cols-1 row-cols-sm-2">
                    {zones.map((z) => {
                        const value = zonePlaylists[z] ?? '';
                        return (
                            <div key={z} className="col">
                                <div
                                    className={`p-2 rounded border small ${activeZone === z ? 'border-primary' : 'border-light'}`}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <strong className="fw-semibold">Зона {z + 1}</strong>
                                        {value
                                            ? <Badge bg="success" className="text-uppercase"
                                                     style={{fontSize: '0.7rem'}}>назначен</Badge>
                                            : <Badge bg="light" text="dark" className="text-uppercase"
                                                     style={{fontSize: '0.7rem'}}>пусто</Badge>
                                        }
                                    </div>

                                    <Form.Select
                                        size="sm"
                                        className="form-select-sm"
                                        aria-label={`Плейлист для зоны ${z + 1}`}
                                        value={value || ''}
                                        onChange={(e) => {
                                            onSelectPlaylistForZone(z, e.currentTarget.value);
                                            onChangeActive(z);
                                        }}
                                        onFocus={() => onChangeActive(z)}
                                    >
                                        <option value="">Выберите плейлист…</option>
                                        {playlists.map(pl => (
                                            <option key={pl.id} value={pl.id}>{pl.name}</option>
                                        ))}
                                    </Form.Select>

                                    {value && (
                                        <button
                                            className="btn btn-link btn-sm px-0 mt-1"
                                            onClick={() => onClearZone(z)}
                                        >
                                            Очистить
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
