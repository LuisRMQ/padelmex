import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface Game {
  game_id: number;
  phase: string;
  status_game: string;
  winner_id: number | null;
  couple_1: {
    id: number;
    players: Player[];
  };
  couple_2: {
    id: number;
    players: Player[];
  };
  sets?: Set[];
  court?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
}

export interface Player {
  id: number;
  name: string;
  photo: string;
  level: string;
}

export interface Set {
  set_number: number;
  score_1: number;
  score_2: number;
  winner?: number;
}

@Component({
  selector: 'app-matches-grupo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './matches-grupo-dialog.component.html',
  styleUrls: ['./matches-grupo-dialog.component.css']
})
export class MatchesGrupoDialogComponent implements OnInit {
  games: Game[] = [];
  currentSetIndex: number = 0;
  maxSets: number = 3;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { games: Game[] },
    private dialogRef: MatDialogRef<MatchesGrupoDialogComponent>
  ) {}

  ngOnInit() {
    this.games = this.data.games.map(game => ({
      ...game,
      sets: game.sets || this.initializeSets()
    }));
  }

  private initializeSets(): Set[] {
    return Array.from({ length: this.maxSets }, (_, i) => ({
      set_number: i + 1,
      score_1: 0,
      score_2: 0
    }));
  }

  getPlayerNames(players: Player[]): string {
    return players.map(p => p.name).join(' / ');
  }

  getTeamScore(sets: Set[] | undefined, teamNumber: 1 | 2): number {
    if (!sets) return 0;
    return sets.filter(set => 
      teamNumber === 1 ? set.score_1 > set.score_2 : set.score_2 > set.score_1
    ).length;
  }

  updateSetScore(game: Game, setIndex: number, team: 1 | 2, value: number) {
    if (!game.sets) return;
    
    const set = game.sets[setIndex];
    if (set) {
      if (team === 1) {
        set.score_1 = Math.max(0, value);
      } else {
        set.score_2 = Math.max(0, value);
      }
      
      // Determinar ganador del set
      if (set.score_1 > set.score_2) {
        set.winner = 1;
      } else if (set.score_2 > set.score_1) {
        set.winner = 2;
      } else {
        set.winner = undefined;
      }
    }
  }

  canSaveGame(game: Game): boolean {
    if (!game.sets) return false;
    
    const setsPlayed = game.sets.filter(set => set.score_1 > 0 || set.score_2 > 0);
    const team1Wins = this.getTeamScore(game.sets, 1);
    const team2Wins = this.getTeamScore(game.sets, 2);
    
    return setsPlayed.length > 0 && (team1Wins === 2 || team2Wins === 2);
  }

  saveGame(game: Game) {
    if (!this.canSaveGame(game)) return;

    const team1Wins = this.getTeamScore(game.sets, 1);
    const team2Wins = this.getTeamScore(game.sets, 2);
    
    game.winner_id = team1Wins > team2Wins ? game.couple_1.id : game.couple_2.id;
    game.status_game = 'Completed';

    // Aquí integrarías con tu API
    console.log('Guardando partido:', game);
    
    // Simulación de éxito
    this.showSuccessMessage();
  }

  private showSuccessMessage() {
    // Podrías implementar un snackbar o toast aquí
    alert('Resultados guardados exitosamente');
  }

  close() {
    this.dialogRef.close(this.games);
  }

  getGameStatus(game: Game): string {
    if (game.status_game === 'Completed') return 'Completado';
    if (game.sets?.some(set => set.score_1 > 0 || set.score_2 > 0)) return 'En progreso';
    return 'No iniciado';
  }

  getStatusColor(game: Game): string {
    switch (game.status_game) {
      case 'Completed': return 'completed';
      case 'In progress': return 'in-progress';
      default: return 'not-started';
    }
  }
}