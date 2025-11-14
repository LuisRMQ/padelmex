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
import { Observable, forkJoin, of } from 'rxjs';
import { startWith, map, delay, switchMap } from 'rxjs/operators';
import { MatInputModule } from '@angular/material/input';
import { TournamentService } from '../../../app/services/torneos.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AlertService } from '../../../app/services/alert.service';
import { lastValueFrom } from 'rxjs';

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
  isProcessingPairs: boolean = false;

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
    jugador.partner = partner;
  }

  /**
   * Comprueba si un candidato ya está emparejado con otro jugador distinto
   */
  isAlreadyPaired(candidate: User, jugador: TournamentPlayer): boolean {
    return this.selectedPlayers.some(p => p.partner?.id === candidate.id && p.id !== jugador.id);
  }

  /**
   * Procesa las parejas de forma secuencial para evitar problemas de concurrencia
   */
  private async processPairsSequentially(requests: any[]): Promise<{ successes: string[], errors: string[] }> {
    const results = {
      successes: [] as string[],
      errors: [] as string[]
    };

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      
      try {
        console.log(`Procesando pareja ${i + 1} de ${requests.length}: ${request.jugador.name} + ${request.jugador.partner!.name}`);
        
        // Usar lastValueFrom para convertir el Observable a Promise
        const res = await lastValueFrom(request.req);
        const jugador = request.jugador;

        // ✅ MANEJO CORREGIDO DE LA RESPUESTA
        // Verificar diferentes estructuras posibles de respuesta
        const success = this.checkResponseSuccess(res);
        
        if (success) {
          results.successes.push(`${jugador.name} + ${jugador.partner!.name}`);
          console.log(`✅ Pareja ${i + 1} agregada exitosamente`);
        } else {
          const errorMessage = this.getErrorMessage(res);
          results.errors.push(`Jugador: ${jugador.name} ${jugador.lastname}, Pareja: ${jugador.partner!.name} — ${errorMessage}`);
          console.error(`❌ Error en pareja ${i + 1}:`, errorMessage);
        }

        // Pequeña pausa entre requests para evitar saturación (opcional)
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        const jugador = request.jugador;
        const errorMsg = `Error de conexión: ${error}`;
        results.errors.push(`Jugador: ${jugador.name} ${jugador.lastname}, Pareja: ${jugador.partner!.name} — ${errorMsg}`);
        console.error(`❌ Error de conexión en pareja ${i + 1}:`, error);
      }
    }

    return results;
  }

  /**
   * Verifica si la respuesta indica éxito
   */
  private checkResponseSuccess(res: any): boolean {
    // Verificar diferentes estructuras posibles de respuesta
    if (res?.couple?.couple?.ok) return true;
    if (res?.ok) return true;
    if (res?.success) return true;
    if (res?.status === 'success') return true;
    if (res?.message?.includes('éxito') || res?.message?.includes('success')) return true;
    
    // Si no hay error explícito, asumimos éxito
    return !this.hasExplicitError(res);
  }

  /**
   * Verifica si la respuesta tiene un error explícito
   */
  private hasExplicitError(res: any): boolean {
    if (res?.error) return true;
    if (res?.couple?.couple?.error) return true;
    if (res?.message?.includes('error') || res?.message?.includes('Error')) return true;
    return false;
  }

  /**
   * Obtiene el mensaje de error de la respuesta
   */
  private getErrorMessage(res: any): string {
    if (res?.couple?.couple?.message) return res.couple.couple.message;
    if (res?.message) return res.message;
    if (res?.error) return res.error;
    return 'Error desconocido al agregar la pareja';
  }

  async confirmPairs() {
    if (!this.selectedCategory) {
      this.error = 'Selecciona una categoría antes de confirmar las parejas.';
      await this.alertService.error('Error', this.error);
      return;
    }

    // Validar que todas las parejas estén asignadas
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

    // Preparar requests únicas
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

    console.log(`Iniciando procesamiento secuencial de ${requests.length} parejas...`);
    console.log('Estructura de requests:', requests);
    this.isProcessingPairs = true;

    try {
      // ✅ PROCESAMIENTO SECUENCIAL en lugar de forkJoin
      const results = await this.processPairsSequentially(requests);

      // Mostrar resultados
      if (results.successes.length > 0) {
        await this.alertService.success(
          'Parejas agregadas', 
          `Se agregaron ${results.successes.length} parejas exitosamente:\n${results.successes.join('\n')}`
        );
      }

      if (results.errors.length > 0) {
        await this.alertService.error(
          'Algunos errores ocurrieron', 
          `Errores en ${results.errors.length} parejas:\n${results.errors.join('\n')}`
        );
      }

      // Cerrar diálogo solo si hubo al menos un éxito, o preguntar al usuario
      if (results.successes.length > 0) {
        this.dialogRef.close(true);
      } else if (results.errors.length > 0) {
        const retry = await this.alertService.confirm(
          'Error', 
          'No se pudo agregar ninguna pareja. ¿Deseas intentarlo de nuevo?'
        );
        if (!retry.isConfirmed) {
          this.dialogRef.close(false);
        }
      }

    } catch (error) {
      console.error('Error general en el procesamiento:', error);
      await this.alertService.error('Error', 'Ocurrió un error inesperado al procesar las parejas.');
    } finally {
      this.isProcessingPairs = false;
    }
  }
}