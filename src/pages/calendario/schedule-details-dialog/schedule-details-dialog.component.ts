import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormsModule } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";
import { MatDivider } from "@angular/material/divider";
import { ReservationService } from '../../../app/services/reservation.service';
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { User, UsersService } from '../../../app/services/users.service';
import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, switchMap } from 'rxjs';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-schedule-details-dialog',
  templateUrl: './schedule-details-dialog.component.html',
  styleUrls: ['./schedule-details-dialog.component.css'],
  imports: [
    FormsModule,
    CommonModule,
    MatIconModule,
    MatDivider,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatIconButton
  ],
})
export class ScheduleDetailsDialogComponent {
  isEditing = false;
  editedData: any;
  initialStatus: string = "";
  players: any[] = [];
  playerSearchControl = new FormControl('');
  filteredPlayers: Observable<User[]>;
  isLoadingPlayers = false;
  defaultAvatar = '../../../assets/images/iconuser.png';
  newPlayer: any = null;

  playersEditable = false;

  statusLabels: { [key: string]: string } = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    paid: 'Pagado'
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private reservationService: ReservationService,
    private dialogRef: MatDialogRef<ScheduleDetailsDialogComponent>,
    private snackBar: MatSnackBar,
    private usersService: UsersService
  ) {
    console.log('Dialog data:', data);
    this.editedData = { ...data.details };
    this.filteredPlayers = this.playerSearchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const searchTerm = typeof value === 'string' ? value : '';
        return this.searchPlayers(searchTerm);
      }),
      catchError(() => of([]))
    );
  }

  ngOnInit(): void {
    this.initialStatus = this.data.details.status;
    this.loadPlayers();
  }

  private loadPlayers(): void {
    if (this.data.details.user_id && this.data.details.id) {
      this.reservationService.getReservationDetailsByUser(
        this.data.details.user_id,
        this.data.details.id
      ).subscribe({
        next: (res: any) => {
          console.log('Reserva completa:', res);
          this.players = res.reservation_players || [];
          console.log('Jugadores cargados:', this.players);
        },
        error: (err) => {
          console.error('Error cargando jugadores:', err);
        }
      });
    }
  }

  togglePlayersEdit() {
    this.playersEditable = !this.playersEditable;
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status] || status;
  }

  formatDateString(dateString: string | undefined | null): string {
    if (!dateString) return 'Fecha no disponible';
    return formatDate(dateString, 'mediumDate', 'es');
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.editedData = { ...this.data.details };
    }
  }

  saveChanges() {
    this.reservationService.updateReservation(this.data.id, {
      user_id: this.data.details.user_id,
      court_id: this.data.details.court_id,
      date: this.editedData.date,
      start_time: this.formatTime(this.editedData.start_time),
      end_time: this.formatTime(this.editedData.end_time),
      observations: this.editedData.observations,
    }).subscribe({
      next: (res) => {
        this.closeDialog(true);

        console.log('Reserva actualizada:', res);
        this.data.details = { ...this.editedData };
        this.isEditing = false;
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
      }
    });

    if (this.initialStatus !== this.editedData.status) {
      this.reservationService.changeReservationStatus(this.data.id, this.editedData.status).subscribe({
        next: (res) => {
          this.closeDialog(true);

          console.log('Status actualizado:', res);
          this.data.details.status = this.editedData.status;
          this.initialStatus = this.editedData.status;
        },
        error: (err) => {
          console.error('Error al actualizar status:', err);
        }
      });
    }
  }

  closeDialog(updated: boolean = false) {
    this.dialogRef.close(updated);
  }

  onImgError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = '../../../assets/images/iconuser.png';
  }

  private formatTime(time: string): string {
    if (!time) return '';
    return time.length === 5 ? `${time}:00` : time;
  }

  confirmPlayerStatusChange(player: any) {
    const newStatus = 'paid';

    const snack = this.snackBar.open(
      `¿Marcar como pagado a ${player.user.name}?`,
      'Confirmar',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );

    snack.onAction().subscribe(() => {
      this.reservationService.updatePlayerStatusPayment(player.id, newStatus)
        .subscribe({
          next: (res) => {
            console.log('Status actualizado a paid:', res);
            player.status = newStatus;
          },
          error: (err) => console.error('Error cambiando status:', err)
        });
    });
  }

  displayFn(user: User): string {
    return user && user.name ? `${user.name} ${user.lastname}` : '';
  }

  addPlayer(user: User) {
    if (this.players.length >= 4) {
      this.snackBar.open('No se pueden agregar más de 4 jugadores.', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const newPlayer = {
      id: null,
      reservation_id: this.data.id,
      user_id: user.id,
      part_amount: null,
      player_number: this.players.length + 1,
      status: 'pending',
      user: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        profile_photo: user.profile_photo || this.defaultAvatar
      }
    };

    this.addPlayerToReservation(newPlayer);
    this.playerSearchControl.setValue('');
  }

  addPlayerToReservation(player: any) {
    this.reservationService.addPlayerToReservation(this.data.id, player).subscribe({
      next: (res) => {
        this.snackBar.open('Jugador agregado exitosamente.', 'Cerrar', { duration: 3000 });
        console.log('Jugador agregado a la reserva:', res);

        player.id = res.id;

        if (!this.players.some(p => p.user_id === player.user_id)) {
          this.players.push(player);
        }

        setTimeout(() => {
          this.loadPlayers();
        }, 100);
      },
      error: (err) => {
        console.error('Error al agregar jugador:', err);
      }
    });
  }


  private searchPlayers(searchTerm: string): Observable<User[]> {
    if (searchTerm.length < 2) return of([]);
    this.isLoadingPlayers = true;
    const normalizedTerm = searchTerm.toLowerCase();
    return this.usersService.searchUsers('', this.data.clubId).pipe(
      map(users => {
        this.isLoadingPlayers = false;
        return users.filter(u =>
          u.id !== this.data.details.user_id &&
          (
            (`${u.name} ${u.lastname}`.toLowerCase().includes(normalizedTerm)) ||
            (u.email && u.email.toLowerCase().includes(normalizedTerm))
          )
        );
      }),
      catchError(() => {
        this.isLoadingPlayers = false;
        return of([]);
      })
    );
  }

  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.defaultAvatar;
  }

  removePlayer(player: any) {
    console.log('Eliminando jugador:', player);
    this.reservationService.removePlayerFromReservation(player.id).subscribe({
      next: () => {
        this.snackBar.open('Jugador eliminado exitosamente.', 'Cerrar', { duration: 3000 });

        this.players = this.players.filter(p => p.user_id !== player.user_id);

        setTimeout(() => {
          this.loadPlayers();
        }, 100);
      },
      error: (err) => {
        console.error('Error al eliminar jugador:', err);
      }
    });
  }

  onPlayerStatusChange(player: any) {

    this.reservationService.updatePlayerStatusPayment(player.id, player.status)
      .subscribe({
        next: (res) => {
          console.log('Status actualizado a paid:', res);
          player.status = player.status;
        },
        error: (err) => console.error('Error cambiando status:', err)
      });

    // Aquí puedes guardar el cambio, actualizar en backend, etc.
    console.log('Nuevo status:', player.status);
  }

}
