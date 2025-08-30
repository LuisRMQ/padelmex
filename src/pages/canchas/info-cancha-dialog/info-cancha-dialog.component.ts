import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {  Component, Inject } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { HorarioCancha, HorariosServiceCancha } from '../../../app/services/horarios-canchas.service';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-cancha-dialog.component.html',
  styleUrls: ['./info-cancha-dialog.component.css'],
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatExpansionModule,
    MatDialogModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatTableModule,
  CommonModule,
  FormsModule
  ],
})
export class InfoCanchaDialogComponent {
  editIndex: number | null = null;
  editHorario: any = {};
  diasSemana = [
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];
  constructor(
    public dialogRef: MatDialogRef<InfoCanchaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private horariosService: HorariosServiceCancha
  ) {}

  cerrar() {
    this.dialogRef.close();
  }

  editarHorario(horario: HorarioCancha, index: number) {
    this.editIndex = index;
    this.editHorario = { ...horario };
  }

  cancelarEdicion() {
    this.editIndex = null;
    this.editHorario = {};
  }

  guardarEdicion() {
    if (this.editIndex !== null && this.editHorario.id) {
      this.horariosService.updateHorario(this.editHorario.id, this.editHorario).subscribe({
        next: () => {
          this.data.horarios[this.editIndex as number] = { ...this.editHorario };
          this.editIndex = null;
          this.editHorario = {};
        },
        error: (err) => {
          console.error('Error al actualizar horario', err);
        }
      });
    }
  }

  eliminarHorario(horario: HorarioCancha) {
    console.log('Eliminar horario', horario);
    // Implementar lógica de eliminación si es necesario
  }
}
