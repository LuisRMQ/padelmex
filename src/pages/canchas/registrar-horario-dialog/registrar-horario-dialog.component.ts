import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HorariosServiceCancha } from '../../../app/services/horarios-canchas.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from "@angular/material/icon";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from "@angular/material/divider";
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
interface DaySchedule {
  name: string;
  enabled: boolean;
  start: string;
  end: string;
  shift_name?: string;
  price_hour?: number;
  hasSchedule: boolean;
  schedules: { id: number; start: string; end: string }[];
}

@Component({
  selector: 'app-registrar-horario-dialog',
  templateUrl: './registrar-horario-dialog.component.html',
  styleUrls: ['./registrar-horario-dialog.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    FormsModule,
    MatCheckboxModule,
    CommonModule,
    MatDividerModule
  ]
})
export class RegistrarHorarioDialogComponent {
  scheduleForm: FormGroup;

  days: DaySchedule[] = [
    { name: 'Lunes', enabled: false, start: '6:00 AM', end: '10:00 PM', hasSchedule: false, schedules: [] },
    { name: 'Martes', enabled: false, start: '6:00 AM', end: '10:00 PM', hasSchedule: false, schedules: [] },
    { name: 'Miercoles', enabled: false, start: '6:00 AM', end: '10:00 PM', hasSchedule: false, schedules: [] },
    { name: 'Jueves', enabled: false, start: '6:00 AM', end: '10:00 PM', hasSchedule: false, schedules: [] },
    { name: 'Viernes', enabled: false, start: '6:00 AM', end: '10:00 PM', hasSchedule: false, schedules: [] },
    { name: 'Sabado', enabled: false, start: '6:00 AM', end: '10:00 PM', hasSchedule: false, schedules: [] },
    { name: 'Domingo', enabled: false, start: '6:00 AM', end: '10:00 PM', hasSchedule: false, schedules: [] },
  ];

  hours: string[] = [
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM',
    '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM',
    '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
    '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM',
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrarHorarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { courtId: number; horarios: any; clubId: number; courtName: string },
    private horarioCancha: HorariosServiceCancha,
    private snackBar: MatSnackBar
  ) {
    this.scheduleForm = this.fb.group({
      court_id: [data.courtId],
      day: ['', Validators.required],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      shift_name: ['', Validators.required],
      price_hour: [null, [Validators.required, Validators.min(1)]],
      status: [true, Validators.required],
    });
  }

  ngOnInit() {
    if (this.data?.horarios) {
      this.data.horarios.forEach((h: any) => {
        const dia = this.days.find((d) => d.name.toLowerCase() === h.day.toLowerCase());
        if (dia) {
          dia.hasSchedule = true;
          dia.shift_name = h.shift_name;
          dia.price_hour = h.price_hour;
          dia.schedules.push({
            id: h.courts_schedules_id,
            start: this.convertToAMPM(h.start_time),
            end: this.convertToAMPM(h.end_time),
          });
        }
      });
    }
  }

  guardarHorario() {
    const selectedDays = this.days.filter((d) => d.enabled);

    if (selectedDays.length === 0) {
      this.snackBar.open('Selecciona al menos un día.', 'Cerrar', { duration: 3000, panelClass: ['snackbar-info'] });
      return;
    }

    for (const day of selectedDays) {
      if (!day.shift_name || !day.price_hour) {
        this.snackBar.open(`Completa "Turno" y "Precio por hora" para ${day.name}`, 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error'],
        });
        return;
      }
    }

    const requests = selectedDays.map((day) => {
      const horario = {
        club_id: this.data.clubId,
        court_id: this.data.courtId,
        day: day.name,
        start_time: this.formatTime(day.start),
        end_time: this.formatTime(day.end),
        shift_name: day.shift_name,
        price_hour: day.price_hour,
      };

      return (day.hasSchedule && day.schedules.length
        ? this.horarioCancha.updateHorario(day.schedules[0].id, horario)
        : this.horarioCancha.createHorario(horario)
      ).pipe(
        catchError((err) => {
          const message = err?.error?.errors?.start_time?.[0] || 'Error al guardar el horario.';
          this.snackBar.open(message, 'Cerrar', { duration: 4000, panelClass: ['snackbar-error'] });
          return of(null);
        })
      );
    });

    forkJoin(requests).subscribe((responses) => {
      const allOk = responses.every((r) => r !== null);
      if (allOk) {
        this.snackBar.open('Horarios guardados correctamente ✅', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });
        this.dialogRef.close(true);
      }
    });
  }

  selectWeekdays() {
    this.days.forEach((d) => (d.enabled = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'].includes(d.name)));
  }

  selectAllDays() {
    this.days.forEach((d) => (d.enabled = true));
  }

  selectWeekends() {
    this.days.forEach((d) => (d.enabled = ['Sabado', 'Domingo'].includes(d.name)));
  }

  clearAll() {
    this.days.forEach((d) => (d.enabled = false));
  }

  private formatTime(time: string): string {
    const [hourMinute, modifier] = time.split(' ');
    let [hours, minutes] = hourMinute.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  convertToAMPM(time: string): string {
    if (!time) return '';
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }
}