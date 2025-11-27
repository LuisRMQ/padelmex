import { Component, Inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClubsService } from '../../../app/services/clubs.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatCardModule } from "@angular/material/card";

@Component({
  selector: 'app-RegistrarClub',
  templateUrl: './registrar-club-dialog.component.html',
  styleUrls: ['./registrar-club-dialog.component.css'],
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
    CommonModule,
    MatCardModule
  ],
})
export class RegistrarClubDialogComponent {
  clubForm: FormGroup;
  logoFile: File | null = null;
  logoPreview: string = '../../assets/images/placeholder.png';

 estados: string[] = [];
ciudades: string[] = [];
ciudadesPorEstado: any = {};

  fieldLabels: { [key: string]: string } = {
    name: 'Nombre del club',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    rfc: 'RFC',
    web_site: 'Sitio web',
    state: 'Estado',
    city: 'Ciudad',
    address: 'Dirección',
    type: 'Tipo',
    status: 'Estatus'
  };



  constructor(
    private fb: FormBuilder,
    private clubsService: ClubsService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RegistrarClubDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.clubForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      rfc: ['', Validators.required],
      web_site: [''],
      state: ['', Validators.required],
      city: ['', Validators.required],
      address: ['', Validators.required],
      type: ['', Validators.required],
      status: [true]
    });
  }

 ngOnInit() {
  this.cargarCiudades();

  if (this.data.club) {
    this.clubForm.patchValue(this.data.club);
    this.logoPreview = this.data.club.logo || this.logoPreview;

    this.onStateChange(this.data.club.state);
    this.clubForm.get('city')?.setValue(this.data.club.city);
  }
}

 onStateChange(state: string) {
  this.ciudades = this.ciudadesPorEstado[state] || [];   
  this.clubForm.get('city')?.reset();
}

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo supera los 5MB');
      return;
    }

    this.logoFile = file;

    const reader = new FileReader();
    reader.onload = e => {
      this.logoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  cargarCiudades() {
  this.clubsService.getCities().subscribe({
    next: (data) => {
      this.ciudadesPorEstado = data;                    
      this.estados = Object.keys(data);                  
    },
    error: (err) => console.error(err)
  });
}

  guardarClub() {
    if (this.clubForm.invalid) {
      const firstError = this.getFirstFormError();
      this.snackBar.open(firstError || 'Por favor, completa todos los campos requeridos', 'Cerrar', {
        panelClass: ['snackbar-error'],
        horizontalPosition: 'right',
        verticalPosition: 'top',
        duration: 3000
      });
      return;
    }

    const formData = new FormData();
    Object.entries(this.clubForm.value).forEach(([key, value]) => {
      formData.append(key, value as string);
    });

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    formData.append('timezone', userTimezone);

    if (this.logoFile) {
      formData.append('logo', this.logoFile);
    }

    if (this.data.club) {
      this.clubsService.updateClub(this.data.club.id, formData).subscribe({
        next: (res) => {
          this.dialogRef.close(true);
          this.snackBar.open('Club actualizado con éxito', 'Cerrar', {
            panelClass: ['snackbar-success'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
            duration: 3000
          });
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error al actualizar el club. Intenta nuevamente.', 'Cerrar', {
            panelClass: ['snackbar-error'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
            duration: 3000
          });
        }
      });
      return;
    }

    if (!this.validateClub(this.clubForm.value)) {
      return;
    }

    this.clubsService.createClub(formData).subscribe({
      next: (res) => {
        this.dialogRef.close(true);

      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error al crear el club. Intenta nuevamente.', 'Cerrar', {
          panelClass: ['snackbar-error'],
          horizontalPosition: 'right',
          verticalPosition: 'top',
          duration: 3000
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  removePhoto(): void {
    this.logoPreview = '../../assets/images/placeholder.png';
  }

  validateClub(formData: any) {
    for (const club of this.data.clubs) {
      if (club.email === formData.email) {
        this.snackBar.open('Ya existe un club con este correo electrónico', 'Cerrar', {
          panelClass: ['snackbar-error'],
          horizontalPosition: 'right',
          verticalPosition: 'top',
          duration: 3000
        });
        return false;
      }
      if (club.rfc === formData.rfc) {
        this.snackBar.open('Ya existe un club con este RFC', 'Cerrar', {
          panelClass: ['snackbar-error'],
          horizontalPosition: 'right',
          verticalPosition: 'top',
          duration: 3000
        });
        return false;
      }
      if (club.name === formData.name) {
        this.snackBar.open('Ya existe un club con este nombre', 'Cerrar', {
          panelClass: ['snackbar-error'],
          horizontalPosition: 'right',
          verticalPosition: 'top',
          duration: 3000
        });
        return false;
      }
    }
    return true;
  }

  getFirstFormError(): string | null {
    for (const key in this.clubForm.controls) {
      const control = this.clubForm.get(key);
      const label = this.fieldLabels[key] || key;
      if (control && control.invalid) {
        if (control.errors?.['required']) return `El campo "${label}" es obligatorio`;
        if (control.errors?.['minlength']) return `El campo "${label}" debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
        if (control.errors?.['email']) return `El campo "${label}" tiene un formato de correo inválido`;
        if (control.errors?.['pattern']) return `El campo "${label}" tiene un formato inválido`;
      }
    }
    return null;
  }
}
