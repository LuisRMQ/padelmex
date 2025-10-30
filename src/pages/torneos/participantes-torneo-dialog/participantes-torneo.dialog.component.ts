import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { UsersService, User } from '../../../app/services/users.service';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from "@angular/material/select";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { FormsModule, FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { MatInputModule } from '@angular/material/input';
import { TournamentService } from '../../../app/services/torneos.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

export interface Partido {
  jugador1: User | null;
  jugador2: User | null;
  ganador?: User | null;
  x?: number;
  y?: number;
  height?: number;
}


export interface TournamentPlayer extends User {
  partner?: User | null;
}

@Component({
  selector: 'app-participantes-torneo-dialog',
  templateUrl: './participantes-torneo.dialog.component.html',
  styleUrls: ['./participantes-torneo.dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatTableModule
  ]
})
export class ParticipantesTorneoDialogComponent implements OnInit {

  selectedPlayersFromServer: TournamentPlayer[] = [];
  displayedColumnsServer: string[] = ['photo', 'name'];
  isCategoryClosed: boolean = false; // 🔹 Indica si la categoría ya está cerrada

  playerSearchControl = new FormControl('');
  selectedPlayers: TournamentPlayer[] = [];
  filteredPlayers!: Observable<User[]>;
  isLoadingPlayers = false;
  error: string | null = null;
  participantes: User[] = [];
  loading = false;
  defaultAvatar = 'assets/images/placeholder.png';
  allPlayers: User[] = [];
  selectedCategory: {
    id: number;
    max_participants: number;
    current_participants?: number;
    status?: string;
  } | null = null;

  categories: {
    id: number;
    max_participants: number;
    name: string;
    current_participants?: number;
    status?: string;
  }[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number, categories: { id: number, max_participants: number, name: string }[] },
    private dialogRef: MatDialogRef<ParticipantesTorneoDialogComponent>,
    private usersService: UsersService,
    private dialog: MatDialog,
    private tournamentService: TournamentService,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.categories = this.data.categories;
    if (this.categories.length > 0) {
      this.selectedCategory = this.categories[0];
      console.log('Categoría inicial seleccionada:', this.selectedCategory);
      this.cargarParticipantesPorCategoria(); // 🔹 carga inicial
    }

    this.cargarJugadores();

    this.filteredPlayers = this.playerSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterPlayers(value ?? ''))
    );

    console.log('Categorías recibidas:', this.categories);
  }



  cargarJugadores() {
    this.isLoadingPlayers = true;
    this.allPlayers = [];

    // Primero obtenemos la primera página
    this.usersService.getUserss(1).subscribe({
      next: (res) => {
        this.allPlayers = [...res.data];
        const totalPages = res.last_page;

        if (totalPages > 1) {
          // Creamos un array de observables para las páginas restantes
          const observables = [];
          for (let page = 2; page <= totalPages; page++) {
            observables.push(this.usersService.getUserss(page));
          }

          forkJoin(observables).subscribe({
            next: (results) => {
              results.forEach(r => this.allPlayers.push(...r.data));
              this.isLoadingPlayers = false;
              console.log(`✅ Total de jugadores cargados: ${this.allPlayers.length}`);

            },
            error: (err) => {
              console.error('Error al cargar páginas adicionales:', err);
              this.isLoadingPlayers = false;
            }
          });
        } else {
          this.isLoadingPlayers = false;
        }
      },
      error: (err) => {
        console.error('Error al cargar jugadores:', err);
        this.isLoadingPlayers = false;
      }
    });
  }





  cargarParticipantesPorCategoria() {
    if (!this.selectedCategory) return;

    this.loading = true;
    this.error = null;
    this.participantes = [];
    this.selectedPlayers = [];
    this.selectedPlayersFromServer = [];
    this.isCategoryClosed = false; // 🔹 resetear estado de cierre

    const tournament_id = this.data.torneoId;
    const category_tournament_id = this.selectedCategory.id;

    // 🔹 Página 1
    this.tournamentService.getPlayersByCategory(tournament_id, category_tournament_id, 1)
      .subscribe({
        next: (res) => {
          const firstPage = res.data.data.data;
          const lastPage = res.data.data.last_page;

          const mappedPlayers = this.mapPlayers(firstPage);
          this.participantes.push(...mappedPlayers);
          this.selectedPlayersFromServer.push(...mappedPlayers);

          // 🔹 Revisar si la categoría está cerrada
          this.isCategoryClosed =
            (this.selectedCategory?.current_participants ?? 0) >= (this.selectedCategory?.max_participants ?? 0);

          if (lastPage > 1) {
            const observables = [];
            for (let page = 2; page <= lastPage; page++) {
              observables.push(
                this.tournamentService.getPlayersByCategory(tournament_id, category_tournament_id, page)
              );
            }

            forkJoin(observables).subscribe({
              next: (results) => {
                results.forEach(r => {
                  const players = this.mapPlayers(r.data.data.data);
                  this.participantes.push(...players);
                  this.selectedPlayersFromServer.push(...players);
                });

                // 🔹 También revisar después de cargar todas las páginas
                this.isCategoryClosed =
                  (this.selectedCategory?.current_participants ?? 0) >= (this.selectedCategory?.max_participants ?? 0);

                this.loading = false;
                console.log(`✅ Total participantes cargados del servidor: ${this.selectedPlayersFromServer.length}`);
              },
              error: (err) => {
                console.error('❌ Error al cargar páginas adicionales:', err);
                this.error = 'Error al cargar participantes.';
                this.loading = false;
              }
            });
          } else {
            this.loading = false;
          }
        },
        error: (err) => {
          console.error('❌ Error al cargar participantes:', err);
          this.error = 'Error al cargar participantes.';
          this.loading = false;
        }
      });
  }


  private mapPlayers(data: any[]): TournamentPlayer[] {
    return data.map((item) => {
      const [name, ...rest] = item.player_full_name.split(' ');
      const lastname = rest.join(' ');

      return {
        id: item.player_id,
        name: name || '',
        lastname: lastname || '',
        email: '',          // valor por defecto
        gender: '',         // valor por defecto
        phone: '',          // valor por defecto
        area_code: '',      // valor por defecto
        club_id: 0,         // valor por defecto
        profile_photo: null,
        partner: null
      } as TournamentPlayer;
    });
  }

  private _filterPlayers(value: any): User[] {
    let filterValue = '';
    if (typeof value === 'string') {
      filterValue = value.toLowerCase();
    } else if (value && value.name) {
      filterValue = value.name.toLowerCase();
    }

    return this.allPlayers
      .filter(player =>
        player.name.toLowerCase().includes(filterValue) ||
        player.lastname.toLowerCase().includes(filterValue) ||
        (player.email && player.email.toLowerCase().includes(filterValue))
      )
      .filter(player =>
        !this.selectedPlayers.some(p => p.id === player.id) &&
        !this.participantes.some(p => p.id === player.id)
      );
  }

  displayFn(user: User): string {
    return user ? `${user.name} ${user.lastname}` : '';
  }



  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }

  hasValidSearchTermPlayers(): boolean {
    const value = this.playerSearchControl.value;
    return typeof value === 'string' && value.length > 2;
  }

  onCategoryChange(category: { id: number, max_participants: number }) {
    this.selectedCategory = category;
    this.cargarParticipantesPorCategoria(); // 🔹 carga automática
  }

  removePlayer(user: User): void {
    this.selectedPlayers = this.selectedPlayers.filter(p => p.id !== user.id);
    this.participantes = this.participantes.filter(p => p.id !== user.id);
    //this.tournamentService.removeUserFromTournament(user.id, this.data.torneoId).subscribe();
  }



  addPlayer(user: User): void {
    if (!this.selectedCategory) {
      this.error = 'Selecciona una categoría antes de agregar jugadores.';
      return;
    }
    if (this.selectedPlayers.some(p => p.id === user.id)) return;
    this.error = null;

    // Agregamos propiedad partner vacía
    this.selectedPlayers.push({ ...user, partner: null });
    this.playerSearchControl.setValue('');
  }

  // Validar si la pareja ya está asignada a otro jugador
  isAlreadyPaired(p: TournamentPlayer, jugador: TournamentPlayer): boolean {
    return this.selectedPlayers.some(j => j.partner?.id === p.id && j.id !== jugador.id);
  }

  // Confirmar parejas y enviar al servicio
  confirmPairs() {
  if (!this.selectedCategory) {
    this.error = 'Selecciona una categoría antes de confirmar las parejas.';
    return;
  }

  // Validar que todos los jugadores tengan pareja
  for (const jugador of this.selectedPlayers) {
    if (!jugador.partner) {
      const msg = `El jugador ${jugador.name} ${jugador.lastname} no tiene pareja asignada.`;
      this.error = msg;
      console.error('❌ Error de validación:', msg, jugador);
      this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snackbar-error'] });
      return;
    }
  }

  const addedPairs = new Set<string>();
  const requests = [];

  for (const j of this.selectedPlayers) {
    const key = [Number(j.id), Number(j.partner!.id)].sort().join('-');
    if (!addedPairs.has(key)) {
      addedPairs.add(key);

      const payload = {
        user_id: Number(j.id),
        category_tournament_id: Number(this.selectedCategory!.id),
        partner_id: Number(j.partner!.id)
      };
      requests.push(this.tournamentService.addUsertoTournament(payload));
    }
  }

  if (requests.length === 0) {
    const msg = 'No hay parejas nuevas para agregar.';
    this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['snackbar-info'] });
    return;
  }

  forkJoin(requests).subscribe({
    next: (responses) => {
      const errors: string[] = [];

      responses.forEach((res, index) => {
        const jugador = this.selectedPlayers[index];
        const coupleData = res?.couple?.couple;

        if (coupleData?.ok) {
          this.snackBar.open(`✔️ Pareja agregada: ${jugador.name} + ${jugador.partner!.name}`, 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-success']
          });
        } else {
          // Captura mensaje específico del servidor si existe
          const msg = res?.couple?.message || 'Ocurrió un error al agregar la pareja.';
          errors.push(`Jugador: ${jugador.name} ${jugador.lastname}, Pareja: ${jugador.partner!.name}, Error: ${msg}`);
          console.error('❌ Error al agregar pareja:', msg, 'Jugador:', jugador, 'Pareja:', jugador.partner);
        }
      });

      if (errors.length > 0) {
        const combinedMsg = errors.join('\n');
        this.snackBar.open(`❌ Algunos errores ocurrieron:\n${combinedMsg}`, 'Cerrar', {
          duration: 8000,
          panelClass: ['snackbar-error']
        });
      }

      this.dialogRef.close(this.selectedPlayers);
    },
    error: (err) => {
      console.error('❌ Error agregando parejas:', err);
      this.snackBar.open('❌ Ocurrió un error al agregar las parejas.', 'Cerrar', {
        duration: 6000,
        panelClass: ['snackbar-error']
      });
    }
  });
}


}
