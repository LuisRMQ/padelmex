import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReservationService, Reservation, ReservationsResponse } from '../../app/services/reservation.service';

@Component({
  selector: 'app-reservaciones',
  standalone: true,
  templateUrl: './reservaciones.component.html',
  styleUrls: ['./reservaciones.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class ReservacionesComponent implements OnInit {

  displayedColumns: string[] = ['user', 'court', 'club', 'date', 'start_time', 'end_time', 'status'];
  dataSource = new MatTableDataSource<Reservation>();
  loading = false;
  error = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations() {
    this.loading = true;
    this.error = '';

    this.reservationService.getReservations().subscribe({
      next: (res: ReservationsResponse) => {
        this.dataSource.data = res.data;
        this.loading = false;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (err) => {
        console.error('Error al cargar reservaciones', err);
        this.error = '❌ Error al cargar reservaciones';
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
