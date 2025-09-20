import { MAT_DIALOG_DATA,  } from '@angular/material/dialog';
import { TournamentService, Tournament, Category } from '../../../app/services/torneos.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { Component, Inject, OnInit } from '@angular/core';


@Component({
  selector: 'app-editar-torneo-dialog',
  templateUrl: './editar-torneo-dialog.component.html',
  styleUrls: ['./editar-torneo-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogModule
  ]
})
export class EditarTorneoDialogComponent implements OnInit {

  form!: FormGroup;
  logoPreview: string | ArrayBuffer | null = null;
  categoriasDisponibles: Category[] = [];

  constructor(
    private fb: FormBuilder,
    private tournamentService: TournamentService,
    private dialogRef: MatDialogRef<EditarTorneoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      registration_deadline: ['', Validators.required],
      registration_fee: [0, Validators.required],
      categories: [[]],
      max_participants: [2, Validators.required],
      prizes: [''],
      rules: [''],
      photo: [null]
    });

    // Cargar categorías
    this.tournamentService.getCategories().subscribe(cats => this.categoriasDisponibles = cats);

    // Cargar datos del torneo
    this.cargarTorneo(this.data.torneoId);
  }

  cargarTorneo(id: number) {
    this.tournamentService.getTournament(id).subscribe((torneo: Tournament) => {
      this.form.patchValue({
        name: torneo.name,
        description: torneo.description,
        start_date: torneo.start_date,
        end_date: torneo.end_date,
        registration_deadline: torneo.registration_deadline,
        registration_fee: torneo.registration_fee,
        max_participants: torneo.max_participants,
        prizes: torneo.prizes?.join(', '),
        rules: torneo.rules,
        photo: torneo.photo
      });
      this.logoPreview = torneo.photo || null;
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.form.patchValue({ photo: file });
      const reader = new FileReader();
      reader.onload = e => this.logoPreview = reader.result;
      reader.readAsDataURL(file);
    }
  }

  guardar() {
    if (this.form.invalid) return;

    const torneoData = {
      ...this.form.value,
      prizes: this.form.value.prizes ? this.form.value.prizes.split(',').map((p: string) => p.trim()) : []
    };

    this.tournamentService.updateTournament(this.data.torneoId, torneoData).subscribe(res => {
      this.dialogRef.close(res); // devolvemos torneo actualizado
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
