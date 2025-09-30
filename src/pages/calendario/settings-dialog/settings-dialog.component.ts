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
import { MatOptionModule } from '@angular/material/core'; // <-- agregar esto
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
    MatOptionModule
  ]
})
export class SettingsDialogComponent {
  advance_reservation_limit = '';
  cancellation_policy = '';
  activate_reservation = '';
  club_id!: number;
  rol_id!: number;
  editable = false;

  clubs: Club[] = [];
  roles: Rol[] = [];

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private configService: ConfigService,
    private clubsService: ClubsService
  ) {}

  ngOnInit() {
    this.loadClubs();
    this.loadRoles();

    if (this.data.selectedClubId) {
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
      error: err => console.error(err)
    });
  }

  loadRoles() {
    this.configService.getRoles().subscribe({
      next: res => this.roles = res,
      error: err => console.error(err)
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
        next: () => this.dialogRef.close(configData)
      });
      return;
    }

    this.configService.createReservationConfig(configData).subscribe({
      next: () => this.dialogRef.close(configData)
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
