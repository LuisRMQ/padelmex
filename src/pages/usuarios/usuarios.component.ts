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
import { RegistrarUsuarioDialogComponent } from './registrar-usuario-dialog/registrar-usuario-dialog.component';
import { MatDialog } from '@angular/material/dialog';


export interface Usuario {
  nombre: string;
  victorias: string;
  puntos: number;
  rol: string;
  club: string;
  categoria: string;
  fotoPerfil: string;
  identificacion: string;
  genero: string;
  correo: string;
  apellidos: string;
  manoPreferida: string;
}

const USUARIOS_DATA: Usuario[] = [
  { nombre: 'Luis', victorias: '5/11', puntos: 124, rol: 'Jugador', club: 'MexPadel', categoria: 'Varonil', fotoPerfil: '../../assets/images/userm.jpg', identificacion: '../../assets/images/ine.png', genero: 'Masculino', correo: 'luisalberto20304@hotmail.com', apellidos: 'Ramirez', manoPreferida: 'Derecha' },
  { nombre: 'Ramona', victorias: '5/11', puntos: 258, rol: 'Jugador', club: 'MexPadel', categoria: 'Femenino', fotoPerfil: '../../assets/images/userm.jpg', identificacion: '../../assets/images/ine.png', genero: 'Masculino', correo: 'ramona20304@hotmail.com', apellidos: 'Lopez', manoPreferida: 'Izquierda' },

];

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
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
export class UsuariosComponent implements OnInit {

  displayedColumns: string[] = ['nombre', 'victorias', 'puntos', 'rol', 'club', 'categoria', 'acciones'];
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

  abrirModalRegistrarUsuario() {
    this.dialog.open(RegistrarUsuarioDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });
}

}
