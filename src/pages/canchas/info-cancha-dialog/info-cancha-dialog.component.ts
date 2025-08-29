import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {  Component, Inject } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule} from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { HorarioCancha } from '../../../app/services/horarios-canchas.service';

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
    CommonModule
  ],
})
export class InfoCanchaDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<InfoCanchaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  cerrar() {
    this.dialogRef.close();
  }

  
  editarHorario(horario: HorarioCancha) {
    console.log('Editar horario', horario);
   
  }

  eliminarHorario(horario: HorarioCancha) {
    console.log('Eliminar horario', horario);
 
  }
}
