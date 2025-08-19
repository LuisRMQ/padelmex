import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { RegistrarClienteDialogComponent } from '../clientes/registrar-cliente-dialog/registrar-cliente-dialog.component';
import { MatDialog } from '@angular/material/dialog';

export interface Usuario {
  nombre: string;
  telefono: string;
  puntos: string;
  fechaNacimiento: string;
  totalGastado: number;
  fechaRegistro: string;
  fotoPerfil: string;
  identificacion: string;
  genero: string;
  correo: string;
  apellidos: string;
  manoPreferida: string;
}

const USUARIOS_DATA: Usuario[] = [
  { nombre: 'Luis', telefono: '8714046757', puntos: 'luisalberto20304@hotmail.com', fechaNacimiento: '01/03/2000', totalGastado: 54350.50, fechaRegistro: '01/08/2025', fotoPerfil: '../../assets/images/userm.jpg', identificacion: '../../assets/images/ine.png', genero: 'Masculino', correo: 'luisalberto20304@hotmail.com', apellidos: 'Ramirez', manoPreferida: 'Derecha' },
  { nombre: 'Jimena', telefono: '8713529978', puntos: 'jimena1@gmail.com', fechaNacimiento: '10/04/2004', totalGastado: 22350.50, fechaRegistro: '02/07/2025', fotoPerfil: '../../assets/images/userm.jpg', identificacion: '../../assets/images/ine.png', genero: 'Masculino', correo: 'ramona20304@hotmail.com', apellidos: 'Lopez', manoPreferida: 'Izquierda' },

];


@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatExpansionModule,
    MatDialogModule,
    MatCardModule,
    MatDividerModule,
    FormsModule,
    MatSelectModule
  ]
})
export class ClientesComponent implements OnInit {
  movimientos: any[] = []; // <-- Agrega esta línea en tu clase ClientesComponent

  displayedColumns: string[] = ['nombre', 'telefonos', 'correos', 'fechas', 'totales', 'registros', 'acciones'];
  dataSource = new MatTableDataSource<Usuario>(USUARIOS_DATA);
  editando: boolean = false;
  formUsuario: any = {};
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  eliminarUsuario(usuario: Usuario) {
    console.log('Eliminar usuario', usuario);
  }

  selectedUsuario: any = null;

  verDetalle(usuario: any) {
    this.selectedUsuario = usuario;
     this.movimientos = [
      { tipo: 'Compra', concepto: 'Tenis deportivos', fecha: new Date('2025-08-10'), total: 1200 },
      { tipo: 'Renta', concepto: 'Raqueta de tenis', fecha: new Date('2025-08-12'), total: 150 },
      { tipo: 'Compra', concepto: 'Pelotas de tenis', fecha: new Date('2025-08-15'), total: 300 },
      { tipo: 'Renta', concepto: 'Cancha de tenis', fecha: new Date('2025-08-17'), total: 200 },
      { tipo: 'Compra', concepto: 'Camiseta deportiva', fecha: new Date('2025-08-18'), total: 450 }
    ];
  }

  volverLista() {
    this.selectedUsuario = null;
  }

  editarUsuario(usuario: any) {
    this.editando = true;
    this.formUsuario = { ...usuario }; // copia de datos para edición
  }

  guardarCambios() {
    // Aquí llamas a tu servicio para actualizar
    this.selectedUsuario = { ...this.formUsuario };
    this.editando = false;
  }

  cancelarEdicion() {
    this.editando = false;
    this.formUsuario = { ...this.selectedUsuario }; // restaurar datos originales
  }


  constructor(private dialog: MatDialog) { }

  abrirModalRegistrarCliente() {
    this.dialog.open(RegistrarClienteDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });


  }
}