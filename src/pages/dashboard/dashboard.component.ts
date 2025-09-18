import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { MatDivider } from "@angular/material/divider";

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
  styleUrls: ['./dashboard.component.css']
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
        position: 'top', // <-- Valor permitido
        labels: {
          color: '#666',
          font: { size: 16 }
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#eee' },
        ticks: { color: '#666', font: { size: 14 } }
      },
      y: {
        grid: { color: '#eee' },
        ticks: { color: '#666', font: { size: 14 } }
      }
    }
  };

  jugadoresActivos = [
    { nombre: 'Luis Ramírez', rentas: 50, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Eric Ramírez', rentas: 45, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Ana Gómez', rentas: 40, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Carlos López', rentas: 36, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Nuevo Jugador', rentas: 34, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Jugador Adicional 1', rentas: 32, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Jugador Adicional 2', rentas: 25, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Jugador Adicional 3', rentas: 22, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Jugador Adicional 4', rentas: 21, imagen: '../../assets/images/iconuser.png' },
    { nombre: 'Jugador Adicional 5', rentas: 15, imagen: '../../assets/images/iconuser.png' }
  ];


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

  torneos = [
    { nombre: 'Torneo Verano 2025', fecha: '2025-07-15', participantes: 20, lugares: 10 },
    { nombre: 'Copa Invierno 2025', fecha: '2025-12-10', participantes: 32, lugares: 8 },
    { nombre: 'Open Primavera 2026', fecha: '2026-04-05', participantes: 16, lugares: 12 }
  ];
}
