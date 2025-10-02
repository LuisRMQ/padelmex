import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray,AbstractControl } from '@angular/forms';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { UsersService, User } from '../../../app/services/users.service';
import { TournamentService } from '../../../app/services/torneos.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule ,ReactiveFormsModule} from '@angular/forms';

export interface Participante {
  id: number;
  nombre: string;
  logo?: string;
}

@Component({
  selector: 'app-registrar-torneo',
  templateUrl: './registrar-torneo-dialog.component.html',
  styleUrls: ['./registrar-torneo-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatOptionModule,
    DragDropModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ReactiveFormsModule,   // <
  ]
})
export class RegistrarTorneoDialogComponent implements OnInit {
  form: FormGroup;
  logoPreview: string = '../../assets/images/placeholder.png';
  logoFile: File | null = null;

  usuariosDisponibles: User[] = [];
  premiosDisponibles: string[] = ['Trofeo', 'Medallas', 'Premios en efectivo'];
  categoriasDisponibles: any[] = [];
  clubsDisponibles: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrarTorneoDialogComponent>,
    private dialog: MatDialog,
    private usersService: UsersService,
    private tournamentService: TournamentService
  ) {
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
      tournament_call: [null],
      categories: this.fb.array([]) 
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarCategorias();
    this.cargarClubs();
  }

  get categories(): FormArray {
    return this.form.get('categories') as FormArray;
  }

  cargarUsuarios() {
    const rol_id = 8;
    this.usersService.getUsersByRol(rol_id).subscribe({
      next: (users) => (this.usuariosDisponibles = users),
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

  cargarCategorias() {
    this.tournamentService.getCategories().subscribe({
      next: (res: any) => (this.categoriasDisponibles = res.data),
      error: (err) => console.error('Error al cargar categorías', err)
    });
  }

  cargarClubs() {
    this.tournamentService.getClubs().subscribe({
      next: (res: any) => (this.clubsDisponibles = res.data),
      error: (err) => console.error('Error al cargar clubs', err)
    });
  }
 getCategoryName(catCtrl: FormGroup): string {
  const id = catCtrl.get('id')?.value;
  return this.categoriasDisponibles.find(c => c.id === id)?.category || '';
}

getCategoryFormGroup(control: AbstractControl): FormGroup {
  return control as FormGroup;
}
  onCategorySelected(selected: any[]) {
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
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

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

    if (Array.isArray(rawData.categories)) {
      rawData.categories.forEach((cat: any, i: number) => {
        formData.append(`categories[${i}][id]`, cat.id.toString());
        formData.append(`categories[${i}][max_participants]`, (cat.max_participants ?? '').toString());
      });
    }

    this.tournamentService.createTournament(formData).subscribe({
      next: (res) => this.dialogRef.close(true),
      error: (err) => {
        console.error('Error al crear torneo:', err);
        alert('Error al crear torneo. Revisa la consola.');
      }
    });
  }

  onCancel() { this.dialogRef.close(false); }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo supera los 5MB');
      return;
    }
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
