import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReservationService, Reservation, ReservationsResponse } from '../../app/services/reservation.service';
import { MatIconModule } from '@angular/material/icon';
import { ReservacionesDetailsDialogComponent } from './reservaciones-details-dialog/reservaciones-details-dialog.component';
import { ViewEncapsulation } from '@angular/core';




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
    MatInputModule,
    MatIconModule,
    
  ]
})
export class ReservacionesComponent implements OnInit {

displayedColumns: string[] = ['user', 'court', 'club', 'date', 'start_time', 'status', 'acciones'];
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
        console.log(res)
        this.dataSource.data = res.data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
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
  
verDetalle(res: any) {
  console.log('Reservación seleccionada:', res);
  console.log('User ID:', res.userId, 'Reservation ID:', res.reservationId);

  this.reservationService.getReservationDetailsByUser(res.userId, res.reservationId).subscribe({
    next: (response: any) => {
      console.log('Respuesta de API:', response);
      const players = response.reservation_players?.map((rp: any) => ({
        name: rp.user.name,
        lastname: rp.user.lastname,
        profile_photo: rp.user.profile_photo
      })) || [];

      this.dialog.open(ReservacionesDetailsDialogComponent, {
         width: '800px',
      maxWidth: '80vw',
      maxHeight: '80vh',
      panelClass: 'custom-modal-panel',
      height: '80vh',
        data: {
          details: response,
          players: players,
          user: `${response.user.name} ${response.user.lastname}`
        }
      });
    },
    error: (err) => {
      console.error('Error al obtener detalles de reservación', err);
    }
  });
}





  editarReservacion(res: Reservation) {
    console.log('Editar reservación:', res);
  }

  eliminarReservacion(res: Reservation) {
    console.log('Eliminar reservación:', res);
  }

  // Helpers para resumen
  getTotalReservaciones(): number {
    return this.dataSource.data.length;
  }

  getTotalReservacionesByStatus(status: string): number {
    return this.dataSource.data.filter(r => r.status === status).length;
  }
}
