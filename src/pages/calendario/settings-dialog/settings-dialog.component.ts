import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from "@angular/material/card";
import { ConfigService } from '../../../app/services/config.service';

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
    MatCardModule
  ]
})
export class SettingsDialogComponent {
  advance_reservation_limit = '';
  cancellation_policy = '';
  activate_reservation = '';
  editable = false;

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private configService: ConfigService
  ) {

  }

  ngOnInit() {
    this.configService.getReservationConfigFromClub(this.data.selectedClubId).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          const config = data[0];
          this.advance_reservation_limit = config.advance_reservation_limit;
          this.cancellation_policy = config.cancellation_policy;
          this.activate_reservation = config.activate_reservation;
          this.editable = true;
        }
      }
    });
  }

  save() {
    const configData = {
      club_id: this.data.selectedClubId,
      advance_reservation_limit: this.advance_reservation_limit,
      cancellation_policy: this.cancellation_policy,
      activate_reservation: this.activate_reservation
    };
    if (this.editable) {
      this.configService.updateReservationConfig(configData).subscribe({
        next: () => {
          this.dialogRef.close(configData);
        }
      });
      return;
    }
    this.configService.createReservationConfig(configData).subscribe({
      next: () => {
        this.dialogRef.close(configData);
      }
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
