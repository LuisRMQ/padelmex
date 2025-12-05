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
import { AlertService } from '../../../app/services/alert.service';

import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, switchMap } from 'rxjs';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconButton } from '@angular/material/button';
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from "@angular/material/card";



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
    MatIconButton,
    DragDropModule,
    MatCardModule
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




  // Nuevas propiedades para el manejo de parejas
  availablePlayers: any[] = [];
  pairsConfirmed = false;



  team1: any[] = [];
  team2: any[] = [];
  score1_set1 = 0;
  score1_set2 = 0;
  score1_set3 = 0;
  score2_set1 = 0;
  score2_set2 = 0;
  score2_set3 = 0;
  pairs: any[][] = [];


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
    private usersService: UsersService,
    private alertService: AlertService

  ) {
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
          this.players = res.reservation_players || [];

          // dividir automáticamente en dos equipos (2 y 2)
          this.team1 = this.players.slice(0, 2);
          this.team2 = this.players.slice(2, 4);
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
      this.alertService.success('Reservación actualizada', 'Los cambios se guardaron correctamente.');
      this.data.details = { ...this.editedData };
      this.isEditing = false;
    },
    error: (err) => {
      console.error('Error al actualizar:', err);

      if (err.status === 422 && err.error?.errors) {
        const mensajes = Object.values(err.error.errors).join('\n');
        this.alertService.error('Error de validación', mensajes);
        return;
      }

      this.alertService.error('Error al actualizar', err.error?.msg || 'Ocurrió un error inesperado.');
    }
  });

  if (this.initialStatus !== this.editedData.status) {
    this.reservationService.changeReservationStatus(this.data.id, this.editedData.status)
      .subscribe({
        next: (res) => {
          this.alertService.success('Estatus actualizado', 'El estatus ha sido cambiado.');
          this.data.details.status = this.editedData.status;
          this.initialStatus = this.editedData.status;
        },
        error: (err) => {
          console.error('Error al actualizar status:', err);

          if (err.status === 422 && err.error?.errors) {
            const mensajes = Object.values(err.error.errors).join('\n');
            this.alertService.error('Error de validación', mensajes);
            return;
          }

          this.alertService.error('Error al actualizar estatus', err.error?.msg || 'No se pudo cambiar el estatus.');
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
    return this.usersService.searchAllUsers('').pipe(
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
          player.status = player.status;
        },
        error: (err) => console.error('Error cambiando status:', err)
      });
  }


//--------------------------------- SECTION DETAIL BRACKET ---------------------------

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      this.validateTeamSizes();
    }

    this.updateAvailablePlayers();
  }

  private validateTeamSizes() {
    if (this.team1.length > 2) {
      const extraPlayer = this.team1.pop();
      this.availablePlayers.push(extraPlayer);
    }

    if (this.team2.length > 2) {
      const extraPlayer = this.team2.pop();
      this.availablePlayers.push(extraPlayer);
    }
  }

  private updateAvailablePlayers() {
    this.availablePlayers = this.players.filter(player =>
      !this.team1.includes(player) && !this.team2.includes(player)
    );
  }

  removeFromTeam(player: any, teamNumber: number) {
    if (teamNumber === 1) {
      this.team1 = this.team1.filter(p => p !== player);
    } else {
      this.team2 = this.team2.filter(p => p !== player);
    }
    this.availablePlayers.push(player);
    this.pairsConfirmed = false;
  }

  assignPairs() {
    if (this.team1.length === 2 && this.team2.length === 2) {
      this.pairsConfirmed = true;
      this.snackBar.open('Parejas confirmadas correctamente ✅', 'Cerrar', {
        duration: 3000,
      });

      this.savePairsToBackend();
    } else {
      this.snackBar.open('Cada pareja debe tener exactamente 2 jugadores', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  clearPairs() {
    this.team1 = [];
    this.team2 = [];
    this.availablePlayers = [...this.players];
    this.pairsConfirmed = false;
    this.resetScores();
  }

  private resetScores() {
    this.score1_set1 = 0;
    this.score1_set2 = 0;
    this.score1_set3 = 0;
    this.score2_set1 = 0;
    this.score2_set2 = 0;
    this.score2_set3 = 0;
  }

  private savePairsToBackend() {
    const pairsData = {
      reservation_id: this.data.id,
      team1: this.team1.map(p => p.user_id),
      team2: this.team2.map(p => p.user_id)
    };

    console.log('Parejas a guardar:', pairsData);
  }

  guardarSet(numSet: number) {
    const score1 = this.getScoreBySet(1, numSet);
    const score2 = this.getScoreBySet(2, numSet);

    const setData = {
      setNumber: numSet,
      team1Score: score1,
      team2Score: score2,
      team1Players: this.team1.map(p => p.user_id),
      team2Players: this.team2.map(p => p.user_id)
    };

    this.snackBar.open(`Set ${numSet} guardado ✅`, 'Cerrar', {
      duration: 3000,
    });

    console.log('Datos del set:', setData);
  }

  private getScoreBySet(teamNumber: number, setNumber: number): number {
    const scoreMap: { [key: string]: number } = {
      '1_1': this.score1_set1,
      '1_2': this.score1_set2,
      '1_3': this.score1_set3,
      '2_1': this.score2_set1,
      '2_2': this.score2_set2,
      '2_3': this.score2_set3
    };

    return scoreMap[`${teamNumber}_${setNumber}`] || 0;
  }


}
