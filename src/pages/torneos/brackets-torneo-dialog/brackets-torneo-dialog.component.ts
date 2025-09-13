import { Component, Inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { Participante, Partido } from '../registrar-torneo-dialog/registrar-torneo-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-bracket-modal',
  template: `
    <h2>Bracket del Torneo</h2>
    <div #bracketContainer class="bracket-container" style="width: 100%; height: 600px;"></div>
    <button mat-raised-button color="primary" (click)="cerrar()">Cerrar</button>
  `,
  styles: [`
    .bracket-container {
      border: 1px solid #ccc;
      margin-top: 10px;
      overflow: auto;
    }
  `],
  standalone: true,
  imports: []
})
export class BracketModalComponent implements AfterViewInit {
  @ViewChild('bracketContainer', { static: false }) bracketContainer!: ElementRef;
  private svg: any;
  private matchWidth = 200;
  private matchHeight = 80;
  private spacingX = 150;
  private verticalSpacing = 40;
  private logoSize = 30;

  bracket: Partido[][] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { bracket: Partido[][] },
    private dialogRef: MatDialogRef<BracketModalComponent>,
    private el: ElementRef
  ) {
    if (data?.bracket) {
      this.bracket = data.bracket;
    }
  }

  ngAfterViewInit() {
    if (!this.bracket || !this.bracket.length) return;
    setTimeout(() => this.drawBracket(), 0);
  }

  private drawBracket() {
  if (!this.bracketContainer?.nativeElement) return;

  const container = this.bracketContainer.nativeElement as HTMLElement;
  
  // Calcular el tamaño necesario del SVG
  const width = this.bracket.length * (this.matchWidth + this.spacingX) + 100;
  const maxMatches = Math.max(...this.bracket.map(r => r.length));
  const height = maxMatches * (this.matchHeight + this.verticalSpacing) + 100;

  // Seleccionar o crear SVG
  this.svg = d3.select(container).select('svg');
  if (this.svg.empty()) {
    this.svg = d3.select(container).append('svg');
  }

  this.svg.attr('width', width)
          .attr('height', height);

  this.svg.selectAll('*').remove();

  this.calculatePositions(height);

  this.bracket.forEach((ronda, roundIndex) => {
    ronda.forEach((partido, matchIndex) => {
      this.drawMatch(partido, roundIndex, matchIndex);
      if (roundIndex < this.bracket.length - 1) {
        this.drawConnections(partido, roundIndex, matchIndex);
      }
    });
  });
}


  private calculatePositions(containerHeight: number) {
  this.bracket.forEach((ronda, roundIndex) => {
    const x = roundIndex * (this.matchWidth + this.spacingX) + 50;
    const matchesInRound = ronda.length;
    const totalHeight = matchesInRound * (this.matchHeight + this.verticalSpacing) - this.verticalSpacing;
    const startY = (containerHeight - totalHeight) / 2; // centra verticalmente

    ronda.forEach((partido, i) => {
      partido.x = x;
      partido.y = startY + i * (this.matchHeight + this.verticalSpacing);
      partido.height = this.matchHeight;
    });
  });
}

  private drawMatch(partido: Partido, roundIndex: number, matchIndex: number) {
    const x = partido.x!;
    const y = partido.y!;

    const g = this.svg.append('g').attr('transform', `translate(${x}, ${y})`);

    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight)
      .attr('fill', 'transparent')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2)
      .attr('rx', 5)
      .attr('ry', 5);

    if (partido.jugador1) {
      this.drawPlayer(g, partido.jugador1, 0, partido.ganador === partido.jugador1, partido, roundIndex, matchIndex);
    }
    if (partido.jugador2) {
      this.drawPlayer(g, partido.jugador2, this.matchHeight / 2, partido.ganador === partido.jugador2, partido, roundIndex, matchIndex);
    }
  }

  private drawPlayer(group: any, jugador: Participante, yOffset: number, esGanador: boolean, partido: Partido, roundIndex: number, matchIndex: number) {
    group.append('rect')
      .attr('x', 0)
      .attr('y', yOffset)
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2)
      .attr('fill', esGanador ? '#28a745' : '#6c757d')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', () => this.marcarGanador(jugador, roundIndex, matchIndex));

    if (jugador.logo) {
      group.append('image')
        .attr('xlink:href', jugador.logo)
        .attr('x', 5)
        .attr('y', yOffset + 5)
        .attr('width', this.logoSize)
        .attr('height', this.logoSize);
    }

    group.append('text')
      .text(jugador.nombre)
      .attr('x', this.logoSize + 15)
      .attr('y', yOffset + (this.matchHeight / 4))
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .attr('font-size', '12px');
  }

  private marcarGanador(jugador: Participante, roundIndex: number, matchIndex: number) {
    const partido = this.bracket[roundIndex][matchIndex];
    partido.ganador = jugador;

    const nextRound = this.bracket[roundIndex + 1];
    if (nextRound) {
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const nextMatch = nextRound[nextMatchIndex];
      if (!nextMatch.jugador1) nextMatch.jugador1 = jugador;
      else nextMatch.jugador2 = jugador;
    }

    this.drawBracket();
  }

  private drawConnections(partido: Partido, roundIndex: number, matchIndex: number) {
    const currentX = partido.x! + this.matchWidth;
    const currentY = partido.y! + (partido.height! / 2);

    const nextRound = this.bracket[roundIndex + 1];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextPartido = nextRound[nextMatchIndex];

    const nextX = nextPartido.x!;
    const nextY = nextPartido.y! + (nextPartido.height! / 2);

    this.svg.append('line')
      .attr('x1', currentX)
      .attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2))
      .attr('y2', currentY)
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2);

    this.svg.append('line')
      .attr('x1', currentX + (this.spacingX / 2))
      .attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2))
      .attr('y2', nextY)
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2);

    this.svg.append('line')
      .attr('x1', currentX + (this.spacingX / 2))
      .attr('y1', nextY)
      .attr('x2', nextX)
      .attr('y2', nextY)
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2);
  }

  cerrar() {
    this.dialogRef.close();
  }
}
