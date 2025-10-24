import {useState} from "react";
import {Badge, ButtonGroup, Card, Dropdown, Form, ToggleButton} from "react-bootstrap";
import DropDownSelect from "@/app/components/Schedule/Settings/ScreenSelection/DropDownSelect";
import SplitScreen from "@/app/components/Schedule/Settings/ScreenSelection/SplitScreen";
import {SplitCount} from "@/public/types/interfaces";


type ZoneMap = Record<number, string | null>;

export default function ScreenSelection() {
    const [count, setCount] = useState<SplitCount>(1);
    const [activeZone, setActiveZone] = useState<number | null>(null);
    const [zonePlaylists, setZonePlaylists] = useState<ZoneMap>({});

    // при смене сплита — чистим лишние зоны
    const trimZones = (next: SplitCount) => {
        setZonePlaylists(prev => {
            if (next === 4) return prev;
            const copy: ZoneMap = {};
            if (next === 1) {
                // можно оставить только 0-ю (как дефолт) или вообще очистить
                copy[0] = prev[0] ?? null;
            } else {
                copy[0] = prev[0] ?? null;
                copy[1] = prev[1] ?? null;
            }
            return copy;
        });
        setActiveZone(null);
    };

    const assignPlaylist = (zone: number, playlistId: string | null) => {
        setZonePlaylists(prev => ({ ...prev, [zone]: playlistId }));
    };

    const zoneCount = count === 4 ? 4 : count === 2 ? 2 : 1;
    const zones = Array.from({ length: zoneCount }, (_, i) => i);

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
                            variant={count === n ? "primary" : "outline-primary"}
                            name="split"
                            value={n}
                            checked={count === (n as SplitCount)}
                            onChange={() => { setCount(n as SplitCount); trimZones(n as SplitCount); }}
                        >
                            {n}
                        </ToggleButton>
                    ))}
                </ButtonGroup>
            </Card.Header>

            <Card.Body>
                <div className="d-flex flex-column gap-3 align-items-start">
                    {/* Превью с кликабельными зонами */}
                    <SplitScreen
                        count={count}
                        value={activeZone}
                        onChange={setActiveZone}
                    />

                    {/* Панель назначения плейлистов */}
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
                                            value={zonePlaylists[z] ?? ""}
                                            onChange={(e) => assignPlaylist(z, e.target.value || null)}
                                            onFocus={() => setActiveZone(z)}
                                        >
                                            <option value="">Выберите плейлист…</option>
                                            {/* Заменишь на реальные плейлисты */}
                                            <option value="pl-1">Playlist A</option>
                                            <option value="pl-2">Playlist B</option>
                                            <option value="pl-3">Playlist C</option>
                                        </Form.Select>
                                        {zonePlaylists[z] && (
                                            <button
                                                className="btn btn-link px-0 mt-2"
                                                onClick={() => assignPlaylist(z, null)}
                                            >
                                                Очистить
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Итог (для отладки/интеграции) */}
                    <pre className="mt-3 small text-muted">
            {JSON.stringify({ count, activeZone, zonePlaylists }, null, 2)}
          </pre>
                </div>
            </Card.Body>
        </Card>
    );
}