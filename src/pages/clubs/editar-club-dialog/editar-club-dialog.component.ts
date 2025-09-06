import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';

export interface Club {
  id: number;
  name: string;
  address: string;
  rfc: string;
  type: string;
  phone: string;
  email: string;
  web_site: string;
  city_id: number;
  logo: string;
  status: boolean;
}

@Component({
  selector: 'app-editar-club-dialog',
  templateUrl: './editar-club-dialog.component.html',
  styleUrls: ['./editar-club-dialog.component.css'],
  standalone: true,
  imports: [MatIconModule, MatInputModule, MatSelectModule, CommonModule, FormsModule, MatButtonModule, MatSlideToggleModule],
})
export class EditarClubDialogComponent {
  club: Club;
  logoFile: File | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { club: Club },
    public dialogRef: MatDialogRef<EditarClubDialogComponent>
  ) {
    // Clonar el objeto para no mutar el original hasta guardar
    this.club = { ...data.club };
  }

  onLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      this.club.logo = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  guardar() {
    // Si se seleccionó un nuevo archivo de logo, enviar como FormData
    if (this.logoFile) {
      const formData = new FormData();
      Object.entries(this.club).forEach(([key, value]) => {
        if (key !== 'logo' && value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      formData.append('logo', this.logoFile);
      // Debug: mostrar el contenido del FormData
      for (const pair of formData.entries()) {
        console.log(pair[0]+ ':', pair[1]);
      }
      console.log(formData);
      this.dialogRef.close(formData);
    } else {
      // Si no se cambió el logo, solo enviar los datos normales
      this.dialogRef.close(this.club);
    }
  }
}
