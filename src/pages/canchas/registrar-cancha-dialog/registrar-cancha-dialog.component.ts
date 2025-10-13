import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { CourtService, Club } from '../../../app/services/court.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-RegistrarCancha',
  templateUrl: './registrar-cancha-dialog.component.html',
  styleUrls: ['./registrar-cancha-dialog.component.css'],
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatExpansionModule,
    MatDialogModule,
    MatSelectModule,
    ReactiveFormsModule,
    CommonModule,
    MatCardModule
  ],
  standalone: true
})
export class RegistrarCanchaDialogComponent implements OnInit {

  courtForm: FormGroup;
  clubs: Club[] = [];
  logoPreview: string = '../../assets/images/placeholder.png';
  selectedFile: File | null = null;
  loading = false;

  fieldLabels: { [key: string]: string } = {
    name: 'Nombre de la cancha',
    sponsor: 'Patrocinador',
    club_id: 'Club',
    type: 'Tipo de cancha',
    availability: 'Disponibilidad',
    price_hour: 'Precio por Hora',
    commission: 'Comision'
  };

  constructor(
    private fb: FormBuilder,
    private courtService: CourtService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RegistrarCanchaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any
  ) {
    this.courtForm = this.fb.group({
      name: ['', Validators.required],
      sponsor: ['', Validators.required],
      club_id: [this.data.selectedClubId, Validators.required],
      type: ['', Validators.required],
      availability: ['1', Validators.required],
      price_hour: [0, [Validators.required, Validators.min(1)]],
      commission: [0, [Validators.required, Validators.min(1)]],

      photo: ['']
    });
  }

  ngOnInit() {
    this.loadClubs();
  }

  loadClubs() {
    this.courtService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
      },
      error: (error) => {
        console.error('Error loading clubs:', error);
      }
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo supera los 5MB');
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = e => {
      this.logoPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  onSubmit() {
    if (this.courtForm.invalid) {
      const firstError = this.getFirstFormError();
      this.snackBar.open(firstError || 'Por favor, completa todos los campos requeridos', 'Cerrar', {
        panelClass: ['snackbar-error'],
        horizontalPosition: 'right',
        verticalPosition: 'top',
        duration: 3000
      });
      return;
    }

    if (!this.validateCourtName(this.courtForm.value)) {
      return;
    }

    this.loading = true;
    const formData = new FormData();

    Object.keys(this.courtForm.value).forEach(key => {
      if (key !== 'photo') {
        formData.append(key, this.courtForm.value[key]);
      }
    });

    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
    }

    this.courtService.createCourt(formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.dialogRef.close(response);
        this.snackBar.open('Cancha creada exitosamente', 'Cerrar', {
          panelClass: ['snackbar-success'],
          horizontalPosition: 'right',
          verticalPosition: 'top',
          duration: 3000
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error creating court:', error);
        this.snackBar.open('Error al crear la cancha', 'Cerrar', {
          panelClass: ['snackbar-error'],
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
      }
    });
  }


  onCancel() {
    this.dialogRef.close(false);
  }
  removePhoto(): void {
    this.logoPreview = '../../assets/images/placeholder.png';
  }

  getFirstFormError(): string | null {
    for (const key in this.courtForm.controls) {
      const control = this.courtForm.get(key);
      const label = this.fieldLabels[key] || key;
      if (control && control.invalid) {
        if (control.errors?.['required']) return `El campo "${label}" es obligatorio`;
        if (control.errors?.['min']) return `El campo "${label}" debe tener un valor mínimo de ${control.errors['min'].min}`;
      }
    }
    return null;
  }

  validateCourtName(formData: any) {
    for (const court of this.data.courts) {
      if (court.name === formData.name) {
        this.snackBar.open('Ya existe una cancha con este nombre', 'Cerrar', {
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
}