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
    MatDividerModule
  ],
  providers: [DatePipe]
})
export class TorneosComponent implements OnInit {

  torneos: Tournament[] = [];

  constructor(
    private tournamentService: TournamentService,
    private dialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef,
    private datePipe: DatePipe,
      private snackBar: MatSnackBar

  ) { }

  ngOnInit() {
    this.cargarTorneos();
  }

  cargarTorneos() {
    this.tournamentService.getTournaments().subscribe({
      next: (res: any) => {
        console.log('Respuesta completa de la API:', res);

        const apiTorneos = res.data?.data || [];
        console.log('Array de torneos crudo:', apiTorneos);

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
          status: t.status,
          prizes: t.prizes || [],
          rules: t.rules,
          photo: t.photo,
          active: t.active
        }));

        console.log('Torneos finales para el HTML:', this.torneos);
      },
      error: (err) => console.error('Error al obtener torneos:', err)
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
  this.dialog.open(InicioTorneoDialogComponent, {
    width: '90vw',      
    maxWidth: '1000px',  
    height: 'auto',      
    maxHeight: '80vh',   
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
}
