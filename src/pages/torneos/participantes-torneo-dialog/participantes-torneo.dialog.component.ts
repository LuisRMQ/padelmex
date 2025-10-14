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

export interface Partido {
  jugador1: User | null;
  jugador2: User | null;
  ganador?: User | null;
  x?: number;
  y?: number;
  height?: number;
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
    MatInputModule
  ]
})
export class ParticipantesTorneoDialogComponent implements OnInit {

  playerSearchControl = new FormControl('');
  selectedPlayers: User[] = [];
  filteredPlayers!: Observable<User[]>;
  isLoadingPlayers = false;
  error: string | null = null;
  participantes: User[] = [];
  loading = false;
  defaultAvatar = 'assets/images/placeholder.png';
  allPlayers: User[] = [];
  selectedCategory: { id: number, max_participants: number } | null = null;
  categories: { id: number, max_participants: number, name: string }[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number, categories: { id: number, max_participants: number, name: string }[] },
    private dialogRef: MatDialogRef<ParticipantesTorneoDialogComponent>,
    private usersService: UsersService,
    private dialog: MatDialog,
    private tournamentService: TournamentService
  ) { }

  ngOnInit(): void {
    this.categories = this.data.categories;
    this.cargarParticipantes();
    this.cargarJugadores();
    this.filteredPlayers = this.playerSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterPlayers(value ?? ''))
    );

    console.log('Categorías recibidas:', this.categories);
  }

  cargarParticipantes() {
    this.loading = true;
    this.usersService.getUsersByRol(8).subscribe({
      next: (res: User[]) => {
        this.participantes = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los participantes';
        this.loading = false;
        console.error(err);
      }
    });
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

  addPlayer(user: User): void {
    if (!this.selectedCategory) {
      this.error = 'Selecciona una categoría antes de agregar jugadores.';
      return;
    }
    if (this.selectedPlayers.some(p => p.id === user.id)) return;
    this.error = null;
    this.selectedPlayers.push(user);
    this.participantes.push(user);
    this.tournamentService.addUsertoTournament({
      user_id: user.id,
      category_tournament_id: this.selectedCategory.id,
      partner_id: null
    }).subscribe();
    this.playerSearchControl.setValue('');
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
  }

  removePlayer(user: User): void {
    this.selectedPlayers = this.selectedPlayers.filter(p => p.id !== user.id);
    this.participantes = this.participantes.filter(p => p.id !== user.id);
    //this.tournamentService.removeUserFromTournament(user.id, this.data.torneoId).subscribe();
  }
}
