import { Component, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDivider } from "@angular/material/divider";
import { TournamentService } from '../../app/services/torneos.service';
import { EstadisticasService } from '../../app/services/estadisticas.service';

import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  PieController,
  ChartOptions,
  LineController, LineElement, PointElement
} from 'chart.js';

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

  constructor(
    private tournamentService: TournamentService,
    private datePipe: DatePipe,
    private stats: EstadisticasService,

  ) { }

  ngOnInit() {
    this.cargarTorneos();
    this.cargarJugadoresActivos(1);

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
    this.stats.getUsersWithMostReservationByClub(1).subscribe({
      next: (res) => {
        this.jugadoresActivos = res.map(player => ({
          nombre: player.fullname,
          rentas: player.total_reservations
        }));
      },
      error: (err) => console.error('Error cargando jugadores activos:', err)
    });
  }

  public chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  ocupacionData = {
    labels: ['Ocupadas', 'Libres'],
    datasets: [
      {
        data: [60, 40],
        backgroundColor: ['#42A5F5', '#66BB6A'],
        hoverBackgroundColor: ['#64B5F6', '#81C784']
      }
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
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#666', font: { size: 16 } }
      }
    },
    scales: {
      x: { grid: { color: '#eee' }, ticks: { color: '#666', font: { size: 14 } } },
      y: { grid: { color: '#eee' }, ticks: { color: '#666', font: { size: 14 } } }
    }
  };

  // === Jugadores activos ===


  // === Ranking ===
  ranking = [
    { posicion: 1, nombre: 'Luis Ramírez', movimiento: '+1', tipo: 'positive' },
    { posicion: 2, nombre: 'Eric Romario', movimiento: '+1', tipo: 'positive' },
    { posicion: 3, nombre: 'Humberto Hernandez', movimiento: '-2', tipo: 'negative' },
    { posicion: 4, nombre: 'Javier Ontiveros', movimiento: '+1', tipo: 'positive' },
    { posicion: 5, nombre: 'Igmar Salazar', movimiento: '-1', tipo: 'negative' },
    { posicion: 6, nombre: 'Abel Sosa', movimiento: '+0', tipo: 'neutral' },
    { posicion: 7, nombre: 'Nuevo Jugador', movimiento: '+0', tipo: 'neutral' },
    { posicion: 8, nombre: 'Jugador Adicional 2', movimiento: '+0', tipo: 'neutral' },
    { posicion: 9, nombre: 'Jugador Extra 2', movimiento: '+0', tipo: 'neutral' },
    { posicion: 10, nombre: 'Jugador Nuevo 2', movimiento: '+0', tipo: 'neutral' }
  ];
}
