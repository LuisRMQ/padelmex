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
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from "@angular/material/divider";
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertService } from '../../../app/services/alert.service';

interface Schedule {
  id: number;
  start: string;
  end: string;
  shift_name: string;
  price_hour: number;
}

interface DaySchedule {
  name: string;
  enabled: boolean;
  hasSchedule: boolean;
  schedules: Schedule[];
  
  // Campos para cada turno
  morning_start?: string;
  morning_end?: string;
  morning_price?: number;
  
  afternoon_start?: string;
  afternoon_end?: string;
  afternoon_price?: number;
  
  evening_start?: string;
  evening_end?: string;
  evening_price?: number;
}

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    MatTooltipModule,
    FormsModule,
    MatCheckboxModule,
    CommonModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ]
})
export class RegistrarHorarioDialogComponent {
  scheduleForm: FormGroup;
  loading = false;

  days: DaySchedule[] = [
    { name: 'Lunes', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Martes', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Miércoles', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Jueves', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Viernes', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Sábado', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Domingo', enabled: false, hasSchedule: false, schedules: [] },
  ];

  globalConfig: {
    morning: { start: string; end: string; price: number | null };
    afternoon: { start: string; end: string; price: number | null };
    evening: { start: string; end: string; price: number | null };
  } = {
    morning: { start: '', end: '', price: null },
    afternoon: { start: '', end: '', price: null },
    evening: { start: '', end: '', price: null }
  };

 

  allHours: string[] = [
    '00:00','00:30','01:00','01:30','02:00',
    '02:30','03:00','03:30','04:00','04:30','05:00','05:30',
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
    '22:00', '22:30', '23:00', '23:30',
  ];


  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrarHorarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { courtId: number; horarios: any; clubId: number; courtName: string },
    private horarioCancha: HorariosServiceCancha,
    private snackBar: MatSnackBar,
    private alert: AlertService

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
      this.initializeSchedules();
    }
  }

  private initializeSchedules() {
    this.data.horarios.forEach((h: any) => {
      const dia = this.days.find((d) => d.name.toLowerCase() === h.day.toLowerCase());
      if (dia) {
        dia.hasSchedule = true;
        
        const schedule: Schedule = {
          id: h.courts_schedules_id,
          start: this.convertToAMPM(h.start_time),
          end: this.convertToAMPM(h.end_time),
          shift_name: h.shift_name,
          price_hour: h.price_hour
        };
        
        dia.schedules.push(schedule);

        // Inicializar los campos específicos por turno
        this.initializeShiftFields(dia, schedule);
      }
    });
  }

  private initializeShiftFields(day: DaySchedule, schedule: Schedule) {
    switch (schedule.shift_name) {
      case 'morning':
        day.morning_start = schedule.start;
        day.morning_end = schedule.end;
        day.morning_price = schedule.price_hour;
        break;
      case 'afternoon':
        day.afternoon_start = schedule.start;
        day.afternoon_end = schedule.end;
        day.afternoon_price = schedule.price_hour;
        break;
      case 'evening':
        day.evening_start = schedule.start;
        day.evening_end = schedule.end;
        day.evening_price = schedule.price_hour;
        break;
    }
  }

  async guardarHorario() {
    if (this.loading) return;
    
    const selectedDays = this.days.filter((d) => d.enabled);

    if (selectedDays.length === 0) {
      await this.alert.info('Selecciona al menos un día.');
      return;
    }

    // Validación Global
    const validationError = this.validateGlobalData();
    if (validationError) {
      await this.alert.error('Validación', validationError);
      return;
    }

    const requests = this.createScheduleRequests(selectedDays);
    
    if (requests.length === 0) {
       await this.alert.info('No se han configurado horarios para guardar.');
       return;
    }

    this.loading = true;

    forkJoin(requests).subscribe(async (responses) => {
      this.loading = false;
      const allOk = responses.every((r) => r !== null);
      if (allOk) {
          await this.alert.success('Éxito', 'Horarios guardados correctamente');
        this.dialogRef.close(true);
      }
    }, (err) => {
      this.loading = false;
      console.error(err);
    });
  }

  private validateGlobalData(): string | null {
    const g = this.globalConfig;
    const shifts = [
      { ...g.morning, name: "mañana" },
      { ...g.afternoon, name: "tarde" },
      { ...g.evening, name: "noche" }
    ];

    // Verificar consistencia: Si hay inicio, debe haber fin y precio
    for (const s of shifts) {
      if (s.start || s.end || s.price) {
        if (!s.start || !s.end || !s.price) {
          return `Completa todos los campos del turno ${s.name} (Inicio, Fin y Precio)`;
        }
      }
    }

    const activeShifts = shifts.filter(s => s.start && s.end && s.price);
    if (activeShifts.length === 0) {
      return `Debes configurar al menos un turno (Mañana, Tarde o Noche)`;
    }

    // Validar solapamientos
    for (let i = 0; i < activeShifts.length; i++) {
      for (let j = i + 1; j < activeShifts.length; j++) {
        const s1_start = this.formatTime(activeShifts[i].start!);
        const s1_end   = this.formatTime(activeShifts[i].end!);
        const s2_start = this.formatTime(activeShifts[j].start!);
        const s2_end   = this.formatTime(activeShifts[j].end!);

        if (s1_start < s2_end && s2_start < s1_end) {
          return `El horario de ${activeShifts[i].name} se cruza con el horario de ${activeShifts[j].name}`;
        }
      }
    }

    return null;
  }

  private createScheduleRequests(selectedDays: DaySchedule[]) {
    const requests: any[] = [];
    const g = this.globalConfig;

    selectedDays.forEach(day => {
      // Usar configuración global
      if (g.morning.start && g.morning.end && g.morning.price) {
        const request = this.createShiftRequest(day, 'morning', g.morning.start, g.morning.end, g.morning.price);
        if (request) requests.push(request);
      }

      if (g.afternoon.start && g.afternoon.end && g.afternoon.price) {
        const request = this.createShiftRequest(day, 'afternoon', g.afternoon.start, g.afternoon.end, g.afternoon.price);
        if (request) requests.push(request);
      }

      if (g.evening.start && g.evening.end && g.evening.price) {
        const request = this.createShiftRequest(day, 'evening', g.evening.start, g.evening.end, g.evening.price);
        if (request) requests.push(request);
      }
    });

    return requests;
  }

  private createShiftRequest(day: DaySchedule, shift: string, start: string, end: string, price: number) {
    const existingSchedule = day.schedules.find(s => s.shift_name === shift);
    
    const horario = {
      club_id: this.data.clubId,
      court_id: this.data.courtId,
      day: day.name,
      start_time: this.formatTime(start),
      end_time: this.formatTime(end),
      shift_name: shift,
      price_hour: price,
    };

    const request = existingSchedule
      ? this.horarioCancha.updateHorario(existingSchedule.id, horario)
      : this.horarioCancha.createHorario(horario);

    return request.pipe(
      catchError((err) => {
        const message = err?.error?.errors?.start_time?.[0] || `Error al guardar el horario del turno ${shift}.`;
        this.snackBar.open(message, 'Cerrar', { duration: 4000, panelClass: ['snackbar-error'] });
        return of(null);
      })
    );
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
    this.days.forEach((d) => {
      d.enabled = false;
      // Opcional: limpiar también los datos de los turnos
      d.morning_start = undefined;
      d.morning_end = undefined;
      d.morning_price = undefined;
      d.afternoon_start = undefined;
      d.afternoon_end = undefined;
      d.afternoon_price = undefined;
      d.evening_start = undefined;
      d.evening_end = undefined;
      d.evening_price = undefined;
    });
  }

  getShiftSchedule(day: DaySchedule, shift: string): Schedule | undefined {
    return day.schedules.find(s => s.shift_name === shift);
  }

  private formatTime(time: string): string {
    if (!time) return '';
    // Si ya tiene formato HH:MM:SS o HH:MM lo respetamos
    if (time.includes(':') && !time.includes('AM') && !time.includes('PM')) {
        const parts = time.split(':');
        if (parts.length === 2) return `${time}:00`;
        return time;
    }
    
    // Fallback para formato antiguo AM/PM si existiera
    const [hourMinute, modifier] = time.split(' ');
    if (!modifier) return `${time}:00`; // Asume formato 24h si no hay modificador

    let [hours, minutes] = hourMinute.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  convertToAMPM(time: string): string {
    // Retornamos formato 24h simplificado HH:MM
    if (!time) return '';
    const [hour, minute] = time.split(':');
    return `${hour}:${minute}`;
  }

  private toMinutes(time: string): number {
    // Adaptado para formato 24h directo
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }


getFilteredAfternoonHours(day: DaySchedule) {
  if (!day.morning_end) return this.allHours;

  const morningEnd = this.toMinutes(day.morning_end);

  return this.allHours.filter(h => this.toMinutes(h) > morningEnd);
}

getFilteredEveningHours(day: DaySchedule) {
  const limits: number[] = [];

  if (day.morning_end) limits.push(this.toMinutes(day.morning_end));
  if (day.afternoon_end) limits.push(this.toMinutes(day.afternoon_end));

  if (limits.length === 0) return this.allHours;

  const maxLimit = Math.max(...limits);

  return this.allHours.filter(h => this.toMinutes(h) > maxLimit);
}
}