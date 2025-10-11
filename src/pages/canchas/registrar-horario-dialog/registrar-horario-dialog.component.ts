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

  morningHours: string[] = [
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM',
    '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'
  ];

  afternoonHours: string[] = [
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM',
    '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
  ];

  eveningHours: string[] = [
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM',
    '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'
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

  guardarHorario() {
    const selectedDays = this.days.filter((d) => d.enabled);

    if (selectedDays.length === 0) {
      this.snackBar.open('Selecciona al menos un día.', 'Cerrar', { 
        duration: 3000, 
        panelClass: ['snackbar-info'] 
      });
      return;
    }

    // Validar que todos los turnos activos tengan datos completos
    const validationError = this.validateShiftData(selectedDays);
    if (validationError) {
      this.snackBar.open(validationError, 'Cerrar', {
        duration: 4000,
        panelClass: ['snackbar-error'],
      });
      return;
    }

    const requests = this.createScheduleRequests(selectedDays);
    
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

  private validateShiftData(selectedDays: DaySchedule[]): string | null {
    for (const day of selectedDays) {
      // Validar turno mañana si tiene datos
      if (day.morning_start || day.morning_end || day.morning_price) {
        if (!day.morning_start || !day.morning_end || !day.morning_price) {
          return `Completa todos los campos del turno mañana para ${day.name}`;
        }
        if (day.morning_price < 1) {
          return `El precio del turno mañana para ${day.name} debe ser mayor a 0`;
        }
      }

      // Validar turno tarde si tiene datos
      if (day.afternoon_start || day.afternoon_end || day.afternoon_price) {
        if (!day.afternoon_start || !day.afternoon_end || !day.afternoon_price) {
          return `Completa todos los campos del turno tarde para ${day.name}`;
        }
        if (day.afternoon_price < 1) {
          return `El precio del turno tarde para ${day.name} debe ser mayor a 0`;
        }
      }

      // Validar turno noche si tiene datos
      if (day.evening_start || day.evening_end || day.evening_price) {
        if (!day.evening_start || !day.evening_end || !day.evening_price) {
          return `Completa todos los campos del turno noche para ${day.name}`;
        }
        if (day.evening_price < 1) {
          return `El precio del turno noche para ${day.name} debe ser mayor a 0`;
        }
      }

      // Validar que al menos un turno tenga datos
      const hasAnyShiftData = 
        (day.morning_start && day.morning_end && day.morning_price) ||
        (day.afternoon_start && day.afternoon_end && day.afternoon_price) ||
        (day.evening_start && day.evening_end && day.evening_price);

      if (!hasAnyShiftData) {
        return `Debes configurar al menos un turno para ${day.name}`;
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
}