import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TournamentService, Tournament, Category } from '../../../app/services/torneos.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

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
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class EditarTorneoDialogComponent implements OnInit {

  form!: FormGroup;
  logoPreview: string = '../../assets/images/placeholder.png';
  logoFile: File | null = null;

  categoriasDisponibles: Category[] = [];
  premiosDisponibles: string[] = ['Trofeo', 'Medallas', 'Premios en efectivo'];
  clubsDisponibles: any[] = [];

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
      club_id: [null, Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      registration_deadline: ['', Validators.required],
      registration_fee: [0],
      prizes: [],
      rules: [''],
      photo: [null],
      categories: this.fb.array([])
    });

    this.cargarCategorias();
    this.cargarClubs();
    this.cargarTorneo(this.data.torneoId);
  }

  get categories(): FormArray {
    return this.form.get('categories') as FormArray;
  }

  getCategoryFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  cargarCategorias() {
    this.tournamentService.getCategories().subscribe({
      next: (res: any) => this.categoriasDisponibles = res.data,
      error: (err) => console.error('Error al cargar categorías', err)
    });
  }

  cargarClubs() {
    this.tournamentService.getClubs().subscribe({
      next: (res: any) => this.clubsDisponibles = res.data,
      error: (err) => console.error('Error al cargar clubs', err)
    });
  }

  cargarTorneo(id: number) {
    this.tournamentService.getTournament(id).subscribe((torneo: Tournament) => {
      this.form.patchValue({
        name: torneo.name,
        description: torneo.description,
        club_id: torneo.club_id,
        start_date: new Date(torneo.start_date),
        end_date: new Date(torneo.end_date),
        registration_deadline: new Date(torneo.registration_deadline),
        registration_fee: torneo.registration_fee,
        prizes: torneo.prizes ?? [],
        rules: torneo.rules
      });

      this.logoPreview = torneo.photo ?? '../../assets/images/placeholder.png';

      // Categorías
      this.categories.clear();
      (torneo.categories || []).forEach(cat => {
        this.categories.push(this.fb.group({
          id: [cat.id],
          category: [cat.category],
          max_participants: [cat.max_participants ?? '']
        }));
      });
    });
  }

  onCategorySelected(selected: Category[]) {
    this.categories.clear();
    selected.forEach(cat => {
      this.categories.push(this.fb.group({
        id: [cat.id],
        category: [cat.category],
        max_participants: ['']
      }));
    });
  }

  guardar() {
    if (this.form.invalid) return;

    const rawData = this.form.value;
    const formData = new FormData();

    const formatDate = (date: any): string => {
      if (!date) return '';
      const d = new Date(date);
      const month = ('0' + (d.getMonth() + 1)).slice(-2);
      const day = ('0' + d.getDate()).slice(-2);
      return `${d.getFullYear()}-${month}-${day}`;
    };

    formData.append('name', rawData.name);
    formData.append('description', rawData.description || '');
    formData.append('club_id', rawData.club_id.toString());
    formData.append('start_date', formatDate(rawData.start_date));
    formData.append('end_date', formatDate(rawData.end_date));
    formData.append('registration_deadline', formatDate(rawData.registration_deadline));
    formData.append('registration_fee', rawData.registration_fee?.toString() ?? '0');
    formData.append('rules', rawData.rules || '');

    if (this.logoFile) formData.append('photo', this.logoFile);

    if (Array.isArray(rawData.prizes)) {
      rawData.prizes.forEach((p: string, i: number) => formData.append(`prizes[${i}]`, p));
    }

    this.categories.controls.forEach((catCtrl, i) => {
      const cat = catCtrl.value;
      formData.append(`categories[${i}][id]`, cat.id.toString());
      formData.append(`categories[${i}][max_participants]`, (cat.max_participants ?? '').toString());
    });

    this.tournamentService.updateTournament(this.data.torneoId, formData).subscribe({
      next: () => this.dialogRef.close(true),
      error: err => console.error('Error al actualizar torneo:', err)
    });
  }

  onCancel() { this.dialogRef.close(false); }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = e => this.logoPreview = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.logoPreview = '../../assets/images/placeholder.png';
    this.logoFile = null;
  }
}
