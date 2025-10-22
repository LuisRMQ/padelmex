import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReverbService } from '../services/websocket.service';
import { AuthService } from './auth.service';
import { InvitationSnackbarComponent } from '../../app/invitation-snackbar.component';
import { FriendShipService } from './friendship-request.service';
import { ReservationService } from './reservation.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private initialized = false;

  constructor(
    private snackBar: MatSnackBar,
    private reverb: ReverbService,
    private auth: AuthService,
    private friendShipService: FriendShipService,
    private reservationService: ReservationService
  ) {}

  initGlobalListener() {
    if (this.initialized) return;
    this.initialized = true;

    const user = this.auth.getUserData();
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado. No se iniciarán notificaciones.');
      return;
    }

    // ===== Canal de amistad =====
    const friendshipChannel = `friendship.${user.id}`;
    this.reverb.listen(friendshipChannel, (event: any) => {
      if (event.event === 'send-invitationFriend' && event.data?.message) {
        const message = event.data.message;
        const requestId = event.data.friendship_request_id;

        this.snackBar.openFromComponent(InvitationSnackbarComponent, {
          data: {
            message,
            onAccept: () => this.handleFriendInvitation(requestId, true),
            onReject: () => this.handleFriendInvitation(requestId, false),
          },
          duration: 0,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['custom-snackbar']
        });
      }
    });

    // ===== Canal de reservaciones =====
const reservationChannel = `user-${user.id}`;
    this.reverb.listen(reservationChannel, (event: any) => {
      if (event.event === 'send-reservation-invitation' && event.data?.reservation_id) {
        // Convertimos el court a string si es un objeto
        const courtName = event.data.court?.name || 'Cancha desconocida';
        const message = `${event.data.from_user_name || 'Alguien'} te invita a "${event.data.reservation_name || ''}" en ${courtName} a las ${event.data.time || ''}`;
        const reservationId = event.data.reservation_id;
        const inviterUserId = event.data.from_user_id;

        this.snackBar.openFromComponent(InvitationSnackbarComponent, {
          data: {
            message,
            onAccept: () => this.handleReservationInvitation(reservationId, inviterUserId),
            onReject: () => console.log('Rechazaste la invitación a la reservación'),
          },
          duration: 0,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['custom-snackbar']
        });
      }
    });
  }

  // ===== Manejo invitaciones de amistad =====
  private handleFriendInvitation(requestId: number, accepted: boolean) {
    const currentUser = this.auth.getUserData();
    if (!currentUser) return;

    const action = accepted ? 
      this.friendShipService.acceptRequest(requestId) : 
      this.friendShipService.rejectRequest(requestId);

    action.subscribe({
      next: res => {
        console.log(`${accepted ? '✅' : '❌'} Invitación de amistad ${accepted ? 'aceptada' : 'rechazada'} (ID ${requestId})`);
        this.reverb.send(`user-${res.from_user_id}`, {
          event: 'friend-invitation-response',
          data: {
            friendship_request_id: requestId,
            from_user_id: currentUser.id,
            accepted,
            message: `${currentUser.name} ${accepted ? 'aceptó' : 'rechazó'} tu invitación`,
            timestamp: new Date().toISOString()
          }
        });
      },
      error: err => console.error(`❌ Error al ${accepted ? 'aceptar' : 'rechazar'} invitación de amistad:`, err)
    });
  }

  // ===== Manejo invitaciones a reservaciones =====
  private handleReservationInvitation(reservationId: number, inviterUserId: number, playerNumber?: number) {
    const currentUser = this.auth.getUserData();
    if (!currentUser) return;

    const payload = {
      reservation_id: reservationId,
      user_id: currentUser.id,
      player_number: playerNumber ?? null
    };

    this.reservationService.addPlayerToReservation(reservationId, payload).subscribe({
      next: res => {
        console.log(`✅ Te uniste a la reservación (ID ${reservationId})`);
        this.reverb.send(`user-${inviterUserId}`, {
          event: 'reservation-invitation-response',
          data: {
            reservation_id: reservationId,
            from_user_id: currentUser.id,
            accepted: true,
            message: `${currentUser.name} aceptó tu invitación a la reservación`,
            timestamp: new Date().toISOString()
          }
        });
      },
      error: err => console.error('❌ Error al unirse a la reservación:', err)
    });
  }
}
