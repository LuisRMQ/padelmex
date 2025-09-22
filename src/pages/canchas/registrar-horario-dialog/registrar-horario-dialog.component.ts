import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { HorariosServiceCancha } from '../../../app/services/horarios-canchas.service';
import { MatIconModule } from "@angular/material/icon";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from "@angular/material/divider";
import { MatSnackBar } from '@angular/material/snack-bar';

interface DaySchedule {
    name: string;
    enabled: boolean;
    start: string;
    end: string;
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
        '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
        '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
        '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
        '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
        '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
        '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
        '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
        '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
    ];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<RegistrarHorarioDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { courtId: number, horarios: any, clubId: number, courtName: string },
        private horarioCancha: HorariosServiceCancha,
        private snackBar: MatSnackBar

    ) {
        this.scheduleForm = this.fb.group({
            court_id: [data.courtId],
            day: ['', Validators.required],
            start_time: ['', Validators.required],
            end_time: ['', Validators.required],
            status: [true, Validators.required]
        });
    }

    ngOnInit() {
        console.log('Horarios recibidos:', this.data.horarios);
        if (this.data?.horarios) {
            this.data.horarios.forEach((h: any) => {
                const dia = this.days.find(d => d.name.toLowerCase() === h.day.toLowerCase());
                if (dia) {
                    dia.hasSchedule = true;

                    if (!dia.schedules) {
                        dia.schedules = [];
                    }

                    dia.schedules.push({
                        id: h.courts_schedules_id,
                        start: this.convertToAMPM(h.start_time),
                        end: this.convertToAMPM(h.end_time)
                    });
                }
            });
        }
    }



    guardarHorario() {
        const selectedDays = this.days.filter(day => day.enabled);
        const daysToUpdate = selectedDays.filter(day => day.hasSchedule);
        const daysToCreate = selectedDays.filter(day => !day.hasSchedule);

        if (selectedDays.length === 0) {
            this.snackBar.open('Por favor, selecciona al menos un día para guardar los horarios.', 'Cerrar', {
                duration: 3000,
                panelClass: ['snackbar-info'],
                horizontalPosition: 'right',
                verticalPosition: 'top'

            });
            return;
        }

        daysToCreate.forEach(day => {
            const horario = {
                court_id: this.data.courtId,
                day: day.name,
                start_time: this.formatTime(day.start),
                end_time: this.formatTime(day.end),
            };

            this.horarioCancha.createHorario(horario).subscribe({
                next: (res) => {
                    console.log(`Horario creado para ${day.name}:`, res);
                },
                error: (err) => {
                    console.error(`Error al guardar horario para ${day.name}`, err);
                }
            });
        });

        daysToUpdate.forEach(day => {
            const horario = {
                club_id: this.data.clubId,
                court_id: this.data.courtId,
                day: day.name,
                start_time: this.formatTime(day.start),
                end_time: this.formatTime(day.end),
            };

            this.horarioCancha.updateHorario(day.schedules[0].id, horario).subscribe({
                next: (res) => {
                    console.log(`Horario actualizado para ${day.name}:`, res);
                },
                error: (err) => {
                    console.error(`Error al actualizar horario para ${day.name}`, err);
                }
            });
        });

        this.dialogRef.close(true);
    }


    cancelar() {
        this.dialogRef.close();
    }

    selectWeekdays() {
        this.days.forEach(day => {
            day.enabled = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'].includes(day.name);
        });
    }

    selectAllDays() {
        this.days.forEach(day => {
            day.enabled = true;
        });
    }

    selectWeekends() {
        this.days.forEach(day => {
            day.enabled = ['Sabado', 'Domingo'].includes(day.name);
        });
    }

    clearAll() {
        this.days.forEach(day => {
            day.enabled = false;
        });
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

        hour = hour % 12;
        if (hour === 0) hour = 12;

        return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
}
