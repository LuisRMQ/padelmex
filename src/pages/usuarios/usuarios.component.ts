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
import { UsersService } from '../../app/services/users.service';
import { CourtService } from '../../app/services/court.service';

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
  telefono: string;
  area_code: string;
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
  clubs: any[] = [];
  usuariosFiltrados: UsuarioTabla[] = [];


  roles: { id: number; name: string }[] = [
    { id: 1, name: 'Jugador' },
    { id: 2, name: 'Administrador' }
  ];

  categories: { id: number; name: string }[] = [
    { id: 1, name: 'Primera Varonil' },
    { id: 2, name: 'Segunda Varonil' },
    { id: 3, name: 'Primera Femenil' },
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  selectedRol: any;
  selectedCategoria: any;
  usuariosTabla: UsuarioTabla[] = [];

  constructor(private dialog: MatDialog, private usersService: UsersService, private courtService: CourtService) { }

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarClubs();
  }

  cargarUsuarios() {
    this.usersService.getUsers().subscribe({
      next: (usuarios) => {
        this.usuariosTabla = usuarios.map(u => ({
          id: u.id,
          nombre: u.name,
          apellidos: u.lastname,
          correo: u.email,
          genero: u.gender,
          rol: u.rol || '-',
          rol_id: u.rol_id,
          club: this.clubs.find(c => c.id === u.club_id)?.name || '-',
          club_id: u.club_id,
          categoria: u.category || '-',
          victorias: '-',
          puntos: 0,
          fotoPerfil: u.profile_photo || '../../assets/images/placeholder.png',
          manoPreferida: '-',
          identificacion: '-',
          telefono: u.phone || '-',
          area_code: u.area_code || '-'
        }));
        this.usuariosFiltrados = [...this.usuariosTabla];
      },
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.usuariosFiltrados = this.usuariosTabla.filter(u =>
      u.nombre.toLowerCase().includes(filterValue) ||
      u.apellidos.toLowerCase().includes(filterValue) ||
      u.correo.toLowerCase().includes(filterValue) ||
      u.club.toLowerCase().includes(filterValue)
    );
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
      rol_id: usuario.rol_id,
      club: usuario.club,
      club_id: usuario.club_id,
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
      rol_id: Number(this.formUsuario.rol_id),
    };

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
        console.error('Error al actualizar usuario:', err);
        if (err.error) {
          console.error('Detalle del error:', err.error);
        }
        alert('❌ No se pudo actualizar el usuario. Revisa la consola para más detalles.');
      }
    });
  }



  onProfilePhotoSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_photo', file);
    formData.append('name', this.formUsuario.nombre);
    formData.append('lastname', this.formUsuario.apellidos);
    formData.append('email', this.formUsuario.correo);
    formData.append('gender', this.formUsuario.genero);
    formData.append('club_id', String(this.formUsuario.club_id));

    if (this.formUsuario.rol_id) formData.append('rol_id', String(this.formUsuario.rol_id));
    if (this.formUsuario.category_id) formData.append('category_id', String(this.formUsuario.category_id));
    if (this.formUsuario.manoPreferida) formData.append('hand', this.formUsuario.manoPreferida);

    console.log('Contenido real de FormData:');
    formData.forEach((value, key) => console.log(key, value));

    formData.append('_method', 'PUT');

    this.usersService.updateUserById(this.formUsuario.id, formData).subscribe({
      next: (res) => {
        alert('✅ Foto actualizada correctamente');
        this.selectedUsuario.fotoPerfil = URL.createObjectURL(file);
        this.cargarUsuarios();
      },
      error: (err) => {
        console.error('Error completo:', err);

        console.log('Mensaje:', err.message);

        console.log('Status:', err.status);

        console.log('Body de la respuesta:', err.error);

        if (err.error?.errors) {
          console.log('Errores de validación detallados:', err.error.errors);
        }
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

  cargarClubs() {
    this.courtService.getClubs().subscribe({
      next: (data) => {
        this.clubs = data;
      },
      error: (err) => {
        console.error('Error al cargar clubes:', err);
      }
    });
  }

  getTotalUsuarios(): number {
    return this.usuariosTabla.length;
  }

  getTotalUsuariosByRol(rol: string): number {
    return this.usuariosTabla.filter(u => u.rol.toLowerCase() === rol.toLowerCase()).length;
  }

  getCategoriaConMasUsuarios(): string {
    const categoriaCount: { [key: string]: number } = {};

    this.usuariosTabla.forEach(u => {
      const categoria = u.categoria.toLowerCase();
      categoriaCount[categoria] = (categoriaCount[categoria] || 0) + 1;
    });

    const maxCategoria = Object.keys(categoriaCount).reduce((a, b) => categoriaCount[a] > categoriaCount[b] ? a : b, '');
    return maxCategoria.charAt(0).toUpperCase() + maxCategoria.slice(1);
  }
}
