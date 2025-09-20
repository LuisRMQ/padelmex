import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TournamentService, Tournament, Category } from '../../../app/services/torneos.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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
  ) { }

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
      club_id: [1],
      prizes: [''],
      rules: [''],
      photo: [null]
    });

 this.tournamentService.getCategories().subscribe({
      next: (res: any) => {
        this.categoriasDisponibles = res.data;
        console.log('Categorías cargadas:', this.categoriasDisponibles);
      },
      error: (err) => console.error('Error al cargar categorías', err)
    });

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
        photo: torneo.photo,
        categories: torneo.categories ?? []  
      });

      if (torneo.photo) {
        const img = new Image();
        img.src = torneo.photo;
        img.onload = () => this.logoPreview = torneo.photo ?? 'assets/default-torneo.jpg';
        img.onerror = () => this.logoPreview = 'assets/default-torneo.jpg';
      } else {
        this.logoPreview = 'assets/default-torneo.jpg';
      }
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
      prizes: this.form.value.prizes
        ? this.form.value.prizes.split(',').map((p: string) => p.trim())
        : [],
      categories: this.form.value.categories ?? []
    };

    this.tournamentService.updateTournament(this.data.torneoId, torneoData)
      .subscribe(res => {
        this.dialogRef.close(res);
      });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
