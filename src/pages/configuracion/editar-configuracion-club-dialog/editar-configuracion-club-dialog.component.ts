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
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CommonModule } from '@angular/common';
import { ESTADOS_MEXICO } from './estados-mexico';

export interface ClubData {
  id: number;
  name: string;
  type?: string;
  address: string;
  state?: string;
  city?: string;
  rfc?: string;
  phone: string;
  email: string;
  status?: boolean;

  logo: string;
}

@Component({
  selector: 'app-editar-club-dialog',
  templateUrl: './editar-configuracion-club-dialog.component.html',
  styleUrls: ['./editar-configuracion-club-dialog.component.css'],

  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSelectModule,
    MatSlideToggleModule,
    CommonModule
  ]
})
export class EditarConfiguracionClubDialogComponent {
  clubForm: FormGroup;
  logoPreview: string;


  estados = ESTADOS_MEXICO;
  ciudades: string[] = [];

  constructor(
    private fb: FormBuilder,
    private clubsService: ClubsService,
    private dialogRef: MatDialogRef<EditarConfiguracionClubDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClubData
  ) {
    console.log('Datos que llegan al diálogo:', data); // 🔍 Revisar API

    this.clubForm = this.fb.group({
      name: [data.name, Validators.required],
      address: [data.address, Validators.required],
      phone: [data.phone, Validators.required],
      email: [data.email, [Validators.required, Validators.email]],
      state: [data.state || ''],
      city: [data.city || ''],
      rfc: [data.rfc || '', Validators.required],
      status: [data.status ?? true],
      type: [data.type || 'private', Validators.required],

      logo: [null]
    });

    this.logoPreview = data.logo;
    if (data.state) {
      const estado = this.estados.find(e => e.nombre === data.state);
      this.ciudades = estado ? estado.ciudades : [];
    }
    console.log('Valores iniciales del FormGroup:', this.clubForm.value);

    this.clubForm.patchValue({
      rfc: data.rfc,
      state: data.state,
      city: data.city
    });

  }


  onStateChange(stateNombre: string) {
    const estado = this.estados.find(e => e.nombre === stateNombre);
    this.ciudades = estado ? estado.ciudades : [];
    this.clubForm.get('city')?.setValue(''); // solo reset ciudad
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

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/logos/azteca.png';
  }

guardar() {
  if (!this.clubForm.valid) return;

  const formValue = this.clubForm.value;

  // ⚡ Log para depuración
  console.log('Formulario completo:', formValue);

  // Si hay archivo de logo, usamos FormData
  if (formValue.logo) {
    const formData = new FormData();

    Object.entries(formValue).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'logo' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0'); // backend espera 1 o 0
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Log para ver qué se envía
    console.log('💡 FormData que se va a enviar:');
    for (const pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    this.clubsService.updateClub(this.data.id, formData).subscribe({
      next: (res) => {
        console.log('✅ Club actualizado con logo:', res);
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('❌ Error al actualizar club con logo:', err);
        alert('Hubo un error al actualizar el club');
      }
    });

  } else {
    // Si no hay logo, enviamos JSON normal
    const { logo, ...dataSinLogo } = formValue;

    // Convertir booleanos a 1/0 para el backend
    Object.keys(dataSinLogo).forEach(key => {
      if (typeof dataSinLogo[key] === 'boolean') {
        dataSinLogo[key] = dataSinLogo[key] ? '1' : '0';
      }
    });

    console.log('💡 Datos enviados al PUT (sin logo):', dataSinLogo);

    this.clubsService.updateClub(this.data.id, dataSinLogo).subscribe({
      next: (res) => {
        console.log('✅ Club actualizado sin logo:', res);
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('❌ Error al actualizar club sin logo:', err);
        alert('Hubo un error al actualizar el club');
      }
    });
  }
}




  cancelar() {
    this.dialogRef.close(false);
  }
}
