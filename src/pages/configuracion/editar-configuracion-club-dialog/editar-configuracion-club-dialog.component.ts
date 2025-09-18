import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { ClubsService } from '../../../app/services/clubs.service'; 

export interface ClubData {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

@Component({
  selector: 'app-editar-club-dialog',
  templateUrl: './editar-configuracion-club-dialog.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule
  ]
})
export class EditarConfiguracionClubDialogComponent {
  clubForm: FormGroup;
  logoPreview: string;

  constructor(
    private fb: FormBuilder,
    private clubsService: ClubsService, // 👈 inyecta tu servicio
    private dialogRef: MatDialogRef<EditarConfiguracionClubDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClubData
  ) {
    this.clubForm = this.fb.group({
      name: [data.name, Validators.required],
      address: [data.address, Validators.required],
      phone: [data.phone, Validators.required],
      email: [data.email, [Validators.required, Validators.email]],
      logo: [null]
    });

    this.logoPreview = data.logo;
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo supera los 5MB');
      return;
    }

    this.logoPreview = URL.createObjectURL(file);
    this.clubForm.patchValue({ logo: file });
  }

  guardar() {
    if (this.clubForm.valid) {
      const formData = new FormData();

      // Construimos el formData dinámicamente
      Object.keys(this.clubForm.value).forEach(key => {
        const value = this.clubForm.value[key];
        if (value !== null) {
          formData.append(key, value);
        }
      });

      // Llamada al service para actualizar
      this.clubsService.updateClub(this.data.id, formData).subscribe({
        next: (res) => {
          console.log('Club actualizado:', res);
          this.dialogRef.close(true); // devolvemos true si se actualizó
        },
        error: (err) => {
          console.error('Error al actualizar el club:', err);
          alert('Hubo un error al actualizar el club');
        }
      });
    }
  }

  cancelar() {
    this.dialogRef.close(false);
  }
}
