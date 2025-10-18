import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TournamentService } from '../../../app/services/torneos.service';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RegistrarGanadorDialogComponent } from './score-torneo-dialog/registrar-ganador.dialog.component';
import { MatDialog } from '@angular/material/dialog';
export type ViewMode = 'bracket' | 'cards' | 'sets';




export interface Partido {
  id?: number | null;
  jugador1?: any[];
  jugador2?: any[];
  ganador?: any | null;
  x?: number;
  y?: number;
  height?: number;
  groupName: string;
  couple1Id?: number | null;
  couple2Id?: number | null;
  nextMatchIndex?: number | null;
    scores1?: number[];
  scores2?: number[];
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
    MatSelectModule,
    MatToolbarModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class InicioTorneoDialogComponent implements OnInit, AfterViewInit {

  @ViewChild('bracketContainer', { static: false }) bracketContainer!: ElementRef;

  bracket: any[] = [];
  filteredBracket: any[] = [];
  selectedCategory: any = null;
  categories: any[] = [];
  results: any[] = [];

  loading = false;
  error: string | null = null;

  private svg: any;
  private gContainer: any;

  private matchWidth = 200;
  private matchHeight = 80;
  private spacingX = 150;
  private verticalSpacing = 40;

  // Variables para arrastrar el bracket (drag)
  private startX = 0;
  private startY = 0;
  private translateX = 0;
  private translateY = 0;

  viewMode: ViewMode = 'bracket'; 
  bracketDataCards: Partido[][] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number },
    private dialogRef: MatDialogRef<InicioTorneoDialogComponent>,
    private tournamentService: TournamentService,
    private dialog: MatDialog
  ) { }



  toggleViewMode() {
    if (this.viewMode === 'bracket') {
      this.viewMode = 'cards';
    } else if (this.viewMode === 'cards') {
      this.viewMode = 'sets';
    } else {
      this.viewMode = 'bracket';
    }

    // Si vuelve a bracket, redibujamos
    if (this.viewMode === 'bracket') {
      setTimeout(() => this.drawBracket(true), 0);
    }
  }

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
        this.bracket = res.data?.data?.bracket || [];
        this.categories = this.bracket;
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

    if (this.filteredBracket.length > 0) {
      setTimeout(() => this.drawBracket(), 0);

      // 🔹 Solo generar resultados si hay datos
      this.generateResultsFromBracket(this.filteredBracket[0]);
    } else {
      // Si no hay bracket, limpiar resultados y SVG
      this.results = [];
      if (this.gContainer) this.gContainer.selectAll('*').remove();
    }
  }
}




private generateResultsFromBracket(category: any) {
  const rounds = this.mapToPartidos(category);

  const results: any[] = [];

  rounds.forEach((round, roundIndex) => {
    round.forEach((match: any) => {
      const scores1 = match.scores1 || [];
      const scores2 = match.scores2 || [];
      let winner: 'player1' | 'player2' | null = null;

      if (match.ganador) {
        winner = match.ganador === match.jugador1 ? 'player1' : 'player2';
      }

      results.push({
        roundName: this.computePhaseLabels(rounds)[roundIndex] || `Ronda ${roundIndex + 1}`,
        groupName: match.groupName,
        player1: this.getPlayerNames(match.jugador1),
        player2: this.getPlayerNames(match.jugador2),
        scores1,
        scores2,
        winner,
        isFinal: roundIndex === rounds.length - 1
      });
    });
  });

  this.results = results;
}


  abrirModalPartido(partido: Partido, roundIndex: number, matchIndex: number) {
    const dialogRef = this.dialog.open(RegistrarGanadorDialogComponent, {
      width: '700px',
      data: { partido, roundIndex, matchIndex }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.marcarGanador(result, roundIndex, matchIndex);
      }
    });
  }

  marcarGanador(ganador: any, roundIndex: number, matchIndex: number) {
    const bracketData: Partido[][] = this.mapToPartidos(this.filteredBracket[0]);

    if (bracketData[roundIndex] && bracketData[roundIndex][matchIndex]) {
      bracketData[roundIndex][matchIndex].ganador = ganador;
    }

    this.drawBracket();
  }

  cerrar() {
    this.dialogRef.close();
  }

  // ------------------ D3 DRAW ------------------
  private drawBracket(useCachedData: boolean = false) {
  // 🔹 Si estamos en modo cards, no hacer nada
  if (this.viewMode === 'cards') {
    return;
  }

  // 🔹 Verificación más robusta del contenedor
  if (!this.bracketContainer?.nativeElement) {
    console.warn('Contenedor bracketContainer no disponible');
    return;
  }

  const container = this.bracketContainer.nativeElement as HTMLElement;
  
  // 🔹 Verificar si el contenedor es visible
  if (container.offsetParent === null) {
    console.warn('Contenedor no visible en el DOM');
    // Reintentar después de un breve delay
    setTimeout(() => this.drawBracket(useCachedData), 50);
    return;
  }

  // 🔹 Usar datos cacheados si existen
  const bracketData: Partido[][] = useCachedData && this.bracketDataCards.length
    ? this.bracketDataCards
    : this.mapToPartidos(this.filteredBracket[0]);

  // 🔹 Guardar los datos cacheados solo si no vienen de cache
  if (!useCachedData) {
    this.bracketDataCards = bracketData;
  }

  // 🔹 Limpiar completamente el contenedor
  d3.select(container).selectAll('*').remove();

  const width = bracketData.length * (this.matchWidth + this.spacingX) + 100;
  const maxMatches = bracketData.length > 0
    ? Math.max(...bracketData.map(r => r.length > 0 ? r.length : 0))
    : 1;
  const height = maxMatches * (this.matchHeight + this.verticalSpacing) + 100;

  // 🔹 Crear SVG nuevo
  this.svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'bracket-svg');

  this.gContainer = this.svg.append('g').attr('class', 'bracket-container');

  // ... el resto del código de drawBracket permanece igual
  const phases: string[] = this.computePhaseLabels(bracketData);
  phases.forEach((phase, i) => {
    const x = i * (this.matchWidth + this.spacingX) + this.matchWidth / 2 + 50;
    this.gContainer.append('text')
      .text(phase)
      .attr('x', x)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#000')
      .attr('font-weight', 'bold')
      .attr('font-size', '20px');
  });

  this.calculatePositions(bracketData, height);

  bracketData.forEach((ronda, roundIndex) => {
    ronda.forEach((partido, matchIndex) => {
      this.drawMatch(partido, roundIndex, matchIndex);
      if (roundIndex < bracketData.length - 1) {
        this.drawConnections(partido, roundIndex, matchIndex, bracketData);
      }
    });
  });

  this.svg.call(
    d3.drag()
      .on('start', (event: any) => {
        this.startX = event.x - this.translateX;
        this.startY = event.y - this.translateY;
      })
      .on('drag', (event: any) => {
        this.translateX = event.x - this.startX;
        this.translateY = event.y - this.startY;
        this.gContainer.attr('transform', `translate(${this.translateX}, ${this.translateY})`);
      })
  );
}


private forceRedrawBracket() {
  if (this.viewMode === 'bracket') {
    // Limpiar cache y redibujar desde cero
    this.bracketDataCards = [];
    setTimeout(() => {
      this.drawBracket(false);
    }, 0);
  }
}


  // ------------------ MAPEO DE PARTIDOS MEJORADO ------------------
  private mapToPartidos(category: any): Partido[][] {
    const rounds: Partido[][] = [];

    // 1) FASE DE GRUPOS
    const groupRound: Partido[] = [];
    const groupsData: any[] = [];

    category.groups.forEach((group: any) => {
      const ranking = group.ranking || [];
      const rankById: { [id: number]: any } = {};
      ranking.forEach((r: any) => { rankById[r.couple_id] = r; });

      const matches: Partido[] = [];
      const seenPairs = new Set<string>();

      (group.games || []).forEach((game: any) => {
        const a = game.couple_1;
        const b = game.couple_2;
        if (a == null || b == null) return;
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        seenPairs.add(key);

        matches.push({
          jugador1: rankById[a]?.players || [{ name: 'Por asignar' }],
          jugador2: rankById[b]?.players || [{ name: 'Por asignar' }],
          ganador: null,
          groupName: group.group_name,
          id: game.game_id || null,
          couple1Id: a || null,
          couple2Id: b || null,
            scores1: game.scores1 || [0,0,0], // valores por defecto
  scores2: game.scores2 || [0,0,0]
        });
      });

      for (let i = 0; i < ranking.length && matches.length < 4; i++) {
        for (let j = i + 1; j < ranking.length && matches.length < 4; j++) {
          const a = ranking[i].couple_id;
          const b = ranking[j].couple_id;
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (seenPairs.has(key)) continue;
          seenPairs.add(key);
          matches.push({
            jugador1: ranking[i]?.players || [{ name: 'Por asignar' }],
            jugador2: ranking[j]?.players || [{ name: 'Por asignar' }],
            ganador: null,
            groupName: group.group_name,
            id: null,
            couple1Id: a || null,
            couple2Id: b || null,
            
          });
        }
      }

      groupRound.push(...matches);

      // Guardar datos del grupo para cálculo dinámico
      groupsData.push({
        groupName: group.group_name,
        ranking: ranking,
        totalCouples: ranking.length
      });
    });

    if (groupRound.length) rounds.push(groupRound);

    // 2) CÁLCULO DINÁMICO DE PAREJAS QUE AVANZAN
    const advancingCouples = this.calculateAdvancingCouples(groupsData);

    // 3) CREAR ELIMINATORIAS DINÁMICAMENTE
    this.createDynamicEliminationRounds(advancingCouples, rounds);

    return rounds;
  }

  private calculateAdvancingCouples(groupsData: any[]): any[] {
    const advancingCouples: any[] = [];

    // Estrategia dinámica basada en el tamaño de los grupos
    groupsData.forEach(group => {
      const totalCouples = group.totalCouples;
      let numToAdvance: number;

      // Lógica de avance escalable y dinámica
      if (totalCouples <= 2) {
        numToAdvance = 1; // Grupos muy pequeños
      } else if (totalCouples <= 4) {
        numToAdvance = 2; // Grupos medianos (como tu Grupo E)
      } else if (totalCouples <= 6) {
        numToAdvance = 3; // Grupos grandes
      } else {
        numToAdvance = Math.ceil(totalCouples * 0.5); // 50% para grupos muy grandes
      }

      console.log(`Grupo ${group.groupName}: ${totalCouples} parejas, avanzan ${numToAdvance}`);

      // Agregar las parejas que avanzan
      advancingCouples.push(...group.ranking.slice(0, numToAdvance).map((r: any) => ({
        ...r,
        groupName: group.groupName,
        originalGroup: group.groupName
      })));
    });

    return advancingCouples;
  }

  private createDynamicEliminationRounds(advancingCouples: any[], rounds: Partido[][]) {
    if (advancingCouples.length === 0) return;

    let currentRoundNumber = 1;
    let currentParticipants = [...advancingCouples];
    let allEliminationRounds: Partido[][] = [];

    // Crear rondas eliminatorias hasta tener un ganador
    while (currentParticipants.length > 1) {
      const currentRound: Partido[] = [];

      for (let i = 0; i < currentParticipants.length; i += 2) {
        const left = currentParticipants[i];
        const right = currentParticipants[i + 1];

        const match: Partido = {
          jugador1: left?.players || [{ name: `Ganador R${currentRoundNumber}-${i}` }],
          jugador2: right?.players || [{ name: 'BYE' }], // Para números impares
          ganador: null,
          groupName: `Ronda ${currentRoundNumber}`,
          id: null,
          couple1Id: left?.couple_id || null,
          couple2Id: right?.couple_id || null,
          nextMatchIndex: Math.floor(i / 2)
        };

        // Si hay BYE, el jugador avanza automáticamente
        if (!right) {
          match.ganador = left;
        }

        currentRound.push(match);
      }

      allEliminationRounds.push(currentRound);

      // Preparar siguiente ronda (placeholders)
      currentParticipants = currentRound.map((match, index) => ({
        players: [{ name: `Ganador R${currentRoundNumber}-M${index + 1}` }],
        couple_id: null,
        groupName: `R${currentRoundNumber}`
      }));

      currentRoundNumber++;
    }

    // Conectar las rondas entre sí
    allEliminationRounds.forEach((round, roundIndex) => {
      if (roundIndex < allEliminationRounds.length - 1) {
        round.forEach((match, matchIndex) => {
          match.nextMatchIndex = matchIndex;
        });
      }
    });

    // Agregar todas las rondas eliminatorias al bracket
    rounds.push(...allEliminationRounds);
  }

  // ------------------ HELPERS ------------------
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
    const g = this.gContainer.append('g').attr('transform', `translate(${partido.x}, ${partido.y})`);

    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', matchHeight / 2 - 2)
      .attr('fill', '#90caf9')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2)
      .attr('rx', 5);

    g.append('rect')
      .attr('y', matchHeight / 2 + 2)
      .attr('width', this.matchWidth)
      .attr('height', matchHeight / 2 - 2)
      .attr('fill', '#f48fb1')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2)
      .attr('rx', 5);

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

    const maxTextWidth = this.matchWidth - 20;

    if (partido.jugador1) {
      const nombres1 = partido.jugador1.map(j => j.name).join(' / ');
      g.append('text')
        .text(nombres1)
        .attr('x', 10)
        .attr('y', matchHeight / 4)
        .attr('dy', '0.35em')
        .attr('fill', '#000')
        .attr('font-weight', 'bold')
        .attr('font-size', '14px')
        .call(this.wrapText, maxTextWidth, matchHeight / 2 - 4);
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
        .attr('font-size', '14px')
        .call(this.wrapText, maxTextWidth, matchHeight / 2 - 4);
    }

    g.style('cursor', 'pointer')
      .on('click', () => this.abrirModalPartido(partido, roundIndex, matchIndex));
  }

  private wrapText(text: d3.Selection<SVGTextElement, unknown, null, undefined>, width: number, maxHeight: number) {
    text.each(function (this: SVGTextElement) {
      const textEl = d3.select(this);
      const words = textEl.text().split(' / ');
      let line: string[] = [];
      let lineNumber = 0;
      const lineHeight = 14;
      const tspan = textEl.text(null).append('tspan').attr('x', 10).attr('y', textEl.attr('y')).attr('dy', 0);

      for (const word of words) {
        line.push(word);
        tspan.text(line.join(' / '));
        if ((tspan.node() as any).getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(' / '));
          line = [word];
          lineNumber++;
          if (lineNumber * lineHeight > maxHeight - lineHeight) {
            tspan.text(tspan.text() + ' ...');
            break;
          }
          textEl.append('tspan')
            .attr('x', 10)
            .attr('y', textEl.attr('y'))
            .attr('dy', lineNumber * lineHeight)
            .text(word);
        }
      }
    });
  }

  private drawConnections(partido: Partido, roundIndex: number, matchIndex: number, bracketData: Partido[][]) {
    const currentX = partido.x! + this.matchWidth;
    const currentY = partido.y! + (partido.height! / 2);
    const nextRound = bracketData[roundIndex + 1];
    if (!nextRound) return;

    if (partido.nextMatchIndex == null) return;
    const nextPartido = nextRound[partido.nextMatchIndex];
    if (!nextPartido) return;

    const nextX = nextPartido.x!;
    const nextY = nextPartido.y! + (nextPartido.height! / 2);

    this.gContainer.append('line')
      .attr('x1', currentX).attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2)).attr('y2', currentY)
      .attr('stroke', '#1e7e34').attr('stroke-width', 2);

    this.gContainer.append('line')
      .attr('x1', currentX + (this.spacingX / 2)).attr('y1', currentY)
      .attr('x2', currentX + (this.spacingX / 2)).attr('y2', nextY)
      .attr('stroke', '#1e7e34').attr('stroke-width', 2);

    this.gContainer.append('line')
      .attr('x1', currentX + (this.spacingX / 2)).attr('y1', nextY)
      .attr('x2', nextX).attr('y2', nextY)
      .attr('stroke', '#1e7e34').attr('stroke-width', 2);
  }

  public computePhaseLabels(bracketData: Partido[][]): string[] {
    const labels = ['Grupos'];

    for (let i = 1; i < bracketData.length; i++) {
      if (i === 1) {
        labels.push('Octavos');
      } else if (i === 2) {
        labels.push('Cuartos');
      } else if (i === 3) {
        labels.push('Semifinal');
      } else if (i === 4) {
        labels.push('Final');
      } else {
        labels.push(`Ronda ${i}`);
      }
    }

    return labels;
  }



get resultsGroupedByGroup(): { groupName: string, matches: any[] }[] {
  if (!this.results || this.results.length === 0) return [];
  const groups: { [key: string]: any[] } = {};
  this.results.forEach(match => {
    const group = match.groupName || 'Sin Grupo';
    if (!groups[group]) groups[group] = [];
    groups[group].push(match);
  });
  return Object.keys(groups).map(groupName => ({
    groupName,
    matches: groups[groupName]
  }));
}


  getPlayerNames(players?: any[]): string {
    if (!players || players.length === 0) return 'Por asignar';
    return players.map(p => p.name).join(' / ');
  }

}