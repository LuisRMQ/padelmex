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

    ganadorSeleccionado: 'jugador1' | 'jugador2' | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { partido: Partido, roundIndex: number, matchIndex: number },
        private dialogRef: MatDialogRef<RegistrarGanadorDialogComponent>
    ) { }

    confirmar() {
        if (this.ganadorSeleccionado) {
            const ganador = this.data.partido[this.ganadorSeleccionado];
            this.dialogRef.close(ganador);
        }
    }

    cancelar() {
        this.dialogRef.close();
    }
}
