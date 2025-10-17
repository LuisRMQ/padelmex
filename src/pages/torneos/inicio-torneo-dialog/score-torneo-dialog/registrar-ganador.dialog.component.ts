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
import { TournamentService } from '../../../../app/services/torneos.service';
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
        MatProgressSpinnerModule, // Añadir este import
    ],
})
export class RegistrarGanadorDialogComponent {
    loading = false;
    error: string | null = null;

    // Scores por set - inicializar como null para mejor UX
    score1_set1: number | null = 0;
    score2_set1: number | null = 0;
    score1_set2: number | null = 0;
    score2_set2: number | null = 0;
    score1_set3: number | null = 0;
    score2_set3: number | null = 0;
    // Nuevas propiedades para el diseño mejorado
    completedSets = 0;
    totalScore1: number | null = null;
    totalScore2: number | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { partido: Partido },
        private dialogRef: MatDialogRef<RegistrarGanadorDialogComponent>,
        private tournamentService: TournamentService,
        private snackBar: MatSnackBar
    ) { }

    // Método para calcular sets completados y puntuación total
    private calcularProgreso(): void {
        let setsCompletados = 0;

        if (this.score1_set1 !== null && this.score2_set1 !== null) setsCompletados++;
        if (this.score1_set2 !== null && this.score2_set2 !== null) setsCompletados++;
        if (this.score1_set3 !== null && this.score2_set3 !== null) setsCompletados++;

        this.completedSets = setsCompletados;

        if (this.completedSets === 3) {
            this.totalScore1 = (this.score1_set1 || 0) + (this.score1_set2 || 0) + (this.score1_set3 || 0);
            this.totalScore2 = (this.score2_set1 || 0) + (this.score2_set2 || 0) + (this.score2_set3 || 0);
        } else {
            this.totalScore1 = null;
            this.totalScore2 = null;
        }
    }

    // Método modificado para guardar sets individuales
    guardarSet(setNumber: number) {
        const gameId = this.data.partido.id;
        if (!gameId) {
            this.snackBar.open('Error: No se pudo identificar el partido', 'Cerrar', {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'top'
            });
            return;
        }

        let score1, score2;

        if (setNumber === 1) {
            if (this.score1_set1 === null || this.score2_set1 === null) {
                this.snackBar.open('Por favor ingresa ambos puntajes para el Set 1', 'Cerrar', {
                    duration: 5000,
                    horizontalPosition: 'center',
                    verticalPosition: 'top'
                });
                return;
            }
            score1 = this.score1_set1;
            score2 = this.score2_set1;
        } else {
            if (this.score1_set2 === null || this.score2_set2 === null) {
                this.snackBar.open('Por favor ingresa ambos puntajes para el Set 2', 'Cerrar', {
                    duration: 5000,
                    horizontalPosition: 'center',
                    verticalPosition: 'top'
                });
                return;
            }
            score1 = this.score1_set2;
            score2 = this.score2_set2;
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
                const mensaje = response.message || `Set ${setNumber} guardado correctamente`;
                this.snackBar.open(mensaje, 'Cerrar', {
                    duration: 5000,
                    horizontalPosition: 'center',
                    verticalPosition: 'top'
                });

                // Recalcular progreso después de guardar
                this.calcularProgreso();
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
                this.snackBar.open(`Error guardando Set ${setNumber}`, 'Cerrar', {
                    duration: 5000,
                    horizontalPosition: 'center',
                    verticalPosition: 'top'
                });
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
        return this.completedSets === 2;
    }

    registrarResultado() {
        const gameId = this.data.partido.id;
        if (!gameId) {
            this.snackBar.open('Error: no se pudo identificar el partido.', 'Cerrar', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
            });
            return;
        }

        // Validar que los primeros dos sets estén completos
        if (
            this.score1_set1 === null || this.score2_set1 === null ||
            this.score1_set2 === null || this.score2_set2 === null
        ) {
            this.snackBar.open('Completa los resultados del Set 1 y Set 2.', 'Cerrar', {
                duration: 4000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
            });
            return;
        }

        // Contar sets ganados por cada equipo
        let setsGanados1 = 0;
        let setsGanados2 = 0;

        if (this.score1_set1 > this.score2_set1) setsGanados1++;
        else if (this.score2_set1 > this.score1_set1) setsGanados2++;

        if (this.score1_set2 > this.score2_set2) setsGanados1++;
        else if (this.score2_set2 > this.score1_set2) setsGanados2++;

        // Si alguno ganó dos sets, fin del partido
        if (setsGanados1 === 2 || setsGanados2 === 2) {
            const ganador = setsGanados1 > setsGanados2 ? 'jugador1' : 'jugador2';
            this.confirmarPartido(ganador);
            return;
        }

        // Si van empatados 1–1, se requiere Set 3
        if (setsGanados1 === 1 && setsGanados2 === 1) {
            if (this.score1_set3 === null || this.score2_set3 === null) {
                this.snackBar.open(
                    'Empate 1-1. Ingresa el Set 3 para definir el ganador.',
                    'Cerrar',
                    {
                        duration: 4000,
                        horizontalPosition: 'center',
                        verticalPosition: 'top',
                    }
                );
                return;
            }

            // Evaluar tercer set
            if (this.score1_set3 > this.score2_set3) setsGanados1++;
            else setsGanados2++;

            const ganador = setsGanados1 > setsGanados2 ? 'jugador1' : 'jugador2';
            this.confirmarPartido(ganador);
        }
    }



   private confirmarPartido(ganador: string) {
    console.log('Confirmando partido con ganador:', ganador);
    this.loading = true;

    const gameId = this.data.partido.id ?? 0; // ✅ asegura número

    this.tournamentService.storeSet({
        game_id: gameId,
        set_number: 1, // ✅ agrega set_number porque lo espera el servicio
        score_1: this.score1_set1 ?? 0,
        score_2: this.score2_set1 ?? 0
    }).subscribe({
        next: () => {
            this.loading = false;
            this.snackBar.open('Resultado registrado correctamente', 'Cerrar', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
            });
            this.dialogRef.close({ ganador, partido: this.data.partido });
        },
        error: (err) => {
            console.error(err);
            this.loading = false;
            this.snackBar.open('Error al registrar el resultado', 'Cerrar', {
                duration: 4000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
            });
        },
    });
}


    onImgError(event: Event) {
        (event.target as HTMLImageElement).src = '../../../assets/images/iconuser.png';
    }

}