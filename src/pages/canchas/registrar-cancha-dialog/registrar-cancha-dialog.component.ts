import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { CourtService, Court, Club } from '../../../app/services/court.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    CommonModule
  ],
  standalone: true
})
export class RegistrarCanchaDialogComponent implements OnInit {

  courtForm: FormGroup;
  clubs: Club[] = [];
  logoPreview: string = '../../assets/images/placeholder.png';
  selectedFile: File | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private courtService: CourtService,
    private snackBar: MatSnackBar,

    private dialogRef: MatDialogRef<RegistrarCanchaDialogComponent>
  ) {
    this.courtForm = this.fb.group({
      name: ['', Validators.required],
      sponsor: ['', Validators.required],
      club_id: ['', Validators.required],
      type: ['', Validators.required],
      availability: ['1', Validators.required],
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
    if (this.courtForm.valid) {
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
          this.dialogRef.close(true);
          
          console.log('Cancha creada:', response);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creating court:', error);
          alert('Error al crear la cancha: ' + (error.error?.msg || error.message));
        }
      });
    } else {
      Object.keys(this.courtForm.controls).forEach(key => {
        this.courtForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}