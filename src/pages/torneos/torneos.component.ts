import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { TournamentService, Tournament } from '../../app/services/torneos.service';
import { BracketModalComponent } from '../torneos/brackets-torneo-dialog/brackets-torneo-dialog.component';
import { RegistrarTorneoDialogComponent } from '../torneos/registrar-torneo-dialog/registrar-torneo-dialog.component';
import { EditarTorneoDialogComponent } from '../torneos/editar-torneo-dialog/editar-torneo-dialog.component';
import { InicioTorneoDialogComponent } from '../torneos/inicio-torneo-dialog/inicio-torneo.dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ParticipantesTorneoDialogComponent } from './participantes-torneo-dialog/participantes-torneo.dialog.component';
import { MatMenuModule } from '@angular/material/menu';


@Component({
  selector: 'app-torneos',
  standalone: true,
  templateUrl: './torneos.component.html',
  styleUrls: ['./torneos.component.css'],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatDialogModule,
    MatDividerModule,
    MatMenuModule, 

  ],
  providers: [DatePipe]
})
export class TorneosComponent implements OnInit {
  currentPage = 1;
  lastPage = 1;
  perPage = 10;
  total = 0;
  torneos: Tournament[] = [];
  estadosDisponibles: Tournament['status'][] = ['draft', 'open', 'in_progress', 'completed', 'closed', 'cancelled'];

  constructor(
    private tournamentService: TournamentService,
    private dialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar

  ) { }

  ngOnInit() {
    this.cargarTorneos(1);
  }

  cargarTorneos(page: number = 1) {
  this.tournamentService.getTournamentsv({}, page).subscribe({
    next: (res) => {
      const apiTorneos = res.data || [];
      this.torneos = apiTorneos.map((t: any) => ({
        id: t.tournament_id,
        name: t.name,
        description: t.description,
        club_id: t.club_id,
        club_name: t.club_name,
        start_date: t.start_date,
        end_date: t.end_date,
        registration_deadline: t.registration_deadline,
        registration_fee: t.registration_fee,
        max_participants: t.max_participants,
        current_participants: t.current_participants,
        ranking: t.ranking,
        subtract_ranking: t.subtract_ranking,
        status: t.status,
        prizes: t.prizes || [],
        rules: t.rules,
        photo: t.photo,
        active: t.active,
        created_at: t.created_at,
        updated_at: t.updated_at
      }));

      this.currentPage = res.current_page ?? page;
      this.lastPage = res.last_page ?? 1;
      this.perPage = res.per_page ?? this.perPage;
      this.total = res.total ?? this.total;

    },
    error: (err) => console.error('Error al obtener torneos:', err)
  });
}

cambiarEstado(torneo: Tournament, nuevoEstado: Tournament['status']) {
  this.tournamentService.updateTournamentStatus(torneo.id, nuevoEstado).subscribe({
    next: (res) => {
      torneo.status = nuevoEstado;
      this.snackBar.open(`Estado actualizado a "${this.getEstadoTorneo(nuevoEstado)}"`, '', { duration: 3000 });
    },
    error: (err) => {
      console.error('Error actualizando estado', err);
      this.snackBar.open(`Error actualizando estado`, '', { duration: 3000 });
    }
  });
}


  getEstadoTorneo(status: Tournament['status']): string {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'open': return 'Activo';
      case 'in_progress': return 'En progreso';
      case 'completed': return 'Finalizado';
      case 'closed': return 'Cerrado';
      case 'cancelled': return 'Cancelado';
      default: return '';
    }
  }

  isActivo(status: Tournament['status']): boolean {
    return status === 'open';
  }

  isFinalizado(status: Tournament['status']): boolean {
    return status === 'completed';
  }

  getCols(): number {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }

  @HostListener('window:resize')
  onResize() {
    this.changeDetectorRef.detectChanges();
  }

  abrirBracket(torneo: Tournament) {
    this.dialog.open(BracketModalComponent, {
      width: '90vw',
      height: '80vh',
      maxWidth: '1200px',
      maxHeight: '800px',
      data: { participantes: torneo.current_participants },
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

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.cargarTorneos();
      }
    });
  }

verDetalles(torneo: Tournament) {
  console.log(torneo)
    console.log(torneo.id)

  this.dialog.open(InicioTorneoDialogComponent, {
    width: '95vw',      
    maxWidth: '95vw',  
    height: '90vh',      
    maxHeight: '90vh',   
    data: { torneoId: torneo.id },
    panelClass: 'custom-dialog'
  });
}

  editarTorneo(torneo: Tournament) {
    const dialogRef = this.dialog.open(EditarTorneoDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      height: 'auto',
      maxHeight: '90vh',
      data: { torneoId: torneo.id },
      panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe((torneoActualizado) => {
      if (torneoActualizado) {
        const index = this.torneos.findIndex(t => t.id === torneoActualizado.id);
        if (index !== -1) this.torneos[index] = torneoActualizado;
      }
    });
  }

  eliminarTorneo(torneo: Tournament) {
    const snack = this.snackBar.open(
      `¿Eliminar el torneo "${torneo.name}"?`,
      'Confirmar',
      { duration: 5000 }
    );

    snack.onAction().subscribe(() => {
      this.tournamentService.deleteTournament(torneo.id).subscribe({
        next: () => {
          this.torneos = this.torneos.filter(t => t.id !== torneo.id);
          this.snackBar.open(`Torneo "${torneo.name}" eliminado`, '', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error al eliminar torneo:', err);
          this.snackBar.open(`Error eliminando el torneo`, '', { duration: 3000 });
        }
      });
    });
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '../../assets/images/placeholder.png';
  }

  verParticipantes(torneoId: number) {
  this.tournamentService.getTournament(torneoId).subscribe({
    next: (torneo: Tournament) => {
      const categories = torneo.categories?.map(cat => ({
        id: cat.id,
        max_participants: cat.max_participants,
        current_participants: cat.current_participants,
        status: cat.status
      })) || [];

      console.log('Categorías enviadas:', categories);

      const dialogRef = this.dialog.open(ParticipantesTorneoDialogComponent, {
        width: '90vw',
        maxWidth: '1000px',
        height: 'auto',
        maxHeight: '80vh',
        data: { torneoId: torneo.id, categories },
        panelClass: 'custom-dialog'
      });

      dialogRef.afterClosed().subscribe((updated) => {
        console.log('Modal cerrado. ¿Hubo cambios?', updated);

        if (updated) {
          this.cargarTorneos();

        }
      });
    },
    error: (err) => console.error('Error obteniendo torneo:', err)
  });
}

  get pages(): number[] {
    return Array.from({ length: this.lastPage }, (_, i) => i + 1);
  }

  nextPage() {
    if (this.currentPage < this.lastPage) {
      this.cargarTorneos(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.cargarTorneos(this.currentPage - 1);
    }
  }

  goToPage(page: number) {
    const p = Math.max(1, Math.min(this.lastPage, page));
    if (p !== this.currentPage) this.cargarTorneos(p);
  }

}
