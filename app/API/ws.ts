let ws: WebSocket | null = null;

let sockets: Record<'pairing' | 'schedule', WebSocket | null> = {
    pairing: null,
    schedule: null,
}

const URLS = {
    pairing: 'wss://dev1.videotrade.ru/ws-pairing',
    schedule: 'wss://dev1.videotrade.ru/ws/schedule',
} as const

export function connectWebSocket(channel: 'pairing' | 'schedule', onMessage: (action: string, payload: any) => void): WebSocket {

    let ws = sockets[channel]
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return ws
    }

    console.log(`Открываем новое WebSocket ${channel} соединение...`);
    ws = new WebSocket(URLS[channel])
    sockets[channel] = ws

    ws.onopen = () => {
        console.log(`WebSocket [${channel}] connected`)
    }

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
            onMessage(msg.action, {__status: 'ok', ...(msg.data ?? {})});
        }
    };

    ws.onerror = err => console.error(`WebSocket [${channel}] error`, err)
    ws.onclose = () => console.log(`WebSocket [${channel}] closed`)

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
