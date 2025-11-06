import { Component, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDivider } from "@angular/material/divider";
import { TournamentService } from '../../app/services/torneos.service';
import { EstadisticasService } from '../../app/services/estadisticas.service';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController, Title, PieController, ChartOptions, LineController, LineElement, PointElement } from 'chart.js';
import { map } from 'rxjs/operators';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  PieController,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Title,
  LineController,
  LineElement,
  PointElement
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, CommonModule, MatDivider],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [DatePipe]
})
export class DashboardComponent implements OnInit {

  torneos: any[] = [];
  jugadoresActivos: any[] = [];
  ranking: any[] = [];

  constructor(
    private tournamentService: TournamentService,
    private datePipe: DatePipe,
    private stats: EstadisticasService,
  ) { }

  ngOnInit() {
    this.cargarTorneos();
    this.cargarJugadoresActivos(1);
    this.cargarRanking();
  }

  cargarTorneos() {
    this.tournamentService.getTournaments().subscribe({
      next: (res: any) => {
        const apiTorneos = res.data?.data || [];
        this.torneos = apiTorneos.map((t: any) => ({
          nombre: t.name,
          fecha: this.datePipe.transform(t.start_date, 'dd/MM/yyyy'),
          participantes: t.current_participants,
          lugares: t.max_participants
        }));
      },
      error: (err) => console.error('Error al obtener torneos:', err)
    });
  }

  cargarJugadoresActivos(club_id: number) {
    this.stats.getUsersWithMostReservationByClub(club_id).subscribe({
      next: (res) => {
        this.jugadoresActivos = res.map(player => ({
          nombre: player.fullname,
          rentas: player.total_reservations
        }));
      },
      error: (err) => console.error('Error cargando jugadores activos:', err)
    });
  }

  cargarRanking() {
    this.stats.getTop10Ranking().subscribe({
      next: (players) => {
        this.ranking = players.map((p, index) => ({
          posicion: index + 1,
          nombre: `${p.name} ${p.lastname}`,
          puntos: p.point,
          categoria: p.category,
          foto: p.profile_photo
        }));
      },
      error: (err) => console.error('Error cargando ranking:', err)
    });
  }


  public chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  };

  ocupacionData = {
    labels: ['Ocupadas', 'Libres'],
    datasets: [
      { data: [60, 40], backgroundColor: ['#42A5F5', '#66BB6A'], hoverBackgroundColor: ['#64B5F6', '#81C784'] }
    ]
  };

  gananciasLabels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio'];
  gananciasData = [
    {
      label: 'Ganancias Mensuales',
      data: [120000, 880000, 650000, 540000, 430000, 340000, 670000],
      fill: false,
      borderColor: '#43a047',
      backgroundColor: '#eafaf1',
      pointBackgroundColor: '#43a047',
      pointBorderColor: '#fff',
      pointRadius: 7,
      pointHoverRadius: 9,
      tension: 0.3
    }
  ];

  public gananciasOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top', labels: { color: '#666', font: { size: 16 } } }
    },
    scales: {
      x: { grid: { color: '#eee' }, ticks: { color: '#666', font: { size: 14 } } },
      y: { grid: { color: '#eee' }, ticks: { color: '#666', font: { size: 14 } } }
    }
  };
}
