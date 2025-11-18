import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../../app/services/users.service';
interface Tournament {
  tournament_id: number;
  tournament_name: string;
  tournament_photo: string | null;
  tournament_ranking: number;
  start_date: string;
  end_date: string;
  category_tournament_id: number;
  category_name: string;
  gender: string;
  level: string;
  ranking_torneo: string;
  puntos_ganados: number;
  puntos_ganados_func: number;
}

@Component({
  selector: 'app-historial-cards',
  standalone: true,
  templateUrl: './historial-usuario-dialog.component.html',
  styleUrls: ['./historial-usuario-dialog.component.css'],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class TournamentsCardsComponent implements OnInit {

  tournaments: Tournament[] = [];
  loading = true;
  placeholder = 'https://via.placeholder.com/400x220?text=No+image';

  constructor(
    private usersService: UsersService,

    @Inject(MAT_DIALOG_DATA) public data: { userId: number; nombre: string }
  ) {}

  ngOnInit(): void {
   

    this.usersService.getUserGameHistory(this.data.userId).subscribe({
      next: (res: Tournament[]) => {
        this.tournaments = res;
        this.loading = false;
      },
      error: (err) => {
        console.error("Error cargando historial:", err);
        this.loading = false;
      }
    });
  }

  onViewDetails(t: Tournament) {
    console.log('Ver detalles del torneo:', t.tournament_id);
  }

  isPast(endDateIso: string): boolean {
    const today = new Date();
    const end = new Date(endDateIso + 'T23:59:59');
    return end < today;
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = '../../assets/images/placeholder.png';
  }
}
