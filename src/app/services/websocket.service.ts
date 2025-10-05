import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

@Injectable({ providedIn: 'root' })
export class EchoService {
    public echo: Echo<any>;

    constructor() {
        (window as any).Pusher = Pusher;

        this.echo = new Echo({
            broadcaster: 'pusher',
            key: "64dafc683cb3e36f0b66",
            cluster: "us2",           
            forceTLS: true,
            authEndpoint: 'http://localhost:8000/broadcasting/auth',
            auth: {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            }
        });
    }

    listenPrivate(channel: string, event: string, callback: any) {
        this.echo.private(channel).listen(event, callback);
    }
}