import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { IntegrantesService, Integrante } from '../../app/services/integrantes.service';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.css'],
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ]
})

export class EstadisticasComponent implements OnInit {
    totalIntegrantes = 25;
totalVictorias = 12;
partidosJugados = 30;
puntosTotales = 450;

displayedColumns: string[] = ['foto','nombre', 'email', 'rol', 'club', 'categoria', 'acciones'];
  dataSource!: MatTableDataSource<Integrante>;
  selectedUsuario: Integrante | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private integrantesService: IntegrantesService) {}

  ngOnInit() {
    
    this.integrantesService.getIntegrantes().subscribe({
      next: (res: any) => {
        const integrantesArray: Integrante[] = res.data ?? [];
        this.dataSource = new MatTableDataSource(integrantesArray);
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => console.error('Error al obtener integrantes:', err)
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    if (this.dataSource) {
      this.dataSource.filter = filterValue.trim().toLowerCase();
    }
  }

  verDetalle(usuario: Integrante) {
    this.selectedUsuario = usuario;
  }

  volverLista() {
    this.selectedUsuario = null;
  }

  abrirModalRegistrarUsuario() {
    console.log('Abrir modal de registro');
  }

  eliminarUsuario(usuario: Integrante) {
    console.log('Eliminar', usuario);
  }

  onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.src = '../../../assets/images/iconuser.png';
}
}
