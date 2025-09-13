import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from '@angular/material/core';

export interface DialogData {
  user: string;
  startTime: string;
  endTime: string;
  courtId: number;
  date: string | Date;
}

@Component({
  selector: 'app-schedule-date-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatStepperModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule
  ],
  templateUrl: './schedule-date-dialog.component.html',
  styleUrls: ['./schedule-date-dialog.component.css']
})
export class ScheduleDateDialogComponent implements OnInit {
  reservationForm: FormGroup;
  horas: string[] = [];
  metodosPago = [
    { value: 'single_payment', label: 'Pago único' },
    { value: 'split_payment', label: 'Pago dividido' }
  ];

  // Propiedad para almacenar la fecha en formato Date para el datepicker
  selectedDate: Date;

  constructor(
    public dialogRef: MatDialogRef<ScheduleDateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder
  ) {
    // Convertir la fecha recibida a objeto Date para el datepicker
    this.selectedDate = this.convertToDate(data.date);

    this.reservationForm = this.fb.group({
      user_id: ['', Validators.required],
      court_id: [data.courtId, Validators.required],
      reservation_type_id: ['2', Validators.required],
      date: [this.formatDateForApi(this.selectedDate), Validators.required], // Formato API
      start_time: [data.startTime, Validators.required],
      end_time: [data.endTime, Validators.required],
      pay_method: ['single_payment', Validators.required],
      observations: ['']
    });
  }

  ngOnInit(): void {
    this.generarHoras();
  }

  // Convertir cualquier formato de fecha a Date object
  private convertToDate(dateValue: string | Date): Date {
    if (dateValue instanceof Date) {
      return dateValue;
    }

    if (typeof dateValue === 'string') {
      // Si es string en formato YYYY-MM-DD
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateValue.split('-').map(Number);
        return new Date(year, month - 1, day);
      }

      // Si es otra cadena de fecha, intentar parsear
      const parsed = Date.parse(dateValue);
      if (!isNaN(parsed)) {
        return new Date(parsed);
      }
    }

    // Por defecto, usar fecha actual
    return new Date();
  }

  // Formatear fecha para API (YYYY-MM-DD)
  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  generarHoras(): void {
    for (let h = 6; h < 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hora = h.toString().padStart(2, '0');
        const minuto = m.toString().padStart(2, '0');
        this.horas.push(`${hora}:${minuto}`);
      }
    }
  }

  // Cuando cambia la fecha en el datepicker
  onDateChange(event: any): void {
    const selectedDate = event.value;
    if (selectedDate) {
      const apiFormattedDate = this.formatDateForApi(selectedDate);
      this.reservationForm.patchValue({ date: apiFormattedDate });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.reservationForm.valid) {
      const formValue = { ...this.reservationForm.value };

      formValue.start_time = this.formatTimeForApi(formValue.start_time);
      formValue.end_time = this.formatTimeForApi(formValue.end_time);

      this.dialogRef.close(formValue);
    }
  }

  getMetodoPagoLabel(value: string): string {
    const found = this.metodosPago.find(m => m.value === value);
    return found ? found.label : '';
  }

  private formatTimeForApi(time: string): string {
    // Si ya viene con segundos, no hace nada
    if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time;

    // Si viene como HH:mm → añade :00
    if (time.match(/^\d{2}:\d{2}$/)) return `${time}:00`;

    return time; // fallback
  }
}