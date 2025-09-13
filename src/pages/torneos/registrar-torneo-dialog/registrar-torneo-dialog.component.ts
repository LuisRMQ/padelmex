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

  usuariosDisponibles: User[] = [];
  participantesSeleccionados: User[] = [];
  bracketGenerado: Partido[][] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RegistrarTorneoDialogComponent>,
    private dialog: MatDialog,
    private usersService: UsersService
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      fecha: ['', Validators.required],
      categoria: ['', Validators.required],
      cantidad_jugadores: ['', [Validators.required, Validators.min(2)]],
      ganador: [''],
      precio: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
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

  guardar() {
    if (this.form.valid) {
      const participantes: Participante[] = this.participantesSeleccionados.map(p => ({
        id: p.id!,
        nombre: `${p.name} ${p.lastname}`,
        logo: p.profile_photo || '../../assets/images/placeholder.png'
      }));

      this.bracketGenerado = this.generarBracket(participantes);

      this.dialog.open(BracketModalComponent, {
        width: '90%',
        height: '80%',
        data: { bracket: this.bracketGenerado }
      });

      const data = {
        ...this.form.value,
        participantes: this.participantesSeleccionados,
        bracket: this.bracketGenerado
      };

      console.log('Torneo guardado:', data);
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

    const reader = new FileReader();
    reader.onload = e => { this.logoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  drop(event: CdkDragDrop<User[]>) {
    const limit = this.form.get('cantidad_jugadores')?.value || Infinity;

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

    const ganadorCtrl = this.form.get('ganador');
    if (ganadorCtrl?.value && !this.participantesSeleccionados.find(u => u.id === ganadorCtrl.value.id)) {
      ganadorCtrl.setValue('');
    }
  }

  onCancel() { this.dialogRef.close(false); }
}
