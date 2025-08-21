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
    ReactiveFormsModule
    
  ],
})
export class RegistrarClubDialogComponent {
  clubForm: FormGroup;
  logoFile: File | null = null;
  logoPreview: string = '../../assets/images/placeholder.png';

  constructor(
    private fb: FormBuilder,
    private clubsService: ClubsService
  ) {
    this.clubForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      rfc: ['', Validators.required],
      web_site: [''],
      city_id: ['', Validators.required],
      address: ['', Validators.required],
      type: ['', Validators.required],
      status: [true]
    });
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
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const formData = new FormData();
    Object.entries(this.clubForm.value).forEach(([key, value]) => {
      formData.append(key, value as string);
    });

    if (this.logoFile) {
      formData.append('logo', this.logoFile);
    }

    this.clubsService.createClub(formData).subscribe({
      next: (res) => {
        console.log('Club creado:', res);
        alert('Club registrado correctamente');
      },
      error: (err) => {
        console.error(err);
        alert('Error al registrar club');
      }
    });
  }
}
