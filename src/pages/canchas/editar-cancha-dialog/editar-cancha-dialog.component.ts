import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Court } from '../../../app/services/court.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatIconModule } from "@angular/material/icon";
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { ClubsService, Club } from '../../../app/services/clubs.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-editar-cancha-dialog',
    templateUrl: './editar-cancha-dialog.component.html',
    styleUrls: ['./editar-cancha-dialog.component.css'],
    standalone: true,
    imports: [
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        ReactiveFormsModule,
        CommonModule,
        FormsModule,
        MatSlideToggleModule,
        MatIconModule,
        MatExpansionModule,
        MatDialogModule,
        MatCardModule
    ]
})
export class EditarCanchaDialogComponent {
    courtForm: FormGroup;
    selectedFile: File | null = null;
    logoPreview: string;
    clubs: Club[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { court: Court },
        private dialogRef: MatDialogRef<EditarCanchaDialogComponent>,
        private fb: FormBuilder,
        private ClubsService: ClubsService

    ) {
        this.logoPreview = data.court.photo || '../../assets/images/placeholder.png';

        this.courtForm = this.fb.group({
            name: [data.court.name, Validators.required],
            sponsor: [data.court.sponsor, Validators.required],
            type: [data.court.type, Validators.required],
            availability: [data.court.availability, Validators.required],
            price_hour: [data.court.price_hour || 0, [Validators.required, Validators.min(0)]],
            club_id: [data.court.club_id, Validators.required],
            photo: ['']
        });
    }


    ngOnInit() {
        this.loadClubs();
    }


    loadClubs() {
        this.ClubsService.getClubsa().subscribe({
            next: (response) => {
                this.clubs = response.data;  // <--- solo el array
            },
            error: (err) => console.error(err)
        });
    }

    onFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            this.courtForm.patchValue({ photo: e.target?.result });
        };
        reader.readAsDataURL(file);
    }

    guardar() {
        if (!this.courtForm.valid) {
            Object.keys(this.courtForm.controls).forEach(key => {
                this.courtForm.get(key)?.markAsTouched();
            });
            return;
        }

        const formData = new FormData();

        Object.keys(this.courtForm.value).forEach(key => {
            if (key !== 'photo') {
                formData.append(key, this.courtForm.value[key]);
            }
        });

        if (this.selectedFile) {
            formData.append('photo', this.selectedFile);
        }

        // Incluye el id de la cancha
        formData.append('id', this.data.court.id.toString());

        console.log('FormData enviado al backend:');
        for (let pair of formData.entries()) {
            console.log(pair[0], ':', pair[1]);
        }

        this.dialogRef.close(formData); 
    }



    cancelar() {
        this.dialogRef.close(false);
    }


    removePhoto() {
  this.selectedFile = null;
  this.courtForm.patchValue({ photo: '' });
}


    onCancel() {
        this.dialogRef.close(false);
    }
}
