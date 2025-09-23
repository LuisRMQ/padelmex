import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { UsersService, User } from '../../../app/services/users.service';
import { BracketModalComponent } from '../brackets-torneo-dialog/brackets-torneo-dialog.component';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export interface Partido {
  jugador1: User | null;
  jugador2: User | null;
  ganador?: User | null;
  x?: number;
  y?: number;
  height?: number;
}

@Component({
  selector: 'app-inicio-torneo-dialog',
  templateUrl: './inicio-torneo.dialog.component.html',
  styleUrls: ['./inicio-torneo.dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatCardModule
  ]
})
export class InicioTorneoDialogComponent implements OnInit {

  participantes: User[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number },
    private dialogRef: MatDialogRef<InicioTorneoDialogComponent>,
    private usersService: UsersService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarParticipantes();
  }

  cargarParticipantes() {
    this.loading = true;
    this.usersService.getUsersByRol(8).subscribe({
      next: (res: User[]) => {
        this.participantes = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los participantes';
        this.loading = false;
        console.error(err);
      }
    });
  }

  generarBracket() {
    if (!this.participantes.length) {
      alert('No hay participantes para generar el bracket');
      return;
    }

    const bracketData: Partido[][] = this.generarBracketData(this.participantes);

    this.dialog.open(BracketModalComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: 'auto',
      maxHeight: '90vh',
      data: { bracket: bracketData }
    });
  }

  private generarBracketData(participantes: User[]): Partido[][] {
    const shuffled = [...participantes].sort(() => Math.random() - 0.5);
    const totalRounds = Math.ceil(Math.log2(shuffled.length));
    const bracket: Partido[][] = [];

    let currentRound: Partido[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      currentRound.push({ jugador1: shuffled[i], jugador2: shuffled[i + 1] ?? null });
    }
    bracket.push(currentRound);

    for (let i = 1; i < totalRounds; i++) {
      const matches = Array(Math.ceil(currentRound.length / 2))
        .fill(0)
        .map(() => ({ jugador1: null, jugador2: null } as Partido));
      bracket.push(matches);
      currentRound = matches;
    }

    return bracket;
  }

}
