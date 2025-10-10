import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from "@angular/material/card";
import { ConfigService, Rol } from '../../../app/services/config.service';
import { ClubsService, Club } from '../../../app/services/clubs.service';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule
  ]
})
export class SettingsDialogComponent {
  advance_reservation_limit = '';
  cancellation_policy = '';
  activate_reservation = '';
  club_id!: number;
  rol_id!: number;
  editable = false;
  cancellationOptions = [0, 1, 2, 3, 4, 5, 6, 12, 24, 48];
  advanceReservationOptions = [0, 1, 2, 3, 4, 5, 6, 12, 24, 48];
  activateReservationOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  clubs: Club[] = [];
  roles: Rol[] = [];

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private configService: ConfigService,
    private clubsService: ClubsService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.loadClubs();
    this.loadRoles();

    if (this.data.selectedClubId) {
      this.club_id = this.data.selectedClubId;
      this.configService.getReservationConfigFromClub(this.data.selectedClubId).subscribe({
        next: (data) => {
          if (Array.isArray(data) && data.length > 0) {
            const config = data[0];
            this.advance_reservation_limit = config.advance_reservation_limit;
            this.cancellation_policy = config.cancellation_policy;
            this.activate_reservation = config.activate_reservation;
            this.club_id = config.club_id;
            this.rol_id = config.rol_id;
            this.editable = true;
          }
        }
      });
    }
  }

  loadClubs() {
    this.clubsService.getClubsa().subscribe({
      next: res => this.clubs = res.data,
      error: err => this.snackBar.open('Error al cargar los clubes.', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] })
    });
  }

  loadRoles() {
    this.configService.getRoles().subscribe({
      next: res => this.roles = res,
      error: err => this.snackBar.open('Error al cargar los roles.', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] })
    });
  }

  save() {
    const configData = {
      club_id: this.club_id,
      rol_id: this.rol_id,
      advance_reservation_limit: this.advance_reservation_limit,
      cancellation_policy: this.cancellation_policy,
      activate_reservation: this.activate_reservation
    };

    if (this.editable) {
      this.configService.updateReservationConfig(configData).subscribe({
        next: () => this.dialogRef.close(configData),
        error: () => this.snackBar.open('Error al actualizar la configuración.', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] })
      });
      return;
    }

    this.configService.createReservationConfig(configData).subscribe({
      next: () => this.dialogRef.close(configData),
      error: () => this.snackBar.open('Error al guardar la configuración.', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] })
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
