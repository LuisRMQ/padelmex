import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReverbService {
    private ws!: WebSocket;
    private callbacks: { [channel: string]: (data: any) => void } = {};
    private isConnected = false;
    private pendingMessages: any[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectInterval = 3000;

    constructor() {
        this.connect();
    }

    private connect() {
        try {
            const appKey = 'hjo5wwuhytdrddxp6rqy';
            const wsUrl = `ws://localhost:8081/app/${appKey}?protocol=7&client=js&version=8.4.0&flash=false`;

            console.log('🔗 Conectando a:', wsUrl);
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ Conectado a Laravel Reverb');
                this.isConnected = true;
                this.reconnectAttempts = 0;

                this.pendingMessages.forEach(msg => this.ws.send(JSON.stringify(msg)));
                this.pendingMessages = [];
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    console.log('📩 Mensaje recibido (crudo):', msg);

                    // Pusher internals
                    if (msg.event === 'pusher:connection_established') {
                        return;
                    }

                    if (msg.event === 'pusher_internal:subscription_succeeded') {
                        console.log('✅ Suscrito al canal:', msg.channel);
                        return;
                    }

                    // 🔍 Parsear correctamente el payload del evento Laravel
                    let parsedData = msg.data;
                    if (typeof parsedData === 'string') {
                        try {
                            parsedData = JSON.parse(parsedData);
                        } catch (e) {
                            console.warn('⚠️ No se pudo parsear data como JSON:', parsedData);
                        }
                    }

                    if (msg.event && msg.channel && this.callbacks[msg.channel]) {
                        this.callbacks[msg.channel](parsedData);
                    }

                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            this.ws.onclose = (event) => {
                console.log('❌ Desconectado de Reverb:', event.code, event.reason);
                this.isConnected = false;
                this.handleReconnection();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this.handleReconnection();
        }
    }

    private handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        } else {
            console.error('❌ Máximo número de intentos de reconexión alcanzado');
        }
    }

    listen(channel: string, callback: (data: any) => void) {
        this.callbacks[channel] = callback;

        const subscribeMsg = {
            event: 'pusher:subscribe',
            data: {
                channel: channel
            }
        };

        if (this.isConnected) {
            this.ws.send(JSON.stringify(subscribeMsg));
            console.log('📡 Suscribiendo al canal:', channel);
        } else {
            this.pendingMessages.push(subscribeMsg);
        }
    }

    send(channel: string, data: any) {
        const msg = {
            event: 'client-message',
            data: {
                channel: channel,
                message: data
            }
        };

        if (this.isConnected) {
            this.ws.send(JSON.stringify(msg));
            console.log('📤 Mensaje enviado:', msg);
        } else {
            this.pendingMessages.push(msg);
            console.warn('⚠️ Mensaje guardado para enviar cuando se reconecte');
        }
    }

    // Método opcional - alias para mayor claridad
    sendMessage(channel: string, data: any) {
        this.send(channel, data);
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Closing connection');
        }
    }
}