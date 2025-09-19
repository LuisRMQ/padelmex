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

    days = [
        { name: 'Lunes', enabled: false, start: '6:00 AM', end: '10:00 PM' },
        { name: 'Martes', enabled: false, start: '6:00 AM', end: '10:00 PM' },
        { name: 'Miercoles', enabled: false, start: '6:00 AM', end: '10:00 PM' },
        { name: 'Jueves', enabled: false, start: '6:00 AM', end: '10:00 PM' },
        { name: 'Viernes', enabled: false, start: '6:00 AM', end: '10:00 PM' },
        { name: 'Sabado', enabled: false, start: '6:00 AM', end: '10:00 PM' },
        { name: 'Domingo', enabled: false, start: '6:00 AM', end: '10:00 PM' },
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
        @Inject(MAT_DIALOG_DATA) public data: { courtId: number },
        private horarioCancha: HorariosServiceCancha

    ) {
        this.scheduleForm = this.fb.group({
            court_id: [data.courtId],
            day: ['', Validators.required],
            start_time: ['', Validators.required],
            end_time: ['', Validators.required],
            status: [true, Validators.required]
        });
    }

    guardarHorario() {
        const selectedDays = this.days.filter(day => day.enabled);

        if (selectedDays.length === 0) {
            console.warn('No hay días seleccionados.');
            return;
        }

        // Recorremos cada día y lanzamos una petición POST
        selectedDays.forEach(day => {
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

        // Cerramos el modal después de lanzar todas las peticiones
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
}
