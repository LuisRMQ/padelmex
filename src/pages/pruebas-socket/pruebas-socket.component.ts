import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReverbService } from '../../app/services/websocket.service';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../app/services/auth.service';
import { ReservationService } from '../../app/services/reservation.service';
import { FriendShipService } from '../../app/services/friendship-request.service';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';


interface ReservationInvitation {
  reservation_id: number;
  from_user_id: number;
  message: string;
  timestamp: string;
}

interface SendInvitationFriendEvent {
  message: string;
  timestamp: string;
  friend_id: number;
  friendship_request_id: number;
}

@Component({
  selector: 'app-pruebas-socket',
  templateUrl: './pruebas-socket.component.html',
  styleUrls: ['./pruebas-socket.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PruebasSocketComponent implements OnInit, OnDestroy {
  isConnected = false;
  messages: string[] = [];
  invitations: ReservationInvitation[] = [];
  private connectionCheckInterval: any;
  private currentUser: User | null = null;

  constructor(
    private reverb: ReverbService,
    private auth: AuthService,
    private reservationService: ReservationService,
    private friendShipService: FriendShipService,
    private snackBar: MatSnackBar

  ) { }

  ngOnInit(): void {
    // Obtener usuario logueado
    this.auth.getCurrentUser().subscribe(user => {
      this.currentUser = user;

      if (user) {
        // Escuchar canal específico del usuario para invitaciones
        this.reverb.listen(`friendship.${user.id}`, (event: any) => {
          console.log('📩 Evento recibido:', event);

          if (event.event === 'send-invitationFriend' && event.data?.message) {
            const friendEvent: SendInvitationFriendEvent = {
              message: event.data.message,
              timestamp: event.data.timestamp,
              friend_id: event.data.friend_id,
              friendship_request_id: event.data.friendship_request_id
            };

            // Mostrarlo como mensaje recibido
            this.messages.unshift(`👋 ${friendEvent.message} (${this.formatDate(friendEvent.timestamp)})`);

            // Agregar a lista (si quieres mantener un listado)
            this.invitations.unshift({
              reservation_id: friendEvent.friendship_request_id, // puedes usar el ID aquí si quieres
              from_user_id: friendEvent.friend_id, // opcional
              message: friendEvent.message,
              timestamp: friendEvent.timestamp
            });
          }
        });
      }
    });

    // Verificar conexión periódicamente
    this.connectionCheckInterval = setInterval(() => {
      this.isConnected = this.reverb.getConnectionStatus();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.connectionCheckInterval) clearInterval(this.connectionCheckInterval);
  }

 acceptInvitation(invitation: ReservationInvitation) {
  if (!this.currentUser) return;

  this.friendShipService.acceptRequest(invitation.reservation_id).subscribe({
    next: res => {
      this.messages.unshift(`✅ Invitación de amistad aceptada (ID ${invitation.reservation_id})`);
      this.removeInvitation(invitation);
      // Opcional: notificar al remitente vía websocket
      this.notifyInvitationResponse(invitation, true);
    },
    error: err => {
      console.error('❌ Error al aceptar invitación:', err);
      this.messages.unshift(`❌ No se pudo aceptar la invitación: ${err.message || err.statusText}`);
    }
  });
}

// ✅ Rechazar invitación
rejectInvitation(invitation: ReservationInvitation) {
  if (!this.currentUser) return;

  this.friendShipService.rejectRequest(invitation.reservation_id).subscribe({
    next: res => {
      this.messages.unshift(`❌ Invitación de amistad rechazada (ID ${invitation.reservation_id})`);
      this.removeInvitation(invitation);
      this.notifyInvitationResponse(invitation, false);
    },
    error: err => {
      console.error('❌ Error al rechazar invitación:', err);
      this.messages.unshift(`❌ No se pudo rechazar la invitación: ${err.message || err.statusText}`);
    }
  });
}

  // Eliminar invitación de la lista local
  private removeInvitation(invitation: ReservationInvitation) {
    this.invitations = this.invitations.filter(i => i !== invitation);
  }

  // Notificar al usuario que envió la invitación
  private notifyInvitationResponse(invitation: ReservationInvitation, accepted: boolean) {
    const responseMessage = accepted ? 'aceptó tu invitación' : 'rechazó tu invitación';
    this.reverb.send(`user-${invitation.from_user_id}`, {
      event: 'friend-invitation-response',
      data: {
        reservation_id: invitation.reservation_id,
        from_user_id: this.currentUser?.id,
        accepted,
        message: `${this.currentUser?.name} ${responseMessage}`,
        timestamp: new Date().toISOString()
      }
    });
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
