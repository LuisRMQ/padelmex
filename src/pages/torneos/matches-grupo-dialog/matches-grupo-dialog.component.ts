import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TournamentService } from '../../../app/services/torneos.service';

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
    FormsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './matches-grupo-dialog.component.html',
  styleUrls: ['./matches-grupo-dialog.component.css']
})
export class MatchesGrupoDialogComponent implements OnInit {
  games: Game[] = [];
  currentSetIndex: number = 0;
  maxSets: number = 3;
  loading = false;
  savingGameId: number | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { games: Game[] },
    private dialogRef: MatDialogRef<MatchesGrupoDialogComponent>,
    private tournamentService: TournamentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.games = this.data.games.map(game => ({
      ...game,
      sets: game.sets || this.initializeSets()
    }));
    
    // Cargar datos actualizados de cada juego
    this.loadGamesDetails();
  }

  private initializeSets(): Set[] {
    return Array.from({ length: this.maxSets }, (_, i) => ({
      set_number: i + 1,
      score_1: 0,
      score_2: 0
    }));
  }

  private loadGamesDetails() {
    this.games.forEach(game => {
      if (game.game_id) {
        this.tournamentService.getGameDetail(game.game_id).subscribe({
          next: (response) => {
            if (response.status === 'success' && response.data) {
              const gameDetail = response.data;
              const gameIndex = this.games.findIndex(g => g.game_id === game.game_id);
              if (gameIndex !== -1) {
                // Actualizar sets desde la API
                if (gameDetail.sets && gameDetail.sets.length > 0) {
                  this.games[gameIndex].sets = gameDetail.sets.map(set => ({
                    set_number: set.set_number,
                    score_1: set.score_1,
                    score_2: set.score_2,
                    winner: set.score_1 > set.score_2 ? 1 : set.score_2 > set.score_1 ? 2 : undefined
                  }));
                }
                
                // Actualizar estado y ganador
                this.games[gameIndex].status_game = gameDetail.status_game;
                if (gameDetail.winner && gameDetail.winner.couple_id) {
                  this.games[gameIndex].winner_id = gameDetail.winner.couple_id;
                }
              }
            }
          },
          error: (error) => {
            console.error('Error cargando detalles del juego:', error);
          }
        });
      }
    });
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
    if (!game.sets || game.status_game === 'Completed') return false;
    
    const setsPlayed = game.sets.filter(set => set.score_1 > 0 || set.score_2 > 0);
    const team1Wins = this.getTeamScore(game.sets, 1);
    const team2Wins = this.getTeamScore(game.sets, 2);
    
    return setsPlayed.length > 0 && (team1Wins === 2 || team2Wins === 2);
  }

  saveGame(game: Game) {
    if (!this.canSaveGame(game)) {
      this.snackBar.open('No se puede guardar: el partido no está completo o ya está finalizado', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.loading = true;
    this.savingGameId = game.game_id;

    // Determinar ganador
    const team1Wins = this.getTeamScore(game.sets, 1);
    const team2Wins = this.getTeamScore(game.sets, 2);
    game.winner_id = team1Wins > team2Wins ? game.couple_1.id : game.couple_2.id;

    // Guardar todos los sets
    this.saveAllSets(game).then(() => {
      this.snackBar.open('Resultados guardados exitosamente', 'Cerrar', {
        duration: 3000,
      });
      this.loading = false;
      this.savingGameId = null;
      
      // Actualizar estado local
      game.status_game = 'Completed';
      
    }).catch(error => {
      console.error('Error al guardar el partido:', error);
      this.snackBar.open('Error al guardar los resultados', 'Cerrar', {
        duration: 5000,
      });
      this.loading = false;
      this.savingGameId = null;
    });
  }

  private saveAllSets(game: Game): Promise<void> {
    const promises: Promise<void>[] = [];

    if (game.sets) {
      game.sets.forEach((set, index) => {
        if (set.score_1 > 0 || set.score_2 > 0) {
          promises.push(this.saveSet(game.game_id, set));
        }
      });
    }

    return Promise.all(promises).then(() => {});
  }

  private saveSet(gameId: number, set: Set): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tournamentService.storeSet({
        game_id: gameId,
        set_number: set.set_number,
        score_1: set.score_1,
        score_2: set.score_2
      }).subscribe({
        next: (response: any) => {
          console.log(`Set ${set.set_number} guardado:`, response);
          resolve();
        },
        error: (error) => {
          console.error(`Error guardando set ${set.set_number}:`, error);
          reject(error);
        }
      });
    });
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

  // Método para verificar si un set está completo
  isSetComplete(set: Set): boolean {
    return set.score_1 > 0 && set.score_2 > 0;
  }

  // Método para obtener el progreso del partido
  getGameProgress(game: Game): number {
    if (!game.sets) return 0;
    const completedSets = game.sets.filter(set => this.isSetComplete(set)).length;
    return (completedSets / this.maxSets) * 100;
  }

  // Verificar si se está guardando un juego específico
  isSavingGame(game: Game): boolean {
    return this.loading && this.savingGameId === game.game_id;
  }

  // Método para resetear los scores de un juego
  resetGame(game: Game) {
    if (game.sets) {
      game.sets.forEach(set => {
        set.score_1 = 0;
        set.score_2 = 0;
        set.winner = undefined;
      });
      game.winner_id = null;
      game.status_game = 'Not started';
    }
  }

  // Verificar si un juego tiene scores ingresados
  hasScores(game: Game): boolean {
    return game.sets?.some(set => set.score_1 > 0 || set.score_2 > 0) || false;
  }
}