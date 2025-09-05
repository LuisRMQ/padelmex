import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';

import { RegistrarUsuarioDialogComponent } from './registrar-usuario-dialog/registrar-usuario-dialog.component';
import { UsersService, User } from '../../app/services/users.service';

export interface UsuarioTabla {
  id?: number;
  nombre: string;
  apellidos: string;
  correo: string;
  genero: string;
  rol: string;
  rol_id?: number;
  club: string;
  club_id?: number;
  categoria: string;
  victorias: string;
  puntos: number;
  fotoPerfil: string;
  manoPreferida: string;
  identificacion: string;
}


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
  dataSource = new MatTableDataSource<UsuarioTabla>([]);
  editando: boolean = false;
  formUsuario: any = {};
  selectedUsuario: any = null;


  roles: { id: number; name: string }[] = [
    { id: 1, name: 'Jugador' },
    { id: 2, name: 'Administrador' }
  ];

  clubs: { id: number; name: string }[] = [
    { id: 1, name: 'Club 1' },
    { id: 2, name: 'Club 2' },
    { id: 3, name: 'Club 3' },
  ];

  categories: { id: number; name: string }[] = [
    { id: 1, name: 'Primera Varonil' },
    { id: 2, name: 'Segunda Varonil' },
    { id: 3, name: 'Primera Femenil' },
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private usersService: UsersService) { }

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.usersService.getUsers().subscribe({
      next: (usuarios) => {
        const usuariosTabla: UsuarioTabla[] = usuarios.map(u => ({
          id: u.id,
          nombre: u.name,
          apellidos: u.lastname,
          correo: u.email,
          genero: u.gender,
          rol: u.rol || '-',
          rol_id: u.rol_id,       // <- traer id real
          club: `Club ${u.club_id}` || '-',
          club_id: u.club_id,     // <- traer id real
          categoria: u.category || '-',
          victorias: '-',
          puntos: 0,
          fotoPerfil: u.profile_photo || '../../assets/images/placeholder.png',
          manoPreferida: '-',
          identificacion: '-'
        }));
        this.dataSource = new MatTableDataSource<UsuarioTabla>(usuariosTabla);
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  eliminarUsuario(usuario: UsuarioTabla) {
    if ((usuario as any).id) {
      this.usersService.desactivarUser((usuario as any).id).subscribe({
        next: (res) => {
          alert(`✅ Usuario desactivado: ${res.msg}`);
          this.cargarUsuarios();
        },
        error: (err) => {
          console.error('Error al desactivar usuario:', err);
          alert('❌ No se pudo desactivar el usuario');
        }
      });
    }
  }


  verDetalle(usuario: UsuarioTabla) {
    this.selectedUsuario = usuario;

    this.formUsuario = {
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      genero: usuario.genero,
      rol: usuario.rol,
      rol_id: usuario.rol_id,    // <- ID correcto
      club: usuario.club,
      club_id: usuario.club_id,  // <- ID correcto
      categoria: usuario.categoria,
      puntos: usuario.puntos,
      manoPreferida: usuario.manoPreferida,
      fotoPerfil: usuario.fotoPerfil,
      identificacion: usuario.identificacion,
      id: usuario.id
    };
  }




  volverLista() {
    this.selectedUsuario = null;
  }

  editarUsuario(usuario: UsuarioTabla) {
    this.editando = true;
    this.formUsuario = { ...usuario };
  }

  guardarCambios() {
    if (!this.formUsuario.id) return;

    const payload: any = {
      name: this.formUsuario.nombre,
      lastname: this.formUsuario.apellidos,
      email: this.formUsuario.correo,
      gender: this.formUsuario.genero,
      category_id: Number(this.formUsuario.category_id),
      hand: this.formUsuario.manoPreferida,
      club_id: Number(this.formUsuario.club_id),
      rol_id: Number(this.formUsuario.rol_id)
    };

    // solo si cambió
    if (this.formUsuario.profile_photoFile) {
      payload.profile_photo = this.formUsuario.profile_photoFile;
    }


    payload.club_id = Number(this.formUsuario.club_id) || this.selectedUsuario.club_id;
    payload.rol_id = Number(this.formUsuario.rol_id) || this.selectedUsuario.rol_id;

    console.log('Payload a enviar:', payload);

    this.usersService.updateUserById(this.formUsuario.id, payload).subscribe({
      next: () => {
        alert('✅ Usuario actualizado correctamente');
        this.editando = false;
        this.cargarUsuarios();
      },
      error: (err) => {
        console.error('Error al actualizar usuario:', err); // Aquí se ve todo
        if (err.error) {
          console.error('Detalle del error:', err.error); // Esto muestra el mensaje de la API
        }
        alert('❌ No se pudo actualizar el usuario. Revisa la consola para más detalles.');
      }
    });
  }





  cancelarEdicion() {
    this.editando = false;
    this.formUsuario = { ...this.selectedUsuario };
  }

  abrirModalRegistrarUsuario() {
    const dialogRef = this.dialog.open(RegistrarUsuarioDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: 'auto',
      maxHeight: '70vh',
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.cargarUsuarios();
    });
  }
}
