import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RegistrarClubDialogComponent } from './registrar-club-dialog/registrar-club-dialog.component';
import { ClubsService, Club } from '../../app/services/clubs.service';
import { HorariosService } from '../../app/services/horarios-clubes.service';

import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../app/commonComponents/confirmDialog.component';
import { FormsModule } from '@angular/forms';
import { MatDivider } from "@angular/material/divider";
import { RegistrarHorarioDialogComponent } from './registrar-horario-dialog/registrar-horario-dialog.component';
import { HorariosDialogComponent } from './info-horarios-club-dialog/info-horarios-club-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { InformacionClubDialogComponent } from './informacion-club-dialog/informacion-club-dialog.component';
import { EditarClubDialogComponent } from './editar-club-dialog/editar-club-dialog.component';
import { ClubAmenitiesModalComponent } from './registrar-comodidad-dialog/registrar-comodidad-dialog.component';
import { ClubCloseDialogComponent } from './close-club-dialog/close-club-dialog.component';
import { MatTableModule } from '@angular/material/table';
import { UsersService, User } from '../../app/services/users.service';



/**
 * @title Card overview
 */

@Component({
  selector: 'app-clubs',
  templateUrl: './clubs.component.html',
  styleUrls: ['./clubs.component.css'],
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    MatDivider,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatTableModule,
  ],
})
export class ClubsComponent implements OnInit {

  clubs: Club[] = [];
  clubesFiltrados: Club[] = [];
  busquedaClub = '';
  editandoClubId: number | null = null;
  logoFile: File | null = null;
  logoPreview: string = '../../assets/images/placeholder.png';
  backupClub: Partial<Club> | null = null;
  clubConMasUsuarios: Club | null = null;

  constructor(
    private dialog: MatDialog,
    private clubsService: ClubsService,
    private snackBar: MatSnackBar,
    private horariosService: HorariosService,
    private usersService: UsersService

  ) { }

  ngOnInit(): void {
   this.viewclubs()
  }



  viewclubs(){
     this.clubsService.getClubs().subscribe({
      next: (res: any) => {
        this.clubs = res.data;
        this.clubesFiltrados = this.clubs;
        this.calcularClubConMasUsuarios();
      },
      error: (err) => {
        console.error('Error al cargar clubs', err);
      }
    });
  }

  calcularClubConMasUsuarios() {
    let maxCount = 0;
    let clubWithMostUsers: Club | null = null;

    let pendientes = this.clubs.length;
    if (pendientes === 0) {
      this.clubConMasUsuarios = null;
      return;
    }

    this.clubs.forEach(club => {
      this.usersService.searchUsers('', club.id).subscribe(users => {
        if (users.length > maxCount) {
          maxCount = users.length;
          clubWithMostUsers = club;
        }
        pendientes--;
        if (pendientes === 0) {
          this.clubConMasUsuarios = clubWithMostUsers;
        }
      });
    });
  }

  filtrarClubes() {
    const filtro = this.busquedaClub?.toLowerCase() || '';
    this.clubesFiltrados = this.clubs.filter(club =>
      club.name?.toLowerCase().includes(filtro) ||
      club.email?.toLowerCase().includes(filtro) ||
      club.address?.toLowerCase().includes(filtro)
    );
  }

  limpiarBusqueda() {
    this.busquedaClub = '';
    this.clubesFiltrados = this.clubs;
  }

  abrirModalRegistrarClub() {
    const dialogRef = this.dialog.open(RegistrarClubDialogComponent, {
      width: '800px',
      maxWidth: '50vw',
      height: '80vh',
      maxHeight: '95vh',
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        this.clubesFiltrados = this.clubs;
        this.snackBar.open('✅ Club registrado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        await this.viewclubs();

      }
    });
  }

  confirmarEliminarClub(club: Club) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '700px',
      data: {
        title: '¿Eliminar club?',
        message: `¿Estás seguro que deseas eliminar el club "${club.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.clubsService.deleteClub(club.id).subscribe({
          next: () => {
            this.snackBar.open('Club eliminado correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.clubs = this.clubs.filter(c => c.id !== club.id);
          },
          error: () => {
            this.snackBar.open('Error al eliminar el club', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }


  onImageError(event: Event) {
    const element = event.target as HTMLImageElement;
    element.src = 'assets/logos/azteca.png';
  }

  abrirModalInfoClub(club: Club) {
    const dialogRef = this.dialog.open(InformacionClubDialogComponent, {
      width: '600px',
      maxWidth: '80vw',
      data: { club }
    });

    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.snackBar.open('✅ Información del club actualizada', 'Cerrar', {
    //       duration: 3000,
    //       panelClass: ['snackbar-success'],
    //       horizontalPosition: 'center',
    //       verticalPosition: 'bottom'
    //     });
    //   }
    // });
  }

  abrirEditarClubDialog(club: Club) {
    const dialogRef = this.dialog.open(EditarClubDialogComponent, {
      //width: '800px',
      //maxWidth: '50vw',
      //height: '80vh',
      //maxHeight: '95vh',
      minWidth: '60vw',
      minHeight: '80vh',
      maxHeight: '80vh',
      data: { club }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.guardarClubEditado(result);
      }
    });
  }

  guardarClubEditado(clubOrForm: Club | FormData) {
    let values: any = {};
    if (clubOrForm instanceof FormData) {
      clubOrForm.forEach((value, key) => {
        values[key] = value;
      });
      console.log("📦 Datos recibidos (FormData):", values);
    } else {
      values = { ...clubOrForm };

      if (typeof values.logo === 'string') {
        delete values.logo;
      }

      console.log("📦 Datos recibidos (Objeto Club):", values);
    }

    if (!values.name || !values.email || !values.phone || !values.rfc || !values.address || !values.type) {
      console.error("❌ Falta un campo obligatorio:", values);
      this.snackBar.open('Completa todos los campos obligatorios', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    if (clubOrForm instanceof FormData) {
      console.log("🚀 Enviando FormData al backend:", values);
      this.clubsService.updateClub(values.id, clubOrForm).subscribe({
        next: (res) => {
          console.log("✅ Respuesta del backend:", res);
          this.editandoClubId = null;
          this.logoFile = null;
          this.snackBar.open('Club actualizado correctamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
        },
        error: (err) => {
          console.error("🔥 Error al actualizar (FormData):", err);
          this.snackBar.open('Error al actualizar el club', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
    } else {
      console.log("🚀 Enviando objeto normal al backend:", values);
      this.clubsService.updateClub(values.id, values).subscribe({
        next: (res) => {
          console.log("✅ Respuesta del backend:", res);
          this.editandoClubId = null;
          this.snackBar.open('Club actualizado correctamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
        },
        error: (err) => {
          console.error("🔥 Error al actualizar (Objeto Club):", err);
          this.snackBar.open('Error al actualizar el club', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-error']
          });
        }
      });
    }
  }



  onLogoSelected(event: Event, club: Club) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('El archivo supera los 5MB', 'Cerrar', { duration: 3000, panelClass: ['snackbar-error'] });
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      club.logo = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    this.logoFile = file;
  }

  cancelarEdicion(club: Club) {
    if (this.backupClub) {
      Object.assign(club, this.backupClub);
    }
    this.editandoClubId = null;
    this.backupClub = null;
  }


  abrirModalRegistrarHorario(club: Club) {
    this.horariosService.getHorariosByClub(club.id).subscribe({
      next: (horarios) => {
        const dialogRef = this.dialog.open(RegistrarHorarioDialogComponent, {
          maxWidth: '80vw',
          maxHeight: '80vh',
          data: {
            clubId: club.id,
            name: club.name,
            horarios
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.snackBar.open('✅ Horario registrado exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success'],
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener horarios del club', err);
        this.snackBar.open('Error al cargar los horarios', 'Cerrar', { duration: 3000 });
      }
    });
  }



  abrirModalHorarios(club: Club) {
    this.horariosService.getHorariosByClub(club.id).subscribe({
      next: (horarios) => {
        this.dialog.open(HorariosDialogComponent, {
          width: '600px',
          maxWidth: '60vw',
          data: { club, horarios }
        });
      },
      error: (err) => {
        console.error('Error al obtener horarios', err);
        this.snackBar.open('❌ Error al cargar los horarios', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }



  abrirModalComodidades(club: Club) {
    const dialogRef = this.dialog.open(ClubAmenitiesModalComponent, {
      maxWidth: '80vw',
      maxHeight: '80vh',
      data: { clubId: club.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('✅ Comodidades actualizadas', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }



  addCloseDays(club: Club) {
    const dialogRef = this.dialog.open(ClubCloseDialogComponent, {
      maxWidth: '80vw',
      maxHeight: '80vh',
      data: { selectedClub: club }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Cierre de día registrado correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  get totalClubsActivos(): number {
    return this.clubs.filter(c => c.status === true).length;
  }

  get totalClubsPublicos(): number {
    return this.clubs.filter(c => c.type === 'public').length;
  }

  get totalClubsPrivados(): number {
    return this.clubs.filter(c => c.type === 'private').length;
  }

    onImgError(event: Event) {
    (event.target as HTMLImageElement).src = '../../../assets/images/logoclub.jpg';
  }


}
