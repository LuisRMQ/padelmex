import { Component, OnInit } from '@angular/core';
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
import { CdkDragDrop, moveItemInArray, transferArrayItem, DragDropModule } from '@angular/cdk/drag-drop';
import { BracketModalComponent } from '../brackets-torneo-dialog/brackets-torneo-dialog.component';
import { UsersService, User } from '../../../app/services/users.service';
import { TournamentService } from '../../../app/services/torneos.service';
import { AuthService } from '../../../app/services/auth.service';


export interface Participante {
  id: number;
  nombre: string;
  logo?: string;
}

export interface Partido {
  id: number;
  jugador1?: Participante;
  jugador2?: Participante;
  ganador?: Participante;
  x?: number;
  y?: number;
  height?: number;
}

@Component({
  selector: 'app-registrar-torneo',
  templateUrl: './registrar-torneo-dialog.component.html',
  styleUrls: ['./registrar-torneo-dialog.component.css'],
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
    DragDropModule,
    MatDialogModule
  ]
})
export class RegistrarTorneoDialogComponent implements OnInit {
  form: FormGroup;
  logoPreview: string = '../../assets/images/placeholder.png';
  logoFile: File | null = null;

  usuariosDisponibles: User[] = [];
  participantesSeleccionados: User[] = [];
  bracketGenerado: Partido[][] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrarTorneoDialogComponent>,
    private dialog: MatDialog,
    private usersService: UsersService,
    private tournamentService: TournamentService,
    private authService: AuthService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      club_id: [null, Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      registration_deadline: ['', Validators.required],
      registration_fee: [0],
      max_participants: ['', [Validators.required, Validators.min(2)]],
      prizes: [],
      rules: [''],
      photo: [null],
      tournament_call: [null],
      categories: [[]]
    });
  }


  categoriasDisponibles: any[] = [];


  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarCategorias();
    const currentUser = this.authService.getUserData();
    if (currentUser) {
      this.form.patchValue({ club_id: currentUser.club_id });
    }

    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.form.patchValue({ club_id: user.club_id });
      }
    });
  }

  cargarUsuarios() {
    const rol_id = 8;
    this.usersService.getUsersByRol(rol_id).subscribe({
      next: (users) => {
        console.log('Usuarios filtrados por rol_id=8:', users);
        this.usuariosDisponibles = users;
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
      }
    });
  }


  cargarCategorias() {
    this.tournamentService.getCategories().subscribe({
      next: (res: any) => {
        // Solo tomamos el array dentro de "data"
        this.categoriasDisponibles = res.data;
        console.log('Categorías cargadas:', this.categoriasDisponibles);
      },
      error: (err) => console.error('Error al cargar categorías', err)
    });
  }

  guardar() {
    if (this.form.valid) {
      const participantes: Participante[] = this.participantesSeleccionados.map(p => ({
        id: p.id!,
        nombre: `${p.name} ${p.lastname}`,
        logo: p.profile_photo || '../../assets/images/placeholder.png'
      }));

      this.bracketGenerado = this.generarBracket(participantes);

      const rawData = this.form.value;
      const formData = new FormData();

      formData.append('name', rawData.name);
      formData.append('description', rawData.description || '');
      formData.append('club_id', rawData.club_id.toString()); // ✅ importante
      formData.append('start_date', rawData.start_date);
      formData.append('end_date', rawData.end_date);
      formData.append('registration_deadline', rawData.registration_deadline);
      formData.append('registration_fee', rawData.registration_fee?.toString() ?? '0');
      formData.append('max_participants', rawData.max_participants.toString());
      formData.append('rules', rawData.rules || '');

      if (this.logoFile) {
        formData.append('photo', this.logoFile);
      }
      if (rawData.tournament_call instanceof File) {
        formData.append('tournament_call', rawData.tournament_call);
      }

      if (Array.isArray(rawData.prizes)) {
        rawData.prizes.forEach((p: string, i: number) => {
          formData.append(`prizes[${i}]`, p);
        });
      }

      if (Array.isArray(rawData.categories)) {
        rawData.categories.forEach((cat: any, i: number) => {
          formData.append(`categories[${i}][id]`, cat.id.toString());
          formData.append(`categories[${i}][max_participants]`, (cat.max_participants ?? '').toString());
        });
      }

      formData.append('participantes', JSON.stringify(this.participantesSeleccionados));
      formData.append('bracket', JSON.stringify(this.bracketGenerado));

      this.tournamentService.createTournament(formData).subscribe({
        next: (res) => {
          console.log('Torneo creado correctamente:', res);
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error al crear torneo:', err);
          alert('Error al crear torneo. Revisa la consola.');
        }
      });



    
    } else {
      this.form.markAllAsTouched();
    }
  }


  private generarBracket(participantes: Participante[]): Partido[][] {
    const shuffled = [...participantes].sort(() => Math.random() - 0.5);
    let ronda: Partido[] = [];
    let idCounter = 1;

    for (let i = 0; i < shuffled.length; i += 2) {
      ronda.push({ id: idCounter++, jugador1: shuffled[i], jugador2: shuffled[i + 1] });
    }

    const partidos: Partido[][] = [ronda];

    while (ronda.length > 1) {
      const nextRonda: Partido[] = [];
      for (let i = 0; i < ronda.length; i += 2) {
        nextRonda.push({ id: idCounter++, jugador1: undefined, jugador2: undefined });
      }
      partidos.push(nextRonda);
      ronda = nextRonda;
    }

    return partidos;
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
    reader.onload = e => { this.logoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  drop(event: CdkDragDrop<User[]>) {
    const limit = this.form.get('max_participants')?.value || Infinity;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    if (event.container.data === this.participantesSeleccionados) {
      if (this.participantesSeleccionados.length >= limit) {
        alert(`Máximo ${limit} jugadores permitidos.`);
        return;
      }
      const item = event.previousContainer.data[event.previousIndex];
      if (this.participantesSeleccionados.find(u => u.id === item.id)) return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }

  onCancel() { this.dialogRef.close(false); }

   removePhoto(): void {
    this.logoPreview = '../../assets/images/placeholder.png';
  }
}
