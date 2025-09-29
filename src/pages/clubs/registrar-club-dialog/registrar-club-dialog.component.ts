import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
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

  estados = [
    { nombre: 'Jalisco', ciudades: ['Guadalajara', 'Zapopan', 'Puerto Vallarta'] },
    { nombre: 'Nuevo León', ciudades: ['Monterrey', 'San Nicolás', 'Apodaca'] },
    { nombre: 'Ciudad de México', ciudades: ['Iztapalapa', 'Coyoacán', 'Álvaro Obregón'] },
    { nombre: 'Yucatán', ciudades: ['Mérida', 'Valladolid', 'Tizimín'] },
    { nombre: 'Veracruz', ciudades: ['Veracruz', 'Xalapa', 'Coatzacoalcos'] }
  ];
  ciudades: string[] = [];



  constructor(
    private fb: FormBuilder,
    private clubsService: ClubsService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RegistrarClubDialogComponent>
  ) {
    this.clubForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      rfc: ['', Validators.required],
      web_site: [''],
      state: ['', Validators.required],
      city: ['', Validators.required],
      address: ['', Validators.required],
      type: ['', Validators.required],
      status: [true]
    });
  }

  onStateChange(stateNombre: string) {
    const estado = this.estados.find(e => e.nombre === stateNombre);
    this.ciudades = estado ? estado.ciudades : [];
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

  guardarClub() {
    if (this.clubForm.invalid) {
      this.snackBar.open('⚠️ Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
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

    this.clubsService.createClub(formData).subscribe({
      next: (res) => {
        this.dialogRef.close(true);
        console.log('Club creado:', res);

      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('❌ Error al registrar club', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
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
}
