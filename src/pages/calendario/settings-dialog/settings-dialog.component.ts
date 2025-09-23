import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    MatButtonModule
  ]
})
export class SettingsDialogComponent {
  minReservationDuration: number;
  cancellationLimitHours: number;
  maxReservationsPerUser: number;

  constructor(
    private dialogRef: MatDialogRef<SettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.minReservationDuration = data.minReservationDuration ?? 30;
    this.cancellationLimitHours = data.cancellationLimitHours ?? 2;
    this.maxReservationsPerUser = data.maxReservationsPerUser ?? 3;
  }

  save() {
    this.dialogRef.close({
      minReservationDuration: this.minReservationDuration,
      cancellationLimitHours: this.cancellationLimitHours,
      maxReservationsPerUser: this.maxReservationsPerUser
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
