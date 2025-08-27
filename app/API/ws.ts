type WSChannel = 'pairing' | 'schedule' | 'status';

const RECONNECT_BASE_DELAY = 2000;
const HEARTBEAT_INTERVAL = 60000;

let sockets: Record<WSChannel, WebSocket | null> = {
    pairing: null,
    schedule: null,
    status: null,
};

const URLS: Record<WSChannel, string> = {
    pairing: 'wss://dev1.videotrade.ru/ws-pairing',
    schedule: 'wss://dev1.videotrade.ru/ws/schedule?role=admin',
    status: 'wss://dev1.videotrade.ru/ws-status',
};

let reconnectAttempts: Record<WSChannel, number> = {
    pairing: 0,
    schedule: 0,
    status: 0,
};

export function connectWebSocket(
    channel: WSChannel,
    onMessage: (action: string, payload: any) => void
): WebSocket {
    let ws = sockets[channel];

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return ws;
    }

    let heartbeatHandle: number;
    console.log(`WS[${channel}] connecting...`);
    ws = new WebSocket(URLS[channel]);
    sockets[channel] = ws;

    ws.onopen = () => {
        console.log(`WS[${channel}] connected`);
        reconnectAttempts[channel] = 0;

        heartbeatHandle = window.setInterval(() => {
            const alive = sockets[channel];
            if (alive && alive.readyState === WebSocket.OPEN) {
                alive.send(JSON.stringify({action: 'PING'}));
            }
        }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = ev => {
        let msg: any;
        try {
            msg = JSON.parse(ev.data);
        } catch {
            return;
        }
        const action = msg.action ?? 'UNKNOWN';
        const payload = msg.payload ?? msg;
        onMessage(action, payload);
    };

    ws.onclose = ev => {
        console.warn(`WS[${channel}] closed`, ev);
        clearInterval(heartbeatHandle);
        scheduleReconnect(channel, onMessage);
    };

    ws.onerror = () => {/* noop */
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
