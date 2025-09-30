import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UsersService, Reservation } from '../../../app/services/users.service';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 


@Component({
    selector: 'app-reservaciones-integrantes-dialog',
    templateUrl: './reservaciones-integrantes-dialog.component.html',
    styleUrls: ['./reservaciones-integrantes-dialog.component.css'],
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        MatInputModule,
        MatDialogModule,
        MatIconModule,
        MatExpansionModule,
        MatProgressSpinnerModule

    ]
})
export class ReservacionesIntegranteDialogComponent implements OnInit {
    displayedColumns: string[] = [
        'date',
        'hora',
        'precio',
        'court',
        'club',
        'status',
        'typeReservation'
    ];
    dataSource = new MatTableDataSource<Reservation>([]);
    loading = true;

    constructor(
        private usersService: UsersService,
        private dialogRef: MatDialogRef<ReservacionesIntegranteDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { userId: number; nombre: string }
    ) { }

    ngOnInit(): void {
        this.usersService.getUserReservations(this.data.userId).subscribe({
            next: (reservations) => {
                this.dataSource.data = reservations;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error al cargar reservaciones:', err);
                this.loading = false;
            }
        });
    }

    cerrar() {
        this.dialogRef.close();
    }
}
