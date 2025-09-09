import React, {useMemo, useState} from 'react'
import {Button, Card, Form, ListGroup, Modal} from 'react-bootstrap'
import {useRouter} from 'next/navigation'

import {usePlaylistStore} from '@/app/store/playlistStore'
import {useScreensStore} from '@/app/store/screensStore'
import {useScheduleStore} from '@/app/store/scheduleStore'
import WhereToShowCard from '@/app/components/Schedule/Settings/WhereToShowCard'
import PlaylistSelect from '@/app/components/Schedule/Settings/Playlist/PlaylistSelect'
import {useSettingsStore} from "@/app/store/settingsStore";

export function ScenarioCreateModal({
                                        show,
                                        onHide,
                                        onSubmit,
                                    }: {
    show: boolean
    onHide: () => void
    onSubmit?: (name: string, recurring: boolean, groups: { playlistId: string; screens: string[] }[]) => void
}) {
    const router = useRouter()
    const orgId = useSettingsStore(s => s.organizationId) || ''

    const {playlistItems} = usePlaylistStore()
    const {allScreens} = useScreensStore()
    const {
        selectedScreens, selectedGroup, selectedPlaylist,
        emergency, // активные экстренные
        scenarios,  // список сценариев
        createScenario,
    } = useScheduleStore()

    const [name, setName] = useState('')
    const [recurring, setRecurring] = useState(true)
    const [groups, setGroups] = useState<{ playlistId: string; screens: string[] }[]>([])
    const [err, setErr] = useState<string | null>(null)
    const clearErr = () => setErr(null)

    // Экраны для текущей добавляемой группы
    const currentScreens = useMemo(
        () => (selectedGroup ? allScreens.filter(s => s.groupId === selectedGroup).map(s => s.id) : selectedScreens),
        [allScreens, selectedGroup, selectedScreens]
    )

    // Активное экстренное → запрет запуска сценария (точной инфы о пересечении может не быть)
    const hasActiveEmergency = useMemo(() => emergency.length > 0, [emergency])

    const addCurrentSelection = () => {
        setErr(null)

        if (!selectedPlaylist) {
            setErr('Выберите плейлист')
            return
        }
        if (currentScreens.length === 0) {
            setErr('Выберите экраны или группу')
            return
        }
        // запрет пересечений экранов между группами сценария
        const already = new Set(groups.flatMap(g => g.screens))
        const inter = currentScreens.filter(id => already.has(id))
        if (inter.length) {
            setErr('Экраны в группах сценария не должны пересекаться')
            return
        }
        setGroups(prev => [...prev, {playlistId: selectedPlaylist, screens: currentScreens}])
    }

    const handleSubmit = async () => {
        setErr(null)

        if (onSubmit) {
            onSubmit(name.trim(), recurring, groups)
            setName('')
            setRecurring(true)
            setGroups([])
            onHide()
            return
        }

        if (!orgId) {
            setErr('Не выбрана организация')
            return
        }
        if (!name.trim()) {
            setErr('Введите название сценария')
            return
        }
        if (groups.length === 0) {
            setErr('Добавьте хотя бы одну группу (плейлист + экраны)')
            return
        }

        if (hasActiveEmergency) {
            setErr('Нельзя создать/запустить сценарий — сейчас активен экстренный показ')
            return
        }

        await createScenario({
            organizationId: orgId,
            name: name.trim(),
            recurring,
            assignments: groups,
        })

        setName('')
        setRecurring(true)
        setGroups([])
        onHide()
    }

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Создать сценарий</Modal.Title>
            </Modal.Header>
            {!!err && <div className="text-danger small px-3 ">{err}</div>}
            <Modal.Body>
                <div className="d-flex flex-column gap-3">
                    <Form.Group>
                        <Form.Label>Название</Form.Label>
                        <Form.Control
                            value={name}
                            onChange={e => {
                                clearErr();
                                setName(e.target.value)
                            }}
                            placeholder="Например, Пожар — этаж 2"
                        />
                    </Form.Group>

                    <Card>
                        <Card.Header>Плейлист</Card.Header>
                        <Card.Body className="d-flex align-items-center justify-content-center" style={{height: 80}}>
                            <PlaylistSelect onEmptyClick={() => router.push('/playlists')}/>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header>Режим</Card.Header>
                        <Card.Body className="d-flex flex-row align-items-center justify-content-center text-center"
                                   style={{height: 70}}>
                            <Form.Check
                                type="radio"
                                id="scn-loop"
                                name="scn-mode"
                                label="Зациклено"
                                checked={recurring}
                                onChange={() => {
                                    clearErr();
                                    setRecurring(true)
                                }}
                                className="mb-2"
                            />
                            <div className="px-3"></div>
                            <Form.Check
                                type="radio"
                                id="scn-once"
                                name="scn-mode"
                                label="Один раз"
                                checked={!recurring}
                                onChange={() => {
                                    clearErr();
                                    setRecurring(false)
                                }}
                            />
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header>Где показывать</Card.Header>
                        <Card.Body className="d-flex align-items-center justify-content-center" style={{height: 80}}>
                            <div className="w-100" style={{maxWidth: 420}}>
                                <WhereToShowCard
                                    onNoScreensClick={(e) => {
                                        e.preventDefault()
                                        setErr('Сначала добавьте экраны')
                                    }}
                                />
                            </div>
                        </Card.Body>
                    </Card>

                    <div className="d-flex align-items-center gap-2 justify-content-end">

                        {groups.length > 0 && (
                            <Button size="sm" variant="outline-secondary" onClick={() => {
                                clearErr();
                                setGroups([])
                            }}>
                                Очистить группы
                            </Button>
                        )}
                    </div>

                    {groups.length > 0 && (
                        <ListGroup>
                            {groups.map((g, i) => {
                                const plName = playlistItems.find(p => p.id === g.playlistId)?.name ?? g.playlistId
                                const byId = new Map(allScreens.map(s => [s.id, s.name]))
                                const names = g.screens.map(id => byId.get(id) ?? id)
                                const pretty = names.length > 6 ? names.slice(0, 6).join(', ') + ` и ещё ${names.length - 6}` : names.join(', ')
                                return (
                                    <ListGroup.Item key={i}
                                                    className="d-flex justify-content-between align-items-center">
                                        <span><strong>{plName}</strong> — {pretty}</span>
                                        <Button size="sm" variant="outline-danger"
                                                onClick={() => setGroups(prev => prev.filter((_, idx) => idx !== i))}>
                                            Удалить
                                        </Button>
                                    </ListGroup.Item>
                                )
                            })}
                        </ListGroup>
                    )}


                </div>
            </Modal.Body>
            <Modal.Footer>
                <div className="d-flex flex-row justify-content-between align-content-center flex-grow-1">
                    <Button variant="secondary" onClick={onHide}>Отмена</Button>
                    <Button variant="success" onClick={addCurrentSelection}>
                        Добавить группу
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>Создать сценарий</Button>
                </div>
            </Modal.Footer>
        </Modal>
    )
}