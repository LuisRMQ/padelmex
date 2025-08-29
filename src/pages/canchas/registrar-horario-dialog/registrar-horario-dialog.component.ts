import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { HorariosServiceCancha } from '../../../app/services/horarios-canchas.service';

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
    MatDialogModule
  ]
})
export class RegistrarHorarioDialogComponent {
    scheduleForm: FormGroup;

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
        if (this.scheduleForm.valid) {
            const horario = this.scheduleForm.value;

            this.horarioCancha.createHorario(horario).subscribe({
                next: (res) => {
                    console.log('Horario creado:', res);
                    this.dialogRef.close(res); 
                },
                error: (err) => {
                    console.error('Error al guardar horario', err);
                }
            });
        }
    }


    cancelar() {
        this.dialogRef.close();
    }
}
