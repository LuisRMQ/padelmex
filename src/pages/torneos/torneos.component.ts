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
import { MatGridListModule } from '@angular/material/grid-list';
import { RegistrarTorneoDialogComponent } from '../torneos/registrar-torneo-dialog/registrar-torneo-dialog.component'; 
import { MatDialogModule, MatDialog } from '@angular/material/dialog';


interface Torneo {
    id: number;
    nombre: string;
    descripcion: string;
    fecha: string;
}


@Component({
    selector: 'app-torneos',
    standalone: true,
    templateUrl: './torneos.component.html',
    styleUrls: ['./torneos.component.css'],
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatGridListModule,
        
    ]
})

export class TorneosComponent implements OnInit {


    torneos: Torneo[] = [
    { id: 1, nombre: 'Copa Verano', descripcion: 'Torneo amistoso de verano', fecha: '2025-09-20' },
    { id: 2, nombre: 'Liga MX', descripcion: 'Torneo profesional', fecha: '2025-10-01' }
  ];

    displayedColumns: string[] = ['foto', 'nombre', 'email', 'rol', 'club', 'categoria', 'acciones'];
    dataSource!: MatTableDataSource<Integrante>;
    selectedUsuario: Integrante | null = null;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(private integrantesService: IntegrantesService,private dialog: MatDialog) { }

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



    abrirModalRegistrarTorneo() {
    const dialogRef = this.dialog.open(RegistrarTorneoDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe((nuevoTorneo) => {
      if (nuevoTorneo) {
        this.torneos.push({
          ...nuevoTorneo,
          id: this.torneos.length + 1
        });
      }
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


    abrirFormulario() {
        console.log('Abrir formulario de torneo');

    }


    eliminarUsuario(usuario: Integrante) {
        console.log('Eliminar', usuario);
    }

    onImageError(event: Event) {
        const target = event.target as HTMLImageElement;
        target.src = '../../../assets/images/iconuser.png';
    }
}
