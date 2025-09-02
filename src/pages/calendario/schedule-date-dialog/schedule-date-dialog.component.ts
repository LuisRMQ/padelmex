import { Component } from '@angular/core';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-schedule-date-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule
  ],
  templateUrl: './schedule-date-dialog.component.html',
  styleUrl: './schedule-date-dialog.component.css'
})
export class ScheduleDateDialogComponent {
  formatFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const diaSemana = dias[fecha.getDay()];
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = meses[fecha.getMonth()];
    return `${diaSemana} ${dia} de ${mes}`;
  }
  selectedDate: Date | null = null;
  horaInicio: string = '';
  horaFin: string = '';
  cancha: string = '';
  club: string = '';

  horas = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];
  canchas = ['Cancha 1', 'Cancha 2', 'Cancha 3'];
  clubes = ['Club A', 'Club B', 'Club C'];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
