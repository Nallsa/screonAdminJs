let ws: WebSocket | null = null;


export function connectWebSocket(onMessage: (action: string, payload: any) => void): WebSocket {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket уже подключен');
        return ws;
    }

    if (ws && ws.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket в процессе подключения');
        return ws;
    }

    console.log('Открываем новое WebSocket соединение...');
    ws = new WebSocket('wss://dev1.videotrade.ru/ws-pairing');

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            const { action, payload } = data;
            onMessage(action, payload);
        } catch (err) {
            console.error('Error parsing message:', err);
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
        console.log('WebSocket closed');
    };

    return ws;
}

export function sendGeneratePairingCode(screenId: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const request = {
            action: 'GENERATE_PAIRING_CODE',
            payload: { screenId }
        };
        ws.send(JSON.stringify(request));
    } else {
        console.warn('WebSocket not connected');
    }
}

export function sendConfirmPairing(code: string, userId: string | null) {
    if (userId && ws && ws.readyState === WebSocket.OPEN) {
        const request = {
            action: 'CONFIRM_PAIRING',
            payload: { code, userId }
        };
        ws.send(JSON.stringify(request));
    } else {
        console.warn('WebSocket not connected');
    }
}
