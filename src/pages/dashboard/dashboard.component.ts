import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';

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
  ChartOptions
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
  Title
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, CommonModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {


  public chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      }
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

  gananciasData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Ganancias',
        data: [5000, 9000, 7000, 3000, 2000, 8000],
        backgroundColor: '#42A5F5'
      }
    ]
  };

 jugadoresActivos = [
  { nombre: 'Luis Ramírez', rentas: 25, imagen: '../../assets/images/iconuser.png' },
  { nombre: 'Eric Ramírez', rentas: 20, imagen: '../../assets/images/iconuser.png' },
  { nombre: 'Ana Gómez', rentas: 15, imagen: '../../assets/images/iconuser.png' }
];


  ranking = [
    { posicion: 1, nombre: 'Luis Ramírez' },
    { posicion: 2, nombre: 'Eric Ramírez' },
    { posicion: 3, nombre: 'Ana Gómez' }
  ];

  torneos = [
    { nombre: 'Torneo Verano 2025', fecha: '2025-07-15', participantes: 20 },
    { nombre: 'Copa Invierno 2025', fecha: '2025-12-10', participantes: 32 },
    { nombre: 'Open Primavera 2026', fecha: '2026-04-05', participantes: 16 }
  ];
}
