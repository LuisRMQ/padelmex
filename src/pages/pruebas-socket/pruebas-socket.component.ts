import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReverbService } from '../../app/services/websocket.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pruebas-socket',
  templateUrl: './pruebas-socket.component.html',
  styleUrls: ['./pruebas-socket.component.css'],
  standalone:true,
  imports:[
    CommonModule
  ]
})
export class PruebasSocketComponent implements OnInit, OnDestroy {
  isConnected = false;
  courts: any[] = []; // Inicializado como array vacío
  messages: string[] = []; // Inicializado como array vacío
  private connectionCheckInterval: any;

  constructor(private reverb: ReverbService) {}

  ngOnInit(): void {
    // Inicializar explícitamente
    this.courts = [];
    this.messages = [];
    this.isConnected = false;
    
    this.checkConnectionStatus();
    
    // Escuchar eventos del canal 'public-chat'
    this.reverb.listen('public-chat', (event: any) => {
  console.log('📩 Evento recibido crudo:', event);

  // Si el servicio te entrega { event, data }, parseamos correctamente:
  const parsedData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

  if (event.event === 'court.created' && parsedData?.court) {
    this.courts.unshift(parsedData.court);
    this.messages.unshift(`🏟️ Nueva cancha: ${parsedData.court.name} - ${new Date().toLocaleTimeString()}`);
  } else if (parsedData?.message) {
    this.messages.unshift(`📢 ${parsedData.message} - ${new Date().toLocaleTimeString()}`);
  }
});
    // Verificar conexión cada segundo
    this.connectionCheckInterval = setInterval(() => {
      this.isConnected = this.reverb.getConnectionStatus();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  }

  checkConnectionStatus() {
    this.isConnected = this.reverb.getConnectionStatus();
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  // Método para formatear fecha manualmente
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
      return dateString;
    }
  }

  sendTestMessage() {
    this.reverb.send('public-chat', {
      message: 'Mensaje de prueba desde Angular',
      timestamp: new Date().toISOString(),
      user: 'Angular Client'
    });
  }

  simulateCourtCreation() {
    // Asegurarnos de que courts esté inicializado
    if (!this.courts) this.courts = [];
    if (!this.messages) this.messages = [];
    
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
    const time = new Date().toLocaleTimeString();
    this.messages.unshift(`🏟️ Cancha simulada: ${mockCourt.name} - ${time}`);
  }
}