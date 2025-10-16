import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReverbService } from '../../app/services/websocket.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pruebas-socket',
  templateUrl: './pruebas-socket.component.html',
  styleUrls: ['./pruebas-socket.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PruebasSocketComponent implements OnInit, OnDestroy {
  isConnected = false;
  courts: any[] = [];
  messages: string[] = [];
  private connectionCheckInterval: any;

  constructor(private reverb: ReverbService) { }

  ngOnInit(): void {
    console.log('🔹 ngOnInit iniciado');
    this.courts = [];
    this.messages = [];

    this.checkConnectionStatus();

    // Escuchar eventos del canal 'public-chat'
    this.reverb.listen('public-chat', (event: any) => {
  console.log('📩 Evento recibido en componente (raw):', event);

  let data = event.data;
  if(typeof data === 'string'){
    try {
      data = JSON.parse(data);
    } catch(e){
      console.warn('⚠️ No se pudo parsear data como JSON:', data);
    }
  }

  // 🔹 Mostrar mensaje enviado desde Laravel
  if(data?.message){
    this.messages.unshift(`📢 ${data.message} - ${new Date().toLocaleTimeString()}`);
  } 
  // Otras cosas como canchas
  else if(event.event === 'court.created' && data?.court){
    this.courts.unshift(data.court);
    this.messages.unshift(`🏟️ Nueva cancha: ${data.court.name} - ${new Date().toLocaleTimeString()}`);
  }
  else {
    console.log('ℹ️ Evento recibido pero no coincide:', event);
  }
});

    // Verificar conexión cada segundo
    this.connectionCheckInterval = setInterval(() => {
      this.isConnected = this.reverb.getConnectionStatus();
      console.log('🔗 Estado de conexión:', this.isConnected);
    }, 1000);
  }

  ngOnDestroy(): void {
    console.log('🔹 ngOnDestroy ejecutado');
    if (this.connectionCheckInterval) clearInterval(this.connectionCheckInterval);
  }

  checkConnectionStatus() {
    this.isConnected = this.reverb.getConnectionStatus();
    console.log('🔍 checkConnectionStatus:', this.isConnected);
  }

  sendTestMessage() {
    console.log('✉️ Enviando mensaje de prueba desde Angular');
    this.reverb.send('public-chat', {
      message: 'Mensaje de prueba desde Angular',
      timestamp: new Date().toISOString(),
      user: 'Angular Client'
    });
  }

  simulateCourtCreation() {
    console.log('🎮 Simulando creación de cancha');
    const mockCourt = {
      id: Math.random(),
      name: 'Cancha de Prueba',
      photo: '',
      description: 'Esta es una cancha de prueba',
      price: 250,
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.courts.unshift(mockCourt);
    this.messages.unshift(`🏟️ Cancha simulada: ${mockCourt.name} - ${new Date().toLocaleTimeString()}`);
    console.log('🏟️ Cancha simulada agregada a courts:', mockCourt);
  }


  getStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('⚠️ Error formateando fecha:', dateString);
      return dateString;
    }
  }
}
