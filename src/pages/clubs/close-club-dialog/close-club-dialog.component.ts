// club-close-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ClubsService, Club, ClubClosedDay } from '../../../app/services/clubs.service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
    selector: 'app-club-close-dialog',
    templateUrl: './close-club-dialog.component.html',
    styleUrls: ['./close-club-dialog.component.css'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatDividerModule,
        MatSnackBarModule
    ]
})
export class ClubCloseDialogComponent implements OnInit {
    form: FormGroup;
    clubs: Club[] = [];

    constructor(
        private fb: FormBuilder,
        private clubsService: ClubsService,
        private dialogRef: MatDialogRef<ClubCloseDialogComponent>,
        private snackBar: MatSnackBar,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.form = this.fb.group({
            club_id: [null, Validators.required],
            day: [null, Validators.required],
            reason: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        this.clubsService.getClubsa().subscribe(res => {
            this.clubs = res.data || [];
        });
    }

    guardar() {
        if (this.form.invalid) {
            this.snackBar.open('Por favor completa todos los campos', 'Cerrar', { duration: 3000 });
            return;
        }

        const payload = this.form.value;

        this.clubsService.createClubClosedDay(payload).subscribe({
            next: (res: ClubClosedDay) => {
                this.snackBar.open('✅ Día cerrado registrado', 'Cerrar', { duration: 3000 });
                this.dialogRef.close(res);
            },
            error: err => {
                console.error('Error al registrar día cerrado', err);
                this.snackBar.open('❌ Error al guardar', 'Cerrar', { duration: 3000 });
            }
        });
    }

    cancelar(): void {
        this.dialogRef.close();
    }
}
