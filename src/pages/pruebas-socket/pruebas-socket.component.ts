import { Component, OnInit } from '@angular/core';
import { EchoService } from '../../app/services/websocket.service';

@Component({
  selector: 'app-pruebas-socket',
  imports: [],
  templateUrl: './pruebas-socket.component.html',
  styleUrl: './pruebas-socket.component.css'
})
export class PruebasSocketComponent implements OnInit {

  constructor(private echoService: EchoService) { }

  ngOnInit(): void {
    const userId = 5; // id del usuario logueado
    this.echoService.listenPrivate(`user.${userId}`, '.join.request', (data: any) => {
      console.log('📩 Invitación recibida:', data);
      // Aquí muestras un modal Aceptar / Rechazar
      alert(data.message);
    });
  }
}


