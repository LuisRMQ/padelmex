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
import { RegistrarIntegranteDialogComponent } from './registrar-integrantes-dialog/registrar-integrante-dialog.component';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ReservacionesIntegranteDialogComponent } from './reservaciones-integrantes-dialog/reservaciones-integrantes-dialog.component';



@Component({
  selector: 'app-integrantes',
  standalone: true,
  templateUrl: './integrantes.component.html',
  styleUrls: ['./integrantes.component.css'],
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule
  ]
})
export class IntegrantesComponent implements OnInit {
  displayedColumns: string[] = ['foto', 'nombre', 'email', 'rol', 'club', 'categoria', 'acciones'];
  dataSource!: MatTableDataSource<Integrante>;
  selectedUsuario: Integrante | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private integrantesService: IntegrantesService,private dialog: MatDialog,) { }

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

  abrirModalRegistrarIntegrante() {
    const dialogRef = this.dialog.open(RegistrarIntegranteDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.integrantesService.getIntegrantes().subscribe({
      next: (res: any) => {
        const integrantesArray: Integrante[] = res.data ?? [];
        this.dataSource = new MatTableDataSource(integrantesArray);
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => console.error('Error al obtener integrantes:', err)
    });
    });
  }

  eliminarUsuario(usuario: Integrante) {
    console.log('Eliminar', usuario);
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '../../../assets/images/iconuser.png';
  }


  
    VerReservaciones(usuario: Integrante) {
      this.dialog.open(ReservacionesIntegranteDialogComponent, {
        width: 'auto',       
        maxWidth: '95vw',   
        maxHeight: '90vh',   
        data: { userId: usuario.id!, nombre: usuario.name }
      })
    }
}
