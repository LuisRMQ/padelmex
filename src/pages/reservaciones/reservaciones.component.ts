import { Component, OnInit, ViewChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator,MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource,MatTableModule } from '@angular/material/table';
import { CurrencyPipe, CommonModule } from '@angular/common';
export interface Reservacion {
  cancha: string;
  estado: string;
  horaInicio: string;
  horaFinal: string;
  costo: number;
}


const ELEMENT_DATA: Reservacion[] = [
  { cancha: 'Cancha Norte', estado: 'Coahuila', horaInicio: '8:00 am', horaFinal: '10:00 am', costo: 1500 }
];

@Component({
  selector: 'app-reservaciones',
  templateUrl: './reservaciones.component.html',
  styleUrls: ['./reservaciones.component.css'],
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatExpansionModule,
    MatDialogModule,
    MatSelectModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    CurrencyPipe

  ],
})
export class ReservacionesComponent implements OnInit {
  displayedColumns: string[] = ['cancha', 'estado', 'horaInicio', 'horaFinal', 'costo', 'acciones'];
  dataSource = new MatTableDataSource<Reservacion>(ELEMENT_DATA);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  eliminar(element: Reservacion) {
    console.log('Eliminar', element);
  }
}