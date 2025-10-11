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
    ],
})
export class RegistrarGanadorDialogComponent {
    loading = false;
    error: string | null = null;

    // Scores por set
    score1_set1 = 0;
    score2_set1 = 0;
    score1_set2 = 0;
    score2_set2 = 0;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { partido: Partido },
        private dialogRef: MatDialogRef<RegistrarGanadorDialogComponent>,
        private tournamentService: TournamentService,
        private snackBar: MatSnackBar  

    ) { }

    confirmar() {
        const gameId = this.data.partido.id;
        if (!gameId) {
            this.error = 'No se pudo identificar el partido';
            return;
        }

        const set1 = { score_1: this.score1_set1, score_2: this.score2_set1 };
        const ganador = set1.score_1 > set1.score_2 ? 'jugador1' : 'jugador2';

        this.loading = true;

        this.tournamentService.storeSet({
            game_id: gameId,
            set_number: 1,
            score_1: set1.score_1,
            score_2: set1.score_2
        }).subscribe({
            next: () => {
                const set2 = { score_1: this.score1_set2, score_2: this.score2_set2 };
                this.tournamentService.storeSet({
                    game_id: gameId,
                    set_number: 2,
                    score_1: set2.score_1,
                    score_2: set2.score_2
                }).subscribe({
                    next: () => {
                        this.loading = false;
                        this.snackBar.open('Score ingresado correctamente', 'Cerrar', {
                            duration: 3000,
                            horizontalPosition: 'center',
                            verticalPosition: 'top',
                        });
                        this.dialogRef.close(this.data.partido[ganador]);
                    },
                    error: (err) => {
                        console.error(err);
                        this.loading = false;
                        this.error = 'Error guardando el segundo set';
                    }
                });
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
                this.error = 'Error guardando el primer set';
            }
        });
    }


    cancelar() {
        this.dialogRef.close();
    }
}
