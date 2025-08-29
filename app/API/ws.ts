'use client'

type WSChannel = 'pairing' | 'schedule' | 'status';
const isBrowser = typeof window !== 'undefined';

const RECONNECT_BASE_DELAY = 2000;
const HEARTBEAT_INTERVAL = 60000;

type Listener = (action: string, payload: any, raw?: any) => void;

let sockets: Record<WSChannel, WebSocket | null> = {
    pairing: null, schedule: null, status: null,
};

const URLS: Record<WSChannel, string> = {
    pairing: 'wss://dev1.videotrade.ru/ws-pairing',
    schedule: 'wss://dev1.videotrade.ru/ws/schedule',
    status: 'wss://dev1.videotrade.ru/ws-status',
};

function safeLS(key: string): string | null {
    if (!isBrowser) return null;
    try {
        return window.localStorage.getItem(key)?.trim() || null;
    } catch {
        return null;
    }
}

function buildUrl(channel: WSChannel): string {
    if (channel !== 'schedule') return URLS[channel];
    let url = `${URLS.schedule}?role=admin`;
    const userId = safeLS('userId');
    const orgId = safeLS('organizationId');
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    if (orgId) url += `&organizationId=${encodeURIComponent(orgId)}`;
    return url;
}

let reconnectAttempts: Record<WSChannel, number> = {pairing: 0, schedule: 0, status: 0};
const listeners: Record<WSChannel, Set<Listener>> = {
    pairing: new Set(), schedule: new Set(), status: new Set(),
};
const outbox: Record<WSChannel, string[]> = {pairing: [], schedule: [], status: []};

export function connectWebSocket(channel: WSChannel, onMessage?: Listener): WebSocket {
    if (onMessage) listeners[channel].add(onMessage);

    // ←← SSR/пререндер: возвращаем "болванку", вообще не открываем сокет
    if (!isBrowser) {
        const dummy: any = {
            readyState: 3,
            send: () => {
            },
            close: () => {
            },
            onopen: null, onmessage: null, onclose: null, onerror: null,
            addEventListener: () => {
            }, removeEventListener: () => {
            },
        };
        return dummy as WebSocket;
    }

    let ws = sockets[channel];
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return ws;
    }

    console.log(`WS[${channel}] connecting...`);
    ws = new WebSocket(buildUrl(channel));
    sockets[channel] = ws;

    let heartbeatHandle: number | undefined;

    ws.onopen = () => {
        console.log(`WS[${channel}] connected`);
        reconnectAttempts[channel] = 0;

        // flush queue
        const q = outbox[channel];
        while (q.length) {
            const msg = q.shift()!;
            try {
                ws!.send(msg);
            } catch (e) {
                console.warn('WS send flush err', e);
            }
        }

        heartbeatHandle = window.setInterval(() => {
            const alive = sockets[channel];
            if (alive && alive.readyState === WebSocket.OPEN) {
                alive.send(JSON.stringify({action: 'PING'}));
            }
        }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = ev => {
        let raw: any;
        try {
            raw = JSON.parse(ev.data);
        } catch {
            return;
        }
        const action = raw.action ?? 'UNKNOWN';
        const payload = raw.payload ?? raw;
        for (const l of Array.from(listeners[channel])) {
            try {
                l(action, payload, raw);
            } catch (e) {
                console.error('WS listener error', e);
            }
        }
    };

    ws.onclose = ev => {
        console.warn(`WS[${channel}] closed`, ev);
        if (heartbeatHandle) clearInterval(heartbeatHandle);
        scheduleReconnect(channel);
    };

    ws.onerror = () => {
    };

    return ws;
}

export function subscribeWebSocket(channel: WSChannel, listener: Listener): () => void {
    connectWebSocket(channel, listener);
    listeners[channel].add(listener);
    return () => listeners[channel].delete(listener);
}

export function sendWS(channel: WSChannel, data: any) {
    const ws = connectWebSocket(channel); // на сервере вернётся dummy
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    // если настоящий сокет открыт — отправим, иначе положим в очередь до onopen
    if (isBrowser && ws && (ws as any).readyState === WebSocket.OPEN) {
        ws.send(msg);
    } else {
        outbox[channel].push(msg);
    }
}

function scheduleReconnect(channel: WSChannel) {
    if (!isBrowser) return; // на сервере не переподключаемся
    const attempt = ++reconnectAttempts[channel];
    const delay = RECONNECT_BASE_DELAY * Math.min(attempt, 10);
    console.log(`WS[${channel}] reconnect in ${delay}ms`);
    setTimeout(() => connectWebSocket(channel), delay);
}

export function sendConfirmPairing(code: string, userId: string | null) {
    if (!userId) return console.warn('No userId');
    sendWS('pairing', {action: 'CONFIRM_PAIRING', payload: {code, userId}});
}
