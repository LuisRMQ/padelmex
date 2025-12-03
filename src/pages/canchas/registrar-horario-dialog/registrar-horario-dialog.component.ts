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
    { name: 'Lunes', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Martes', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Miercoles', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Jueves', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Viernes', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Sabado', enabled: false, hasSchedule: false, schedules: [] },
    { name: 'Domingo', enabled: false, hasSchedule: false, schedules: [] },
  ];

 

  allHours: string[] = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM',
  '9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM',
  '12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM',
  '4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM',
  '7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM'
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
    const selectedDays = this.days.filter((d) => d.enabled);

    if (selectedDays.length === 0) {
      await this.alert.info('Selecciona al menos un día.');

      return;
    }

    // Validar que todos los turnos activos tengan datos completos
    const validationError = this.validateShiftData(selectedDays);
    if (validationError) {
        await this.alert.error('Validación', validationError);

      return;
    }

    const requests = this.createScheduleRequests(selectedDays);
    
    forkJoin(requests).subscribe(async (responses) => {
      const allOk = responses.every((r) => r !== null);
      if (allOk) {
          await this.alert.success('Éxito', 'Horarios guardados correctamente');

        this.dialogRef.close(true);
      }
    });
  }

  private validateShiftData(selectedDays: DaySchedule[]): string | null {
  for (const day of selectedDays) {

    const shifts = [
      { start: day.morning_start, end: day.morning_end, price: day.morning_price, name: "mañana" },
      { start: day.afternoon_start, end: day.afternoon_end, price: day.afternoon_price, name: "tarde" },
      { start: day.evening_start, end: day.evening_end, price: day.evening_price, name: "noche" }
    ];

    for (const s of shifts) {
      if (s.start || s.end || s.price) {
        if (!s.start || !s.end || !s.price) {
          return `Completa todos los campos del turno ${s.name} para ${day.name}`;
        }
      }
    }

    const activeShifts = shifts.filter(s => s.start && s.end && s.price);
    if (activeShifts.length === 0) {
      return `Debes configurar al menos un horario para ${day.name}`;
    }

    for (let i = 0; i < activeShifts.length; i++) {
      for (let j = i + 1; j < activeShifts.length; j++) {

        const s1_start = this.formatTime(activeShifts[i].start!);
        const s1_end   = this.formatTime(activeShifts[i].end!);
        const s2_start = this.formatTime(activeShifts[j].start!);
        const s2_end   = this.formatTime(activeShifts[j].end!);

        const overlap = s1_start < s2_end && s2_start < s1_end;

        if (overlap) {
          return `El horario de ${activeShifts[i].name} se cruza con el horario de ${activeShifts[j].name} en ${day.name}`;
        }
      }
    }
  }

  return null;
}

  private createScheduleRequests(selectedDays: DaySchedule[]) {
    const requests: any[] = [];

    selectedDays.forEach(day => {
      // Procesar cada turno que tenga datos
      if (day.morning_start && day.morning_end && day.morning_price) {
        const request = this.createShiftRequest(day, 'morning', day.morning_start, day.morning_end, day.morning_price);
        if (request) requests.push(request);
      }

      if (day.afternoon_start && day.afternoon_end && day.afternoon_price) {
        const request = this.createShiftRequest(day, 'afternoon', day.afternoon_start, day.afternoon_end, day.afternoon_price);
        if (request) requests.push(request);
      }

      if (day.evening_start && day.evening_end && day.evening_price) {
        const request = this.createShiftRequest(day, 'evening', day.evening_start, day.evening_end, day.evening_price);
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
    
    const [hourMinute, modifier] = time.split(' ');
    let [hours, minutes] = hourMinute.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  convertToAMPM(time: string): string {
    if (!time) return '';
    
    // Si ya está en formato AM/PM, retornar tal cual
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }
    
    // Si está en formato 24h, convertir
    const [hourStr, minuteStr, secondStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    hour = hour % 12 || 12;
    
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }

  private toMinutes(time: string): number {
  const [hourMinute, modifier] = time.split(' ');
  let [hours, minutes] = hourMinute.split(':').map(Number);

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
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