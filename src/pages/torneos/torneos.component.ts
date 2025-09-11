import { Component, OnInit, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
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
import { BracketComponent } from '../torneos/brackets-torneo-dialog/brackets-torneo-dialog.component';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';

interface Torneo {
  id: number;
  nombre: string;
  descripcion: string;
  fecha: string;
  estado?: string;
  participantes?: number;
  premio?: string;
  imagen?: string;
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
    MatDialogModule,
    MatChipsModule
  ],
  providers: [DatePipe]
})
export class TorneosComponent implements OnInit {
  torneos: Torneo[] = [
    { 
      id: 1, 
      nombre: 'Copa Verano', 
      descripcion: 'Torneo amistoso de verano para todos los niveles. ¡Ven y diviértete!', 
      fecha: '2025-09-20',
      estado: 'activo',
      participantes: 16,
      premio: '$5,000 MXN',
      imagen: '../../assets/images/padelaa.png'
    },
    { 
      id: 2, 
      nombre: 'Liga MX Padel', 
      descripcion: 'Torneo profesional con los mejores jugadores de la región', 
      fecha: '2025-10-01',
      estado: 'activo',
      participantes: 32,
      premio: '$15,000 MXN',
      imagen: '../../assets/images/padelaa.png'
    },
    { 
      id: 3, 
      nombre: 'Torneo Invierno', 
      descripcion: 'Competencia de invierno con categorías para todos', 
      fecha: '2025-12-15',
      estado: 'finalizado',
      participantes: 24,
      premio: '$8,000 MXN',
      imagen: '../../assets/images/padelaa.png'
    },
    { 
      id: 4, 
      nombre: 'Copa Amistad', 
      descripcion: 'Torneo recreativo para hacer nuevos amigos', 
      fecha: '2025-08-10',
      estado: 'activo',
      participantes: 20,
      premio: '$3,000 MXN',
      imagen: '../../assets/images/padelaa.png'
    },
    { 
      id: 5, 
      nombre: 'Champions Padel', 
      descripcion: 'El torneo más prestigioso del año, ven con nosotros', 
      fecha: '2025-11-05',
      estado: 'activo',
      participantes: 40,
      premio: '$20,000 MXN',
      imagen: '../../assets/images/padelaa.png'
    },
    { 
      id: 6, 
      nombre: 'Torneo Primavera', 
      descripcion: 'Celebración de primavera con partidos emocionantes', 
      fecha: '2025-03-20',
      estado: 'finalizado',
      participantes: 28,
      premio: '$6,000 MXN',
      imagen: '../../assets/images/padelaa.png'
    }
  ];

  displayedColumns: string[] = ['foto', 'nombre', 'email', 'rol', 'club', 'categoria', 'acciones'];
  dataSource!: MatTableDataSource<Integrante>;
  selectedUsuario: Integrante | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private integrantesService: IntegrantesService, 
    private dialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef,
    private datePipe: DatePipe
  ) { }

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

  getCols(): number {
    if (window.innerWidth < 768) {
      return 1;
    } else if (window.innerWidth < 1024) {
      return 2;
    } else {
      return 3;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.changeDetectorRef.detectChanges();
  }

  abrirBracket(torneo: any) {
    this.dialog.open(BracketComponent, {
      width: '90vw',
      height: '80vh',
      maxWidth: '1200px',
      maxHeight: '800px',
      data: { participantes: torneo.participantes },
      panelClass: 'custom-dialog'
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
          id: this.torneos.length + 1,
          estado: 'activo',
          participantes: 0,
          premio: '$0 MXN'
        });
      }
    });
  }

  verDetalles(torneo: Torneo) {
   
    console.log('Ver detalles:', torneo);
    // Aquí puedes implementar la lógica para ver detalles
  }

  editarTorneo(torneo: Torneo) {
    console.log('Editar torneo:', torneo);
    // Aquí puedes implementar la lógica para editar
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
    target.src = '../../../assets/images/placeholder.png';
  }
}