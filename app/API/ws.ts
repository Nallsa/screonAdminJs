let ws: WebSocket | null = null;

const RECONNECT_BASE_DELAY = 2000;
const HEARTBEAT_INTERVAL = 60000;

let sockets: Record<'pairing' | 'schedule', WebSocket | null> = {
    pairing: null,
    schedule: null,
}

const URLS = {
    pairing: 'wss://dev1.videotrade.ru/ws-pairing',
    schedule: 'wss://dev1.videotrade.ru/ws/schedule?role=admin',
} as const

export function connectWebSocket(channel: 'pairing' | 'schedule', onMessage: (action: string, payload: any) => void): WebSocket {

    let ws = sockets[channel]
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return ws
    }

    let heartbeatHandle: number;

    console.log(`Открываем новое WebSocket ${channel} соединение...`);
    ws = new WebSocket(URLS[channel])
    sockets[channel] = ws

    ws.onopen = () => {
        console.log(`[WS ${channel}] connected`);
        reconnectAttempts[channel] = 0;

        heartbeatHandle = window.setInterval(() => {
            if (!(ws) || ws.readyState === WebSocket.OPEN) {
                if ("send" in ws) {
                    ws.send(JSON.stringify({action: 'ping'}));
                }
            }
        }, HEARTBEAT_INTERVAL);
    };


    ws.onmessage = event => {
        console.log(`[WS ${channel}] raw →`, event.data);
        let msg: any;
        try {
            msg = JSON.parse(event.data);
        } catch {
            return console.error('WS: invalid JSON');
        }
        console.log(`[WS ${channel}] parsed →`, msg);

        if (msg.status === 'error') {
            onMessage(msg.action, {__status: 'error', message: msg.message});
        } else {
            onMessage(msg.action, {__status: 'ok', ...(msg.payload ?? {})});
        }
    };

    ws.onerror = err => {
        alert(`WebSocket [${channel}] error: ${err?.toString()}`)
    }

    ws.onclose = ev => {
        console.warn(`[WS ${channel}] closed`, ev);
        alert(`WebSocket [${channel}] closed (code=${ev.code})`);
        clearInterval(heartbeatHandle);
        scheduleReconnect(channel, onMessage);
    };

    return ws;
}

export function sendGeneratePairingCode(screenId: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const request = {
            action: 'GENERATE_PAIRING_CODE',
            payload: {screenId}
        };
        ws.send(JSON.stringify(request));
    } else {
        console.warn('WebSocket not connected');
    }
}

export function sendConfirmPairing(code: string, userId: string | null) {
    const pairingWs = sockets.pairing;

    if (userId && pairingWs && pairingWs.readyState === WebSocket.OPEN) {
        const request = {
            action: 'CONFIRM_PAIRING',
            payload: {code, userId}
        };
        pairingWs.send(JSON.stringify(request));
    } else {
        console.warn('WebSocket not connected');
    }
}

let reconnectAttempts: Record<'pairing' | 'schedule', number> = {
    pairing: 0,
    schedule: 0,
};

function scheduleReconnect(channel: 'pairing' | 'schedule', onMessage: any) {
    const attempt = ++reconnectAttempts[channel];
    const delay = RECONNECT_BASE_DELAY * Math.min(attempt, 10);
    console.log(`[WS ${channel}] reconnect in ${delay}ms`);
    setTimeout(() => connectWebSocket(channel, onMessage), delay);
}