import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HorariosService } from '../../../app/services/horarios.service';

@Component({
    selector: 'app-registrar-horario-dialog',
    templateUrl: './registrar-horario-dialog.component.css',
    styleUrls: ['./registrar-horario-dialog.component.css']
})
export class RegistrarHorarioDialogComponent {
    scheduleForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<RegistrarHorarioDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { clubId: number },
        private horariosService: HorariosService

    ) {
        this.scheduleForm = this.fb.group({
            club_id: [data.clubId],
            day: ['', Validators.required],
            start_time: ['', Validators.required],
            end_time: ['', Validators.required],
            status: [true, Validators.required]
        });
    }

    guardarHorario() {
        if (this.scheduleForm.valid) {
            const horario = this.scheduleForm.value;

            this.horariosService.createHorario(horario).subscribe({
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
