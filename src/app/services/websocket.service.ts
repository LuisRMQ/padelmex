import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReverbService {
    private ws!: WebSocket;
    private callbacks: { [channel: string]: (event: any) => void } = {};
    private isConnected = false;
    private pendingMessages: any[] = [];

    constructor() {
        this.connect();
    }

    private connect() {
        const wsUrl = `ws://localhost:8081/app/hjo5wwuhytdrddxp6rqy?protocol=7&client=js&version=8.4.0&flash=false`;
        console.log('🔗 Conectando a WebSocket:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ Conectado a Reverb');
            this.isConnected = true;

            // Suscribirse a los canales pendientes
            Object.keys(this.callbacks).forEach(channel => this.subscribe(channel));

            // Enviar mensajes pendientes
            this.pendingMessages.forEach(msg => this.ws.send(JSON.stringify(msg)));
            this.pendingMessages = [];
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                console.log('📩 Mensaje WebSocket recibido:', msg);

                // if (msg.event.startsWith('pusher:')) return; // ignorar internos
                 if (msg.event === 'pusher:ping') {
            this.ws.send(JSON.stringify({ event: 'pusher:pong' }));
            return;
        }

                let parsedData = msg.data;
                if (typeof parsedData === 'string') parsedData = JSON.parse(parsedData);

                if (msg.channel && this.callbacks[msg.channel]) {
                    this.callbacks[msg.channel]({
                        channel: msg.channel,
                        event: msg.event,
                        data: parsedData
                    });
                }
            } catch (error) {
                console.error('⚠️ Error parseando mensaje WebSocket:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.warn('❌ Conexión cerrada:', event.code, event.reason);
            this.isConnected = false;
            setTimeout(() => this.connect(), 3000); // reconectar automáticamente
        };

        this.ws.onerror = (error) => {
            console.error('⚠️ Error WebSocket:', error);
        };
    }

    listen(channel: string, callback: (event: any) => void) {
        console.log('📡 Listener registrado para canal:', channel);
        this.callbacks[channel] = callback;
        if (this.isConnected) this.subscribe(channel);
    }

    private subscribe(channel: string) {
        const msg = { event: 'pusher:subscribe', data: { channel } };
        console.log('📡 Suscribiéndose al canal:', channel);
        this.ws.send(JSON.stringify(msg));
    }

    send(channel: string, data: any) {
        const msg = { event: 'client-message', data: { channel, message: data } };
        if (this.isConnected) {
            console.log('📤 Enviando mensaje al canal:', channel, data);
            this.ws.send(JSON.stringify(msg));
        } else {
            console.warn('⚠️ Mensaje pendiente para enviar cuando se conecte', msg);
            this.pendingMessages.push(msg);
        }
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    disconnect() {
        if (this.ws) this.ws.close(1000, 'Closing connection');
    }
}
