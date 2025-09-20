import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule, formatDate } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";
import { MatDivider } from "@angular/material/divider";
import { ReservationService } from '../../../app/services/reservation.service';
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule } from "@angular/material/datepicker";

@Component({
  selector: 'app-schedule-details-dialog',
  templateUrl: './schedule-details-dialog.component.html',
  styleUrls: ['./schedule-details-dialog.component.css'],
  imports: [FormsModule, CommonModule, MatIconModule, MatDivider, MatInputModule, MatDatepickerModule],
})
export class ScheduleDetailsDialogComponent {
  isEditing = false; // controla si está en modo edición
  editedData: any;   // copia editable de los datos originales

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private reservationService: ReservationService,
    private dialogRef: MatDialogRef<ScheduleDetailsDialogComponent>
  ) {
    console.log('Dialog data:', data);
    this.editedData = { ...data.details }; // copiamos para edición
  }

  formatDateString(dateString: string | undefined | null): string {
    if (!dateString) return 'Fecha no disponible';
    return formatDate(dateString, 'mediumDate', 'es');
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.editedData = { ...this.data.details }; // restaurar valores si cancela
    }
  }

  saveChanges() {
    this.reservationService.updateReservation(this.data.id, {
      userId: this.data.details.user_id,
      court_id: this.data.details.court_id,
      date: this.editedData.date,
      start_time: this.formatTime(this.editedData.start_time),
      end_time: this.formatTime(this.editedData.end_time),
      observations: this.editedData.observations,
    }).subscribe({
      next: (res) => {
        console.log('Reserva actualizada:', res);
        this.data.details = { ...this.editedData }; // reflejar cambios
        this.isEditing = false;
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
      }
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  private formatTime(time: string): string {
    if (!time) return '';
    // Si viene en HH:mm -> agregar ":00"
    return time.length === 5 ? `${time}:00` : time;
  }
}
