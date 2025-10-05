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
  clubId: number | null = null;
  clubName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private courtService: CourtService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RegistrarCanchaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club_id: number, club_name: string }

  ) {
    this.clubId = data.club_id;
    this.clubName = data.club_name;
    
    this.courtForm = this.fb.group({
      name: ['', Validators.required],
      sponsor: ['', Validators.required],
      club_id: [this.clubId, Validators.required],
      type: ['', Validators.required],
      availability: ['1', Validators.required],
      price_hour: [0, [Validators.required, Validators.min(0)]],

      photo: ['']
    });
  }

  ngOnInit() {
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
      Object.keys(this.courtForm.controls).forEach(key => {
        this.courtForm.get(key)?.markAsTouched();
      });

      this.snackBar.open('⚠️ Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['snackbar-warning']
      });
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
        console.log('Cancha creada:', response);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error creating court:', error);
        this.snackBar.open('❌ Error al crear la cancha', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
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
}