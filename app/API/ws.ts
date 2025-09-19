/*
 * Copyright (c) LLC "Centr Distribyucii"
 * All rights reserved.
 */

type WSChannel = 'pairing' | 'schedule' | 'status';

const RECONNECT_BASE_DELAY = 2000;
const HEARTBEAT_INTERVAL = 100_000;

const isBrowser = typeof globalThis.window !== 'undefined';

let sockets: Record<WSChannel, WebSocket | null> = {pairing: null, schedule: null, status: null};
let reconnectAttempts: Record<WSChannel, number> = {pairing: 0, schedule: 0, status: 0};

const heartbeatIds: Record<WSChannel, number | null> = {pairing: null, schedule: null, status: null};


const URLS: Record<WSChannel, string> = {
    schedule: 'wss://dev1.videotrade.ru/ws/schedule',
    pairing: 'wss://dev1.videotrade.ru/ws-pairing',
    status: 'wss://dev1.videotrade.ru/ws-status',
};


function buildUrl(channel: WSChannel): string {
    const base = URLS[channel];
    if (!isBrowser) return base;

    if (channel === 'schedule') {
        const role = 'admin';
        const userId = globalThis.window?.localStorage?.getItem('userId') ?? '';
        const orgId = globalThis.window?.localStorage?.getItem('organizationId') ?? '';
        const q = new URLSearchParams({role});
        if (userId) q.set('userId', userId);
        if (orgId) q.set('organizationId', orgId);
        return `${base}?${q.toString()}`;
    }

    if (channel === 'status') {
        // админка
        return `${base}?role=admin`;
    }

    return base;
}

export function connectWebSocket(
    channel: WSChannel,
    onMessage: (action: string, payload: any) => void
): WebSocket | null {
    // 🚧 Никогда не коннектимся в SSR
    if (!isBrowser) {
        console.warn(`WS[${channel}] skipped on server`);
        return null;
    }

    let ws = sockets[channel];
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return ws;
    }

    let heartbeatHandle: ReturnType<typeof window.setInterval> | null = null;

    console.log(`WS[${channel}] connecting...`);
    ws = new WebSocket(buildUrl(channel));
    sockets[channel] = ws;

    ws.onopen = () => {
        console.log(`WS[${channel}] connected`);
        reconnectAttempts[channel] = 0;

        heartbeatIds[channel] = window.setInterval(() => {
            const alive = sockets[channel];
            if (alive && alive.readyState === WebSocket.OPEN) {
                alive.send(JSON.stringify({action: 'PING'}));
            }
        }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (ev) => {
        try {
            const msg = JSON.parse(ev.data as any);
            const action = msg.action ?? 'UNKNOWN';
            const payload = msg.payload ?? msg;
            onMessage(action, payload);
        } catch { /* ignore */
        }
    };

    ws.onclose = (ev) => {
        console.warn(`WS[${channel}] closed`, ev);
        const id = heartbeatIds[channel];
        if (id != null) {
            window.clearInterval(id);
            heartbeatIds[channel] = null;
        }
        scheduleReconnect(channel, onMessage);
    };

    ws.onerror = () => { /* noop */
    };

    return ws;
}

function scheduleReconnect(channel: WSChannel, onMessage: (a: string, p: any) => void) {
    const attempt = ++reconnectAttempts[channel];
    const delay = RECONNECT_BASE_DELAY * Math.min(attempt, 10);
    console.log(`WS[${channel}] reconnect in ${delay}ms`);
    setTimeout(() => connectWebSocket(channel, onMessage), delay);
}


export function sendConfirmPairing(code: string, userId: string | null) {
    const ws = sockets.pairing;
    if (userId && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({action: 'CONFIRM_PAIRING', payload: {code, userId}}));
    } else {
        console.warn('WS[pairing] not connected');
    }
}
