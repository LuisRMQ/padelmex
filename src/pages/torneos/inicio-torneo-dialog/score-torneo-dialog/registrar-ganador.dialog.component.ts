import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Partido } from '../inicio-torneo.dialog.component';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { TournamentService, SetDetail, GameDetailResponse, GameDetailApiResponse } from '../../../../app/services/torneos.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-registrar-ganador-dialog',
    templateUrl: './registrar-ganador.dialog.component.html',
    styleUrls: ['./registrar-ganador.dialog.component.css'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatSelectModule,
        MatToolbarModule,
        MatRadioModule,
        MatProgressSpinnerModule,
    ],
})
export class RegistrarGanadorDialogComponent {
    loading = false;
    error: string | null = null;

    // Scores por set - inicializar como null para mejor UX
    score1_set1: number | null = null;
    score2_set1: number | null = null;
    score1_set2: number | null = null;
    score2_set2: number | null = null;
    score1_set3: number | null = null;
    score2_set3: number | null = null;

    // Nuevas propiedades para el diseño mejorado
    completedSets = 0;
    totalScore1: number | null = null;
    totalScore2: number | null = null;

    disabledSet1 = false;
    disabledSet2 = false;
    disabledSet3 = false;

    // Nueva propiedad para almacenar los sets existentes
    existingSets: SetDetail[] = [];
    gameDetail: GameDetailResponse | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { partido: Partido },
        private dialogRef: MatDialogRef<RegistrarGanadorDialogComponent>,
        private tournamentService: TournamentService,
        private snackBar: MatSnackBar
    ) {
        // Al inicializar, cargar los sets existentes
        this.loadExistingSets();
    }

    // Método para cargar los sets existentes del partido
    private loadExistingSets(): void {
        const gameId = this.data.partido.id;
        if (!gameId) {
            console.log('No hay gameId, partido nuevo');
            this.loading = false;
            this.existingSets = []; // Inicializar como array vacío
            return;
        }

        this.loading = true;

        this.tournamentService.getGameDetail(gameId).subscribe({
            next: (response: GameDetailApiResponse) => {
                if (response.status === 'success' && response.data) {
                    this.gameDetail = response.data;

                    // Asegurar que existingSets siempre sea un array
                    this.existingSets = response.data.sets || [];

                    this.populateScoresFromExistingSets();

                    // Si el partido ya está completado, deshabilitar todo
                    if (response.data.status_game === 'completed') {
                        this.disableAllInputs();
                    }
                } else {
                    // Si no hay data, inicializar como array vacío
                    this.existingSets = [];
                }
                this.loading = false;
            },
            error: (err) => {
                console.error('Error al cargar sets existentes:', err);

                // Inicializar como array vacío en caso de error
                this.existingSets = [];

                // Si es un error 404 o similar (partido no tiene datos), no es un error crítico
                if (err.status === 404) {
                    console.log('Partido sin datos existentes, se pueden ingresar nuevos sets');
                } else {
                    this.snackBar.open('Error al cargar los datos del partido', 'Cerrar', {
                        duration: 5000,
                        horizontalPosition: 'center',
                        verticalPosition: 'top'
                    });
                }

                this.loading = false;
            }
        });
    }

    // Método para poblar los scores desde los sets existentes
    private populateScoresFromExistingSets(): void {
        // Verificar que existingSets no sea null o undefined
        if (!this.existingSets || !Array.isArray(this.existingSets)) {
            console.log('No hay sets existentes para poblar');
            this.existingSets = []; // Asegurar que sea un array vacío
            return;
        }

        // Reiniciar estados antes de poblar
        this.disabledSet1 = false;
        this.disabledSet2 = false;
        this.disabledSet3 = false;
        this.score1_set1 = null;
        this.score2_set1 = null;
        this.score1_set2 = null;
        this.score2_set2 = null;
        this.score1_set3 = null;
        this.score2_set3 = null;

        // Poblar solo si hay sets
        this.existingSets.forEach(set => {
            if (set && set.set_number) {
                switch (set.set_number) {
                    case 1:
                        this.score1_set1 = set.score_1;
                        this.score2_set1 = set.score_2;
                        this.disabledSet1 = true;
                        break;
                    case 2:
                        this.score1_set2 = set.score_1;
                        this.score2_set2 = set.score_2;
                        this.disabledSet2 = true;
                        break;
                    case 3:
                        this.score1_set3 = set.score_1;
                        this.score2_set3 = set.score_2;
                        this.disabledSet3 = true;
                        break;
                }
            }
        });

        this.calcularProgreso();
    }

    // Método para deshabilitar todos los inputs si el partido está completado
    private disableAllInputs(): void {
        this.disabledSet1 = true;
        this.disabledSet2 = true;
        this.disabledSet3 = true;
    }

    // Método para calcular sets completados y puntuación total
    private calcularProgreso(): void {
        let setsCompletados = 0;
        if (this.score1_set1 !== null && this.score2_set1 !== null) setsCompletados++;
        if (this.score1_set2 !== null && this.score2_set2 !== null) setsCompletados++;
        if (this.score1_set3 !== null && this.score2_set3 !== null) setsCompletados++;
        this.completedSets = setsCompletados;
    }

    // Método para determinar si un equipo es el ganador
    isWinningTeam(teamNumber: number): boolean {
        // Verificaciones más estrictas
        if (!this.gameDetail ||
            !this.gameDetail.winner ||
            !this.gameDetail.winner.players ||
            !Array.isArray(this.gameDetail.winner.players) ||
            !this.data?.partido) {
            return false;
        }

        let teamPlayers: any[] = [];

        if (teamNumber === 1) {
            teamPlayers = this.data.partido.jugador1 || [];
        } else if (teamNumber === 2) {
            teamPlayers = this.data.partido.jugador2 || [];
        } else {
            return false;
        }

        // Verificar que teamPlayers sea un array válido
        if (!Array.isArray(teamPlayers) || teamPlayers.length === 0) {
            return false;
        }

        // Buscar coincidencias de IDs
        return teamPlayers.some(player => {
            if (!player || !player.id) return false;

            return this.gameDetail!.winner.players.some(winner =>
                winner && winner.id && winner.id === player.id
            );
        });
    }

    // Método modificado para guardar sets individuales
    guardarSet(setNumber: number) {
    if (this.loading) return;

    const gameId = this.data.partido.id;
    if (!gameId) {
        this.snackBar.open('Error: No se encontró el partido', 'Cerrar', { duration: 3000 });
        return;
    }

    let score1: number | null = null;
    let score2: number | null = null;

    // Asignar los valores según el set correspondiente
    switch (setNumber) {
        case 1:
            score1 = this.score1_set1;
            score2 = this.score2_set1;
            break;
        case 2:
            score1 = this.score1_set2;
            score2 = this.score2_set2;
            break;
        case 3:
            score1 = this.score1_set3;
            score2 = this.score2_set3;
            break;
        default:
            this.snackBar.open('Número de set inválido', 'Cerrar', { duration: 3000 });
            return;
    }

    // Validaciones
    if (score1 === null || score2 === null) {
        this.snackBar.open(`Ingresa ambos puntajes para el Set ${setNumber}`, 'Cerrar', { duration: 3000 });
        return;
    }

    if (score1 === score2) {
        this.snackBar.open('Los puntajes no pueden ser iguales', 'Cerrar', { duration: 3000 });
        return;
    }

    if (score1 > 7 || score2 > 7) {
        this.snackBar.open('❌ Ningún puntaje puede ser mayor a 7', 'Cerrar', { duration: 3500 });
        return;
    }

    if (!(score1 === 6 || score1 === 7 || score2 === 6 || score2 === 7)) {
        this.snackBar.open('El set debe tener un ganador con 6 o 7 ', 'Cerrar', { duration: 3500 });
        return;
    }

    this.loading = true;

    this.tournamentService.storeSet({
        game_id: gameId,
        set_number: setNumber,
        score_1: score1,
        score_2: score2
    }).subscribe({
        next: (response: any) => {
            this.loading = false;

            // ⭐ Mensaje del backend si existe
            const msg = response.message ?? `Set ${setNumber} guardado correctamente`;

            this.snackBar.open(msg, 'Cerrar', {
                duration: 4000,
                horizontalPosition: 'center',
                verticalPosition: 'top'
            });

            // Deshabilitar set guardado
            if (setNumber === 1) this.disabledSet1 = true;
            if (setNumber === 2) this.disabledSet2 = true;
            if (setNumber === 3) this.disabledSet3 = true;

            this.calcularProgreso();
            this.loadExistingSets();
        },
        error: (err) => {
            this.loading = false;

            // ⭐ Muestra mensaje del backend si viene
            const backendMsg = err?.error?.message ?? `Error al guardar Set ${setNumber}`;

            this.snackBar.open(backendMsg, 'Cerrar', {
                duration: 4000,
                horizontalPosition: 'center',
                verticalPosition: 'top'
            });

            console.error(err);
        }
    });
}


    // Método para manejar cambios en los inputs y recalcular progreso
    onScoreChange(): void {
        this.calcularProgreso();
    }

    cancelar() {
        this.dialogRef.close();
    }

    // Getter para verificar si se puede confirmar
    get canConfirm(): boolean {
        return this.completedSets >= 2;
    }

    // Getter para verificar si el partido ya está completado
    get isGameCompleted(): boolean {
        return this.gameDetail?.status_game === 'completed';
    }

    // Getter para verificar si es un partido nuevo
    get isNewGame(): boolean {
        return this.existingSets.length === 0 && !this.loading;
    }

    // Getter para obtener el texto del estado del partido
    get gameStatusText(): string {
        if (this.isGameCompleted) {
            return 'Partido Completado';
        } else if (this.completedSets > 0) {
            return 'Partido en Progreso';
        } else {
            return 'Partido por Iniciar';
        }
    }

    registrarResultado() {
        // Si ya está cargando, no hacer nada
        if (this.loading) {
            return;
        }

        // Si el partido ya está completado, no permitir cambios
        if (this.isGameCompleted) {
            this.snackBar.open('Este partido ya está completado y no se puede modificar', 'Cerrar', {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'top'
            });
            return;
        }

        // Verificar y guardar sets que no estén completados
        if (this.score1_set1 === null || this.score2_set1 === null) {
            this.snackBar.open('Ingresa ambos puntajes del Set 1', 'Cerrar', { duration: 4000 });
            return;
        } else if (!this.disabledSet1) {
            this.guardarSet(1);
            return;
        }

        if (this.score1_set2 === null || this.score2_set2 === null) {
            this.snackBar.open('Ingresa ambos puntajes del Set 2', 'Cerrar', { duration: 4000 });
            return;
        } else if (!this.disabledSet2) {
            this.guardarSet(2);
            return;
        }

        // Evaluar ganador después de 2 sets
        let setsGanados1 = 0;
        let setsGanados2 = 0;
        if (this.score1_set1 > this.score2_set1) setsGanados1++; else setsGanados2++;
        if (this.score1_set2 > this.score2_set2) setsGanados1++; else setsGanados2++;

        if (setsGanados1 === 2 || setsGanados2 === 2) {
            const ganador = setsGanados1 > setsGanados2 ? 'jugador1' : 'jugador2';
            this.confirmarPartido(ganador);
            return;
        }

        // Si 1-1, Set 3
        if (this.score1_set3 === null || this.score2_set3 === null) {
            this.snackBar.open('Empate 1-1. Ingresa el Set 3 para definir al ganador.', 'Cerrar', { duration: 4000 });
            return;
        } else if (!this.disabledSet3) {
            this.guardarSet(3);
            return;
        }

        // Ganador final con Set 3
        if (this.score1_set3 !== null && this.score2_set3 !== null) {
            if (this.score1_set3 > this.score2_set3) setsGanados1++; else setsGanados2++;
            const ganador = setsGanados1 > setsGanados2 ? 'jugador1' : 'jugador2';
            this.confirmarPartido(ganador);
        }
    }

    private confirmarPartido(ganador: string) {
        console.log('Confirmando partido con ganador:', ganador);
        this.loading = true;

        const gameId = this.data.partido.id ?? 0;

        // Función helper para conversión segura
        const toSafeNumber = (value: number | null): number => {
            return value === null ? 0 : Number(value);
        };

        this.loading = false;
        this.snackBar.open('Resultado registrado correctamente', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
        });
        this.dialogRef.close({
            ganador,
            partido: this.data.partido,
            scores: {
                set1: {
                    score1: toSafeNumber(this.score1_set1),
                    score2: toSafeNumber(this.score2_set1)
                },
                set2: {
                    score1: toSafeNumber(this.score1_set2),
                    score2: toSafeNumber(this.score2_set2)
                },
                set3: {
                    score1: toSafeNumber(this.score1_set3),
                    score2: toSafeNumber(this.score2_set3)
                }
            }
        });
    }

    onImgError(event: Event) {
        (event.target as HTMLImageElement).src = '../../../assets/images/iconuser.png';
    }

    // Método para determinar qué equipo va ganando en tiempo real
    getWinningTeam(): number | null {
        if (this.isGameCompleted) {
            return this.isWinningTeam(1) ? 1 : this.isWinningTeam(2) ? 2 : null;
        }

        // Calcular sets ganados en tiempo real
        let setsGanados1 = 0;
        let setsGanados2 = 0;

        // Set 1
        if (this.score1_set1 !== null && this.score2_set1 !== null) {
            if (this.score1_set1 > this.score2_set1) setsGanados1++;
            else if (this.score2_set1 > this.score1_set1) setsGanados2++;
        }

        // Set 2
        if (this.score1_set2 !== null && this.score2_set2 !== null) {
            if (this.score1_set2 > this.score2_set2) setsGanados1++;
            else if (this.score2_set2 > this.score1_set2) setsGanados2++;
        }

        // Set 3
        if (this.score1_set3 !== null && this.score2_set3 !== null) {
            if (this.score1_set3 > this.score2_set3) setsGanados1++;
            else if (this.score2_set3 > this.score1_set3) setsGanados2++;
        }

        if (setsGanados1 > setsGanados2) return 1;
        if (setsGanados2 > setsGanados1) return 2;
        return null; // Empate
    }

    // Método para obtener el marcador actual
    getCurrentScore(): string {
        let setsGanados1 = 0;
        let setsGanados2 = 0;

        if (this.score1_set1 !== null && this.score2_set1 !== null && this.score1_set1 !== this.score2_set1) {
            if (this.score1_set1 > this.score2_set1) setsGanados1++;
            else setsGanados2++;
        }

        if (this.score1_set2 !== null && this.score2_set2 !== null && this.score1_set2 !== this.score2_set2) {
            if (this.score1_set2 > this.score2_set2) setsGanados1++;
            else setsGanados2++;
        }

        if (this.score1_set3 !== null && this.score2_set3 !== null && this.score1_set3 !== this.score2_set3) {
            if (this.score1_set3 > this.score2_set3) setsGanados1++;
            else setsGanados2++;
        }

        return `${setsGanados1} - ${setsGanados2}`;
    }

    // Método para verificar si un equipo está ganando en tiempo real
    isTeamWinning(teamNumber: number): boolean {
        const winningTeam = this.getWinningTeam();
        return winningTeam === teamNumber;
    }

    // Método para obtener los nombres de los ganadores
    getWinnerNames(): string {
        if (!this.gameDetail?.winner?.players || !Array.isArray(this.gameDetail.winner.players)) {
            return 'Ganador no definido';
        }

        return this.gameDetail.winner.players
            .map(player => player?.name || 'Jugador')
            .join(' / ');
    }
}