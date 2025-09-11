import { Component, Input, OnInit, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import * as d3 from 'd3';

interface Participante {
  id: number;
  nombre: string;
  logo?: string;
}

interface Partido {
  id: number;
  jugador1?: Participante;
  jugador2?: Participante;
  ganador?: Participante;
  x?: number;
  y?: number;
  height?: number; // Nueva propiedad para la altura del partido
}

@Component({
  selector: 'app-bracket',
  standalone: true,
  templateUrl: './brackets-torneo-dialog.component.html',
  styleUrls: ['./brackets-torneo-dialog.component.css']
})
export class BracketComponent implements OnInit, AfterViewInit {

  @Input() participantes: Participante[] = [];

  private svg!: any;
  private containerWidth!: number;
  private containerHeight!: number;

  private matchWidth = 200;
  private matchHeight = 80; // Aumenté la altura para mejor visualización
  private verticalSpacing = 40; // Espacio vertical entre partidos
  private logoSize = 30;
  private spacingX = 150;
  private startX = 50;
  private startY = 50;

  partidos: Partido[][] = [];

  constructor(private el: ElementRef) {}

  ngOnInit() {
    const equipos: Participante[] = [
      {id:1,nombre:'Equipo A', logo:'../../assets/images/placeholder.png'},
      {id:2,nombre:'Equipo B', logo:'../../assets/images/placeholder.png'},
      {id:3,nombre:'Equipo C', logo:'../../assets/images/placeholder.png'},
      {id:4,nombre:'Equipo D', logo:'../../assets/images/placeholder.png'},
      {id:5,nombre:'Equipo E', logo:'../../assets/images/placeholder.png'},
      {id:6,nombre:'Equipo F', logo:'../../assets/images/placeholder.png'},
      {id:7,nombre:'Equipo G', logo:'../../assets/images/placeholder.png'},
      {id:8,nombre:'Equipo H', logo:'../../assets/images/placeholder.png'},
    ];

    // Ronda 1: Octavos
    const r1: Partido[] = [
      {id:1, jugador1:equipos[0], jugador2:equipos[1], ganador:equipos[0]},
      {id:2, jugador1:equipos[2], jugador2:equipos[3], ganador:equipos[3]},
      {id:3, jugador1:equipos[4], jugador2:equipos[5], ganador:equipos[4]},
      {id:4, jugador1:equipos[6], jugador2:equipos[7], ganador:equipos[7]},
    ];

    // Ronda 2: Semifinales
    const r2: Partido[] = [
      {id:5, jugador1:r1[0].ganador, jugador2:r1[1].ganador, ganador:r1[0].ganador},
      {id:6, jugador1:r1[2].ganador, jugador2:r1[3].ganador, ganador:r1[3].ganador},
    ];

    // Ronda 3: Final
    const r3: Partido[] = [
      {id:7, jugador1:r2[0].ganador, jugador2:r2[1].ganador, ganador:r2[0].ganador}
    ];

    this.partidos = [r1, r2, r3];
  }

  ngAfterViewInit() {
    this.svg = d3.select(this.el.nativeElement).select('svg');
    this.updateDimensions();
    this.drawBracket();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateDimensions();
    this.drawBracket();
  }

  private updateDimensions() {
    const container = this.el.nativeElement.querySelector('.bracket-container');
    this.containerWidth = container.clientWidth;
    this.containerHeight = container.clientHeight;

    this.svg
      .attr('width', this.containerWidth)
      .attr('height', this.containerHeight);
  }

  private drawBracket() {
    this.svg.selectAll('*').remove();

    const rounds = this.partidos.length;

    // Primera pasada: calcular posiciones Y de todos los partidos
    this.calculatePositions();

    // Segunda pasada: dibujar partidos y conexiones
    this.partidos.forEach((ronda, roundIndex) => {
      ronda.forEach((partido, i) => {
        this.drawMatch(partido);

        // Dibujar líneas de conexión
        if (roundIndex < rounds - 1) {
          this.drawConnections(partido, roundIndex, i);
        }
      });
    });
  }

  private calculatePositions() {
    this.partidos.forEach((ronda, roundIndex) => {
      const x = this.startX + roundIndex * (this.matchWidth + this.spacingX);
      const matchesInRound = ronda.length;
      
      // Calcular la altura total necesaria para esta ronda
      const totalHeight = matchesInRound * (this.matchHeight + this.verticalSpacing) - this.verticalSpacing;
      
      // Calcular el punto de inicio Y para centrar verticalmente
      const startY = (this.containerHeight - totalHeight) / 2;

      ronda.forEach((partido, i) => {
        partido.x = x;
        partido.y = startY + i * (this.matchHeight + this.verticalSpacing);
        partido.height = this.matchHeight;
      });
    });
  }

  private drawMatch(partido: Partido) {
    const x = partido.x!;
    const y = partido.y!;

    // Dibujar jugador 1
    if (partido.jugador1) {
      this.drawPlayer(partido.jugador1, x, y, partido.ganador === partido.jugador1);
    }

    // Dibujar jugador 2
    if (partido.jugador2) {
      this.drawPlayer(partido.jugador2, x, y + this.matchHeight / 2, partido.ganador === partido.jugador2);
    }

    // Dibujar caja del partido
    this.svg.append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', 'transparent')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2);
  }

  private drawPlayer(jugador: Participante, x: number, y: number, esGanador: boolean) {
    const group = this.svg.append('g')
      .attr('class', 'player')
      .attr('transform', `translate(${x}, ${y})`);

    // Fondo del jugador
    group.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2)
      .attr('fill', esGanador ? '#28a745' : '#6c757d')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 1);

    // Logo
    if (jugador.logo) {
      group.append('image')
        .attr('xlink:href', jugador.logo)
        .attr('x', 5)
        .attr('y', 5)
        .attr('width', this.logoSize)
        .attr('height', this.logoSize);
    }

    // Nombre
    group.append('text')
      .text(jugador.nombre)
      .attr('x', this.logoSize + 15)
      .attr('y', (this.matchHeight / 2) / 2)
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .attr('font-size', '12px');
  }

  private drawConnections(partido: Partido, roundIndex: number, matchIndex: number) {
    const currentX = partido.x! + this.matchWidth;
    const currentY = partido.y! + (partido.height! / 2);
    
    const nextRound = this.partidos[roundIndex + 1];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextPartido = nextRound[nextMatchIndex];
    
    const nextX = nextPartido.x!;
    const nextY = nextPartido.y! + (nextPartido.height! / 2);

    // Línea horizontal desde el partido actual
    this.svg.append('line')
      .attr('x1', currentX)
      .attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2))
      .attr('y2', currentY)
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2);

    // Línea vertical para conectar
    this.svg.append('line')
      .attr('x1', currentX + (this.spacingX / 2))
      .attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2))
      .attr('y2', nextY)
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2);

    // Línea horizontal hacia el próximo partido
    this.svg.append('line')
      .attr('x1', currentX + (this.spacingX / 2))
      .attr('y1', nextY)
      .attr('x2', nextX)
      .attr('y2', nextY)
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2);
  }
}