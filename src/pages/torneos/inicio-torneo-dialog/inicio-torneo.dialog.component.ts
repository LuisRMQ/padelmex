import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TournamentService } from '../../../app/services/torneos.service';
import { User } from '../../../app/services/users.service';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface Partido {
  jugador1?: any[]; // array de jugadores de la pareja
  jugador2?: any[];
  ganador?: any | null;
  x?: number;
  y?: number;
  height?: number;
  groupName: string;
}

@Component({
  selector: 'app-inicio-torneo-dialog',
  templateUrl: './inicio-torneo.dialog.component.html',
  styleUrls: ['./inicio-torneo.dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ]
})
export class InicioTorneoDialogComponent implements OnInit, AfterViewInit {

  @ViewChild('bracketContainer', { static: false }) bracketContainer!: ElementRef;

  bracket: any[] = [];
  filteredBracket: any[] = [];
  
  selectedCategory: any = null;
  categories: any[] = [];

  loading = false;
  error: string | null = null;

  private svg: any;
  private matchWidth = 200;
  private matchHeight = 80;
  private spacingX = 150;
  private verticalSpacing = 40;
  private logoSize = 30;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number },
    private dialogRef: MatDialogRef<InicioTorneoDialogComponent>,
    private tournamentService: TournamentService
  ) {}

  ngOnInit(): void {
    this.cargarBracket();
  }

  ngAfterViewInit(): void {
    if (this.filteredBracket.length) this.drawBracket();
  }

  cargarBracket() {
    this.loading = true;
    this.tournamentService.getBracketsByTournament(this.data.torneoId).subscribe({
      next: (res) => {
        this.bracket = res.data?.bracket || [];
        this.categories = this.bracket;
        this.selectedCategory = this.categories[0]?.category_name || null; 

        this.selectedCategory = this.categories[0] || null;
        this.filtrarCategoria();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar el bracket:', err);
        this.error = 'No se pudo cargar el bracket del torneo';
        this.loading = false;
      }
    });
  }

 filtrarCategoria() {
  if (this.selectedCategory) {
    this.filteredBracket = this.bracket.filter(
      b => b.category_name === this.selectedCategory
    );
    setTimeout(() => this.drawBracket(), 0);
  }
}

  cerrar() {
    this.dialogRef.close();
  }

  // ----------------- D3 -----------------

  private drawBracket() {
    if (!this.bracketContainer?.nativeElement || !this.filteredBracket.length) return;

    const bracketData: Partido[][] = this.mapToPartidos(this.filteredBracket[0]);
    const container = this.bracketContainer.nativeElement as HTMLElement;

    const width = bracketData.length * (this.matchWidth + this.spacingX) + 100;
    const maxMatches = Math.max(...bracketData.map(r => r.length));
    const height = maxMatches * (this.matchHeight + this.verticalSpacing) + 100;

    this.svg = d3.select(container).select('svg');
    if (this.svg.empty()) this.svg = d3.select(container).append('svg');

    this.svg.attr('width', width).attr('height', height);
    this.svg.selectAll('*').remove();

    this.calculatePositions(bracketData, height);

    bracketData.forEach((ronda, roundIndex) => {
      ronda.forEach((partido, matchIndex) => {
        this.drawMatch(partido, roundIndex, matchIndex);
        if (roundIndex < bracketData.length - 1) {
          this.drawConnections(partido, roundIndex, matchIndex, bracketData);
        }
      });
    });
  }

  private mapToPartidos(category: any): Partido[][] {
    const rounds: Partido[][] = [];

    // Ronda inicial: cada grupo
    const groupRound: Partido[] = [];
    category.groups.forEach((group: any) => {
      group.games.forEach((game: any) => {
        groupRound.push({
          jugador1: game.couple_1 ? game.couple_1.players : [{ name: 'Por asignar', photo: '', id: 0 }],
          jugador2: game.couple_2 ? game.couple_2.players : [{ name: 'Por asignar', photo: '', id: 0 }],
          ganador: null,
          groupName: group.group_name
        });
      });
    });

    if (groupRound.length) rounds.push(groupRound);

    // Rondas de eliminación
    const eliminationOrder = ['octavos', 'cuartos', 'semifinal', 'final'];
    eliminationOrder.forEach(round => {
      if (category.elimination[round]) {
        const elimRound: Partido[] = category.elimination[round].map((game: any) => ({
          jugador1: game.couple_1 ? game.couple_1.players : [{ name: 'Por asignar', photo: '', id: 0 }],
          jugador2: game.couple_2 ? game.couple_2.players : [{ name: 'Por asignar', photo: '', id: 0 }],
          ganador: null,
          groupName: ''
        }));
        rounds.push(elimRound);
      }
    });

    return rounds;
  }

  private calculatePositions(bracketData: Partido[][], containerHeight: number) {
    const maxMatches = Math.max(...bracketData.map(r => r.length));

    bracketData.forEach((ronda, roundIndex) => {
      const x = roundIndex * (this.matchWidth + this.spacingX) + 50;
      const totalHeight = ronda.length * this.matchHeight + (ronda.length - 1) * this.verticalSpacing;
      const startY = (containerHeight - totalHeight) / 2;

      ronda.forEach((partido, i) => {
        partido.x = x;
        partido.y = startY + i * (this.matchHeight + this.verticalSpacing);
        partido.height = this.matchHeight;
      });
    });
  }

private drawMatch(partido: Partido, roundIndex: number, matchIndex: number) {
  const matchHeight = this.matchHeight; 
  const x = partido.x!;
  const y = partido.y!;
  const g = this.svg.append('g').attr('transform', `translate(${x}, ${y})`);

  // Cuadro pareja 1 (arriba)
  g.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', this.matchWidth)
    .attr('height', matchHeight / 2 - 2)
    .attr('fill', '#90caf9') // color pareja 1
    .attr('stroke', '#1e7e34')
    .attr('stroke-width', 2)
    .attr('rx', 5)
    .attr('ry', 5);

  // Cuadro pareja 2 (abajo)
  g.append('rect')
    .attr('x', 0)
    .attr('y', matchHeight / 2 + 2)
    .attr('width', this.matchWidth)
    .attr('height', matchHeight / 2 - 2)
    .attr('fill', '#f48fb1') // color pareja 2
    .attr('stroke', '#1e7e34')
    .attr('stroke-width', 2)
    .attr('rx', 5)
    .attr('ry', 5);

  // Texto de grupo
  if (roundIndex === 0 && partido.groupName) {
    g.append('text')
      .text(partido.groupName)
      .attr('x', this.matchWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#000')
      .attr('font-weight', 'bold')
      .attr('font-size', '14px');
  }

  // Mostrar nombres de las parejas
  if (partido.jugador1) {
    const nombres1 = partido.jugador1.map(j => j.name).join(' / ');
    g.append('text')
      .text(nombres1)
      .attr('x', 10)
      .attr('y', matchHeight / 4)
      .attr('dy', '0.35em')
      .attr('fill', '#000')
      .attr('font-weight', 'bold')
      .attr('font-size', '14px');
  }

  if (partido.jugador2) {
    const nombres2 = partido.jugador2.map(j => j.name).join(' / ');
    g.append('text')
      .text(nombres2)
      .attr('x', 10)
      .attr('y', (3 * matchHeight) / 4)
      .attr('dy', '0.35em')
      .attr('fill', '#000')
      .attr('font-weight', 'bold')
      .attr('font-size', '14px');
  }

  partido.height = matchHeight;
}

private drawPlayer(group: any, jugadores: any[], yOffset: number, matchHeight: number, partido: Partido, roundIndex: number, matchIndex: number) {
  const gap = (matchHeight / 2) / jugadores.length; 
  jugadores.forEach((jugador, index) => {
    const y = yOffset + index * gap;

    if (jugador.photo) {
      group.append('image')
        .attr('xlink:href', jugador.photo)
        .attr('x', 5)
        .attr('y', y + 5)
        .attr('width', this.logoSize)
        .attr('height', this.logoSize);
    }

    group.append('text')
      .text(jugador.name)
      .attr('x', this.logoSize + 10)
      .attr('y', y + this.logoSize / 2)
      .attr('dy', '0.35em')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
      .attr('font-size', '12px');
  });
}

  private marcarGanador(jugador: any, roundIndex: number, matchIndex: number) {
    const bracketData = this.mapToPartidos(this.selectedCategory);
    const partido = bracketData[roundIndex][matchIndex];
    partido.ganador = jugador;

    const nextRound = bracketData[roundIndex + 1];
    if (nextRound) {
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const nextMatch = nextRound[nextMatchIndex];
      if (!nextMatch.jugador1) nextMatch.jugador1 = [jugador];
      else nextMatch.jugador2 = [jugador];
    }

    this.drawBracket();
  }

  private drawConnections(partido: Partido, roundIndex: number, matchIndex: number, bracketData: Partido[][]) {
    const currentX = partido.x! + this.matchWidth;
    const currentY = partido.y! + (partido.height! / 2);
    const nextRound = bracketData[roundIndex + 1];
    if (!nextRound) return;
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextPartido = nextRound[nextMatchIndex];
    const nextX = nextPartido.x!;
    const nextY = nextPartido.y! + (nextPartido.height! / 2);

    this.svg.append('line')
      .attr('x1', currentX).attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2)).attr('y2', currentY)
      .attr('stroke', '#1e7e34').attr('stroke-width', 2);

    this.svg.append('line')
      .attr('x1', currentX + (this.spacingX / 2)).attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2)).attr('y2', nextY)
      .attr('stroke', '#1e7e34').attr('stroke-width', 2);

    this.svg.append('line')
      .attr('x1', currentX + (this.spacingX / 2)).attr('y1', nextY)
      .attr('x2', nextX).attr('y2', nextY)
      .attr('stroke', '#1e7e34').attr('stroke-width', 2);
  }
}
