import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";
import { MatDividerModule } from "@angular/material/divider";
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatSelectModule } from "@angular/material/select";

interface Player {
  name: string;
  lastname: string;
  profile_photo?: string;
}

@Component({
  selector: 'app-reservaciones-details-dialog',
  templateUrl: './reservaciones-details-dialog.component.html',
  styleUrls: ['./reservaciones-details-dialog.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatIconModule,
    MatDividerModule,
    MatDatepickerModule,
    MatSelectModule,
    MatInputModule
  ]
})
export class ReservacionesDetailsDialogComponent {

  public data: any;              // toda la data del dialog
  public players: Player[] = [];
  public isEditing = false;
  public editedData: any = {};   // para edición temporal

  constructor(
    @Inject(MAT_DIALOG_DATA) public dialogData: any,
    private dialogRef: MatDialogRef<ReservacionesDetailsDialogComponent>
  ) {
    // Asignar data completa
    this.data = dialogData;
    this.players = dialogData.players || [];
    this.editedData = { ...dialogData.details }; 
  }

  closeDialog() {
    this.dialogRef.close();
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.editedData = { ...this.data.details };
    }
  }

  saveChanges() {
    // Aquí podrías llamar a un service para actualizar en backend
    this.data.details = { ...this.editedData };
    this.isEditing = false;
  }

  formatDateString(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }
}
