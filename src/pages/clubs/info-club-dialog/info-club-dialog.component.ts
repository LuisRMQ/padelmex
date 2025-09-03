import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
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
import { HorarioClub, HorariosService } from '../../../app/services/horarios-clubes.service';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-club-dialog.component.html',
  styleUrls: ['./info-club-dialog.component.css'],
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
export class HorariosDialogComponent {
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
    public dialogRef: MatDialogRef<HorariosDialogComponent>,
    private horariosService: HorariosService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  cerrar() {
    this.dialogRef.close();
  }

  editarHorario(horario: any, index: number) {
    this.editIndex = index;
    this.editHorario = {
      ...horario,
      club_id: horario.club_id ?? horario.clubId ?? this.data.club.id
    };
    delete this.editHorario.clubId;
  }

  cancelarEdicion() {
    this.editIndex = null;
    this.editHorario = {};
  }

  guardarEdicion() {
    if (this.editIndex !== null && this.editHorario.id) {
      const { id, ...body } = this.editHorario;
      this.horariosService.updateHorario(id, body).subscribe({
        next: () => {
          this.data.horarios[this.editIndex as number] = { ...this.editHorario };
          this.editIndex = null;
          this.editHorario = {};
          this.snackBar.open('Horario actualizado correctamente', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error al actualizar horario', err);
          this.snackBar.open('Error al actualizar el horario', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      console.warn("⚠️ No se encontró ID en editHorario");
    }
  }

  eliminarHorario(horario: HorarioClub) {
    if (confirm('¿Seguro que quieres eliminar este horario?')) {
      this.horariosService.deleteHorario(horario.id ? horario.id : -1, this.data.club.id).subscribe({
        next: () => {
          this.data.horarios = this.data.horarios.filter((h: any) => h.id !== horario.id);
          this.snackBar.open('Horario eliminado correctamente', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          console.error("Error en DELETE", err);
          this.snackBar.open('Error al eliminar el horario', 'Cerrar', { duration: 3000 });
        },
      });
    }
  }
}