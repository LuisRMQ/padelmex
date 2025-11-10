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
    set_id?: number;

  set_number: number;
  score_1: number;
  score_2: number;
  winner?: number;
  is_completed?: boolean;
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
  loading = false;
  savingGameId: number | null = null;
  savingSetGameId: number | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { games: Game[] },
    private dialogRef: MatDialogRef<MatchesGrupoDialogComponent>,
    private tournamentService: TournamentService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.games = this.data.games.map(game => ({
      ...game,
      sets: game.sets || this.initializeSets()
    }));

    this.loadGamesDetails();
  }

  private initializeSets(): Set[] {
    return Array.from({ length: 3 }, (_, i) => ({
      set_number: i + 1,
      score_1: 0,
      score_2: 0,
      is_completed: false
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
                if (gameDetail.sets && gameDetail.sets.length > 0) {
                  this.games[gameIndex].sets = gameDetail.sets.map(set => ({
                    set_number: set.set_number,
                    score_1: set.score_1,
                    score_2: set.score_2,
                    winner: set.score_1 > set.score_2 ? 1 : set.score_2 > set.score_1 ? 2 : undefined,
                    is_completed: true // Los sets de la API ya están completados
                  }));

                  // Completar sets faltantes
                  for (let i = gameDetail.sets.length; i < 3; i++) {
                    this.games[gameIndex].sets!.push({
                      set_number: i + 1,
                      score_1: 0,
                      score_2: 0,
                      is_completed: false
                    });
                  }
                }

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
    return sets.filter(set => set.is_completed &&
      (teamNumber === 1 ? set.score_1 > set.score_2 : set.score_2 > set.score_1)
    ).length;
  }

  // Verificar si un set está habilitado para edición
  isSetEnabled(game: Game, setIndex: number): boolean {
    if (!game.sets) return false;

    // El primer set siempre está habilitado
    if (setIndex === 0) return true;

    // El set anterior debe estar completado
    const previousSet = game.sets[setIndex - 1];
    if (!previousSet || !previousSet.is_completed) return false;

    // Para el tercer set, solo habilitar si hay empate en los primeros dos sets
    if (setIndex === 2) {
      const team1Wins = this.getTeamScore(game.sets, 1);
      const team2Wins = this.getTeamScore(game.sets, 2);
      return team1Wins === 1 && team2Wins === 1;
    }

    return true;
  }

  // Guardar un set individual
  saveSet(game: Game, setIndex: number) {
    if (!game.sets) return;

    const set = game.sets[setIndex];

    // Validaciones antes de guardar
    if (!this.isSetComplete(set)) {
      if (set.score_1 === set.score_2) {
        this.snackBar.open('Los scores no pueden ser iguales', 'Cerrar', {
          duration: 3000,
        });
      } else if (set.score_1 === 0 && set.score_2 === 0) {
        this.snackBar.open('Ingresa al menos un score mayor que cero', 'Cerrar', {
          duration: 3000,
        });
      } else {
        this.snackBar.open('Completa el set correctamente antes de guardar', 'Cerrar', {
          duration: 3000,
        });
      }
      return;
    }

    this.savingSetGameId = game.game_id;

    this.tournamentService.storeSet({
      game_id: game.game_id,
      set_number: set.set_number,
      score_1: set.score_1,
      score_2: set.score_2
    }).subscribe({
      next: (response: any) => {
        console.log(`Set ${set.set_number} guardado:`, response);
        set.is_completed = true;
        set.winner = set.score_1 > set.score_2 ? 1 : 2;

        // Verificar si después de guardar este set el partido queda decidido
        const team1Wins = this.getTeamScore(game.sets, 1);
        const team2Wins = this.getTeamScore(game.sets, 2);

        // Si después del set 2 el partido está decidido (2-0), marcar automáticamente
        // AGREGAR VERIFICACIÓN DE SEGURIDAD
        if (setIndex === 1 && (team1Wins === 2 || team2Wins === 2) && game.sets) {
          // El partido terminó 2-0, marcar el tercer set como no jugado
          if (game.sets[2]) {
            game.sets[2].is_completed = true;
            game.sets[2].score_1 = 0;
            game.sets[2].score_2 = 0;
            game.sets[2].winner = undefined;
          }
        }

        // Verificar si el partido está completo
        this.checkIfGameIsComplete(game);

        this.snackBar.open(`Set ${set.set_number} guardado exitosamente`, 'Cerrar', {
          duration: 3000,
        });
        this.savingSetGameId = null;
      },
      error: (error) => {
        console.error(`Error guardando set ${set.set_number}:`, error);
        this.snackBar.open('Error al guardar el set', 'Cerrar', {
          duration: 5000,
        });
        this.savingSetGameId = null;
      }
    });
  }

  // Verificar si un set está completo
  isSetComplete(set: Set): boolean {
    // Un set está completo si:
    // - Ambos scores tienen valor (pueden ser cero)
    // - Los scores son diferentes (no puede ser empate)
    // - Al menos un score es mayor que cero
    return set.score_1 >= 0 &&
      set.score_2 >= 0 &&
      set.score_1 !== set.score_2 &&
      (set.score_1 > 0 || set.score_2 > 0);
  }

  // Verificar si el partido está completo
  private checkIfGameIsComplete(game: Game) {
    if (!game.sets) return;

    const team1Wins = this.getTeamScore(game.sets, 1);
    const team2Wins = this.getTeamScore(game.sets, 2);

    // El partido está completo si:
    // - Algún equipo tiene 2 sets ganados (2-0, 2-1)
    // - O se han jugado 3 sets (2-1, 1-2)
    if (team1Wins === 2 || team2Wins === 2 ||
      (game.sets.filter(set => set.is_completed).length === 3)) {
      game.winner_id = team1Wins > team2Wins ? game.couple_1.id : game.couple_2.id;
      game.status_game = 'Completed';

      // Marcar automáticamente como completados los sets que no se jugaron
      // en caso de victoria 2-0 - AGREGAR VERIFICACIÓN DE SEGURIDAD
      if (game.sets) {
        if (team1Wins === 2 && team2Wins === 0) {
          // El tercer set no se jugó, marcarlo como no aplicable
          if (game.sets[2]) {
            game.sets[2].is_completed = true;
            game.sets[2].score_1 = 0;
            game.sets[2].score_2 = 0;
            game.sets[2].winner = undefined;
          }
        } else if (team1Wins === 0 && team2Wins === 2) {
          // El tercer set no se jugó, marcarlo como no aplicable
          if (game.sets[2]) {
            game.sets[2].is_completed = true;
            game.sets[2].score_1 = 0;
            game.sets[2].score_2 = 0;
            game.sets[2].winner = undefined;
          }
        }
      }

      this.markGameAsCompleted(game);
    } else {
      game.status_game = 'In progress';
    }
  }

  private markGameAsCompleted(game: Game) {
    // Aquí podrías llamar a un endpoint para marcar el juego como completado
    console.log('Partido completado:', game);
  }

  // Método para actualizar el score de un set
  updateSetScore(game: Game, setIndex: number, team: 1 | 2, value: string) {
    if (!game.sets) return;

    const set = game.sets[setIndex];
    const numValue = Math.max(0, parseInt(value) || 0); // Permite cero

    if (team === 1) {
      set.score_1 = numValue;
    } else {
      set.score_2 = numValue;
    }

    // Resetear estado completado si se modifica
    set.is_completed = false;
    set.winner = undefined;

    // Validar que no haya empate
    if (set.score_1 === set.score_2 && set.score_1 > 0) {
      this.snackBar.open('Los scores no pueden ser iguales', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  close() {
    this.dialogRef.close(this.games);
  }

  getGameStatus(game: Game): string {
    if (game.status_game === 'completed') return 'Completado';
    if (game.sets?.some(set => set.is_completed)) return 'En progreso';
    return 'No iniciado';
  }

  getStatusColor(game: Game): string {
    switch (game.status_game) {
      case 'completed': return 'completed';
      case 'In progress': return 'in-progress';
      default: return 'not-started';
    }
  }

  // Verificar si se está guardando un set específico
  isSavingSet(game: Game, setIndex: number): boolean {
    return this.savingSetGameId === game.game_id &&
      game.sets?.[setIndex] !== undefined &&
      !game.sets[setIndex].is_completed;
  }

  // Obtener el texto del botón del set
  getSetButtonText(set: Set): string {
    return set.is_completed ? 'Guardado' : 'Guardar Set';
  }

  // Verificar si el botón de guardar set debe estar deshabilitado
  isSaveSetDisabled(game: Game, setIndex: number): boolean {
    if (!game.sets) return true;

    const set = game.sets[setIndex];
    return !this.isSetComplete(set) || set.is_completed || this.isSavingSet(game, setIndex);
  }

  isMatchDecided(game: Game): boolean {
    if (!game.sets) return false;

    const team1Wins = this.getTeamScore(game.sets, 1);
    const team2Wins = this.getTeamScore(game.sets, 2);

    // El partido está decidido si algún equipo tiene 2 sets ganados
    // O si después del set 2 algún equipo tiene ventaja (2-0, 0-2, 2-1, 1-2)
    const completedSets = game.sets.filter(set => set.is_completed).length;

    if (completedSets >= 2) {
      return team1Wins === 2 || team2Wins === 2 ||
        (completedSets === 2 && team1Wins !== team2Wins);
    }

    return false;
  }


editSet(game: Game, setIndex: number) {
  const set = game.sets?.[setIndex];
  if (!set) return;

  // Marcar el set como editable
  set.is_completed = false;

  this.snackBar.open(`Editando Set ${set.set_number}`, 'Cerrar', {
    duration: 2000,
  });
}

  updateSet(game: Game, setIndex: number, setId: number) {
    const set = game.sets?.[setIndex];
    if (!set) return;

    if (!this.isSetComplete(set)) {
      this.snackBar.open('Completa el set correctamente antes de actualizar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.savingSetGameId = game.game_id;

    this.tournamentService.updateSet(setId, {
      game_id: game.game_id,
      set_number: set.set_number,
      score_1: set.score_1,
      score_2: set.score_2
    }).subscribe({
      next: (response) => {
        console.log(`✅ Set ${set.set_number} actualizado:`, response);
        set.is_completed = true;
        set.winner = set.score_1 > set.score_2 ? 1 : 2;

        this.snackBar.open(`Set ${set.set_number} actualizado correctamente`, 'Cerrar', {
          duration: 3000,
        });
        this.savingSetGameId = null;
      },
      error: (error) => {
        console.error('❌ Error actualizando set:', error);
        this.snackBar.open('Error al actualizar el set', 'Cerrar', { duration: 3000 });
        this.savingSetGameId = null;
      }
    });
  }
}