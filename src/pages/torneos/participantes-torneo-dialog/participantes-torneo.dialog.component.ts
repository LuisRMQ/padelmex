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
import { AlertService } from '../../../app/services/alert.service';

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
comparePlayers = (a: User | null, b: User | null): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return Number(a.id) === Number(b.id);
}
  selectedPlayersFromServer: TournamentPlayer[] = [];
  displayedColumnsServer: string[] = ['photo', 'name'];
  isCategoryClosed: boolean = false;

  playerSearchControl = new FormControl('');
  selectedPlayers: TournamentPlayer[] = [];
  filteredPlayers!: Observable<User[]>;
  isLoadingPlayers = false;
  error: string | null = null;
  participantes: User[] = [];
  loading = false;
  defaultAvatar = 'assets/images/placeholder.png';
  allPlayers: User[] = [];
  selectedCategory: { id: number; max_participants: number; current_participants?: number; status?: string; } | null = null;

  categories: { id: number; max_participants: number; name: string; current_participants?: number; status?: string; }[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number, categories: { id: number, max_participants: number, name: string }[] },
    private dialogRef: MatDialogRef<ParticipantesTorneoDialogComponent>,
    private usersService: UsersService,
    private dialog: MatDialog,
    private tournamentService: TournamentService,
    private snackBar: MatSnackBar,
    private alertService: AlertService,

  ) { }

  ngOnInit(): void {
    this.categories = this.data.categories;
    if (this.categories.length > 0) {
      this.selectedCategory = this.categories[0];
      this.cargarParticipantesPorCategoria();
    }

    this.cargarJugadores();

    this.filteredPlayers = this.playerSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterPlayers(value ?? ''))
    );
  }

  cargarJugadores() {
    this.isLoadingPlayers = true;
    this.allPlayers = [];

    this.usersService.getUserss(1).subscribe({
      next: (res) => {
        this.allPlayers = [...res.data];
        const totalPages = res.last_page;

        if (totalPages > 1) {
          const observables: any[] = [];
          for (let page = 2; page <= totalPages; page++) {
            observables.push(this.usersService.getUserss(page));
          }

          forkJoin(observables).subscribe({
            next: (results) => {
              results.forEach(r => this.allPlayers.push(...r.data));
              this.isLoadingPlayers = false;
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
    this.isCategoryClosed = false;

    const tournament_id = this.data.torneoId;
    const category_tournament_id = this.selectedCategory.id;

    this.tournamentService.getPlayersByCategory(tournament_id, category_tournament_id, 1)
      .subscribe({
        next: (res) => {
          const firstPage = res.data.data.data;
          const lastPage = res.data.data.last_page;

          const mappedPlayers = this.mapPlayers(firstPage);
          this.participantes.push(...mappedPlayers);
          this.selectedPlayersFromServer.push(...mappedPlayers);

          this.isCategoryClosed =
            (this.selectedCategory?.current_participants ?? 0) >= (this.selectedCategory?.max_participants ?? 0);

          if (lastPage > 1) {
            const observables: any[] = [];
            for (let page = 2; page <= lastPage; page++) {
              observables.push(this.tournamentService.getPlayersByCategory(tournament_id, category_tournament_id, page));
            }

            forkJoin(observables).subscribe({
              next: (results) => {
                results.forEach(r => {
                  const players = this.mapPlayers(r.data.data.data);
                  this.participantes.push(...players);
                  this.selectedPlayersFromServer.push(...players);
                });

                this.isCategoryClosed =
                  (this.selectedCategory?.current_participants ?? 0) >= (this.selectedCategory?.max_participants ?? 0);

                this.loading = false;
              },
              error: (err) => {
                console.error('Error al cargar páginas adicionales:', err);
                this.error = 'Error al cargar participantes.';
                this.loading = false;
              }
            });
          } else {
            this.loading = false;
          }
        },
        error: (err) => {
          console.error('Error al cargar participantes:', err);
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
        email: '',
        gender: '',
        phone: '',
        area_code: '',
        club_id: 0,
        profile_photo: null,
        partner: null
      } as TournamentPlayer;
    });
  }

  private _filterPlayers(value: any): User[] {
    let filterValue = '';
    if (typeof value === 'string') filterValue = value.toLowerCase();
    else if (value && value.name) filterValue = value.name.toLowerCase();

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
    this.cargarParticipantesPorCategoria();
  }

  removePlayer(user: User): void {
    this.selectedPlayers = this.selectedPlayers.filter(p => p.id !== user.id);
    this.participantes = this.participantes.filter(p => p.id !== user.id);
  }

  addPlayer(user: User): void {
    if (!this.selectedCategory) {
      this.error = 'Selecciona una categoría antes de agregar jugadores.';
      return;
    }
    if (this.selectedPlayers.some(p => p.id === user.id)) return;
    this.error = null;
    this.selectedPlayers.push({ ...user, partner: null } as TournamentPlayer);
    this.playerSearchControl.setValue('');
  }

  /**
   * Devuelve opciones combinadas (allPlayers + participantes + selectedPlayersFromServer) sin duplicados
   * y filtradas para no incluir al propio jugador ni a candidatos ya asignados a otro jugador.
   */
  getPartnerOptions(jugador: TournamentPlayer): User[] {
    const combined = [
      ...(this.allPlayers || []),
      ...(this.participantes || []),
      ...(this.selectedPlayersFromServer || [])
    ];

    // Dedupe por id, manteniendo el primer encuentro
    const map = new Map<number, User>();
    combined.forEach(u => {
      if (u && typeof u.id === 'number' && !map.has(u.id)) {
        map.set(u.id, u);
      }
    });

    const unique = Array.from(map.values());

    return unique.filter(candidate => {
      if (!candidate || typeof candidate.id !== 'number') return false;
      if (candidate.id === jugador.id) return false; // no puede ser él mismo

      // Evitar que alguien ya asignado como pareja lo vuelva a ser para otro jugador distinto
      const alreadyAssigned = this.selectedPlayers.some(p =>
        p.partner?.id === candidate.id && p.id !== jugador.id
      );
      return !alreadyAssigned;
    });
  }

  /**
   * Maneja la selección de pareja desde el mat-select
   */
  onPartnerSelected(jugador: TournamentPlayer, partner: User | null) {
  // Asignar la referencia directamente (sin spread) para que compareWith pueda emparejar por id
  jugador.partner = partner;
  // opcional para depuración:
  // console.log('partner asignado para', jugador.id, jugador.partner);
}

  /**
   * Comprueba si un candidato ya está emparejado con otro jugador distinto
   */
  isAlreadyPaired(candidate: User, jugador: TournamentPlayer): boolean {
    return this.selectedPlayers.some(p => p.partner?.id === candidate.id && p.id !== jugador.id);
  }

  async confirmPairs() {
    if (!this.selectedCategory) {
      this.error = 'Selecciona una categoría antes de confirmar las parejas.';
      await this.alertService.error('Error', this.error);
      return;
    }

    for (const jugador of this.selectedPlayers) {
      if (!jugador.partner) {
        const msg = `El jugador ${jugador.name} ${jugador.lastname} no tiene pareja asignada.`;
        this.error = msg;
        await this.alertService.error('Falta pareja', msg);
        return;
      }
    }

    const confirmResult = await this.alertService.confirm('Confirmar', '¿Deseas agregar las parejas al torneo?');
    if (!confirmResult.isConfirmed) return;

    const addedPairs = new Set<string>();
    const requests: any[] = [];

    for (const j of this.selectedPlayers) {
      const key = [Number(j.id), Number(j.partner!.id)].sort().join('-');
      if (!addedPairs.has(key)) {
        addedPairs.add(key);
        const payload = {
          user_id: Number(j.id),
          category_tournament_id: Number(this.selectedCategory!.id),
          partner_id: Number(j.partner!.id)
        };
        requests.push({
          req: this.tournamentService.addUsertoTournament(payload),
          jugador: j
        });
      }
    }

    if (requests.length === 0) {
      await this.alertService.info('Nada para agregar', 'No hay parejas nuevas para agregar.');
      return;
    }

    forkJoin(requests.map(r => r.req)).subscribe({
      next: async (responses) => {
        const errors: string[] = [];
        const successes: string[] = [];

        responses.forEach((res, i) => {
          const jugador = requests[i].jugador;
          const coupleData = res?.couple?.couple;

          if (coupleData?.ok) {
            successes.push(`${jugador.name} + ${jugador.partner!.name}`);
          } else {
            const msg = coupleData?.message || 'Error al agregar la pareja.';
            errors.push(`Jugador: ${jugador.name} ${jugador.lastname}, Pareja: ${jugador.partner!.name} — ${msg}`);
          }
        });

        if (successes.length > 0) {
          await this.alertService.success('Parejas agregadas', successes.join(', '));
        }

        if (errors.length > 0) {
          await this.alertService.error('Algunos errores ocurrieron', errors.join('\n'));
        }

        this.dialogRef.close(true);
      },
      error: async () => {
        await this.alertService.error('Error', 'Ocurrió un error al agregar las parejas.');
      }
    });
  }
}
