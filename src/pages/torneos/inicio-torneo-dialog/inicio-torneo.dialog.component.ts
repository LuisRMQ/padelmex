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
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { RegistrarGanadorDialogComponent } from './score-torneo-dialog/registrar-ganador.dialog.component';
import { MatDialog } from '@angular/material/dialog';

export interface Partido {
  id?: number; 
  jugador1?: any[];
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

  loading = false;
  error: string | null = null;

  private svg: any;
  private gContainer: any; // contenedor para drag
  private matchWidth = 200;
  private matchHeight = 80;
  private spacingX = 150;
  private verticalSpacing = 40;
  private logoSize = 30;

  // Variables drag
  private startX = 0;
  private startY = 0;
  private translateX = 0;
  private translateY = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number },
    private dialogRef: MatDialogRef<InicioTorneoDialogComponent>,
    private tournamentService: TournamentService,
    private dialog: MatDialog

  ) { }

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
      setTimeout(() => this.drawBracket(), 0);
    }
  }



  abrirModalPartido(partido: Partido, roundIndex: number, matchIndex: number) {
      console.log('Partido seleccionado:', partido); // <--- ver si tiene id

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
    const ronda = this.filteredBracket[0]?.groups || this.filteredBracket[0]?.elimination?.octavos; // depende de tu estructura

    // Por simplicidad, si estás usando bracketData, podrías manejarlo así:
    const bracketData: Partido[][] = this.mapToPartidos(this.filteredBracket[0]);

    if (bracketData[roundIndex] && bracketData[roundIndex][matchIndex]) {
      bracketData[roundIndex][matchIndex].ganador = ganador;
      console.log('Ganador registrado:', ganador);

      // Aquí podrías actualizar el siguiente partido automáticamente,
      // o hacer otra llamada al backend para guardar el resultado.
    }

    // Redibujar el bracket si quieres reflejar el cambio visualmente
    this.drawBracket();
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

    // Crear grupo contenedor para drag
    this.gContainer = this.svg.append('g').attr('class', 'bracket-container');

    // -----------------------------
    // DIBUJAR LOS TITULOS DE LAS FASES
    const phases = ['Fase de Grupos', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final'];
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
    // -----------------------------

    this.calculatePositions(bracketData, height);

    bracketData.forEach((ronda, roundIndex) => {
      ronda.forEach((partido, matchIndex) => {
        this.drawMatch(partido, roundIndex, matchIndex);
        if (roundIndex < bracketData.length - 1) {
          this.drawConnections(partido, roundIndex, matchIndex, bracketData);
        }
      });
    });

    // -----------------------------
    // Drag & Pan
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

  private mapToPartidos(category: any): Partido[][] {
  const rounds: Partido[][] = [];

  // Ronda inicial: cada grupo
  const groupRound: Partido[] = [];
  category.groups.forEach((group: any) => {
    group.games.forEach((game: any) => {
      const couple1 = group.ranking.find((c: any) => c.couple_id === game.couple_1);
      const couple2 = group.ranking.find((c: any) => c.couple_id === game.couple_2);

      groupRound.push({
        jugador1: couple1 ? couple1.players : [{ name: 'Por asignar', photo: '', id: 0 }],
        jugador2: couple2 ? couple2.players : [{ name: 'Por asignar', photo: '', id: 0 }],
        ganador: null,
        groupName: group.group_name,
        id: game.game_id
      });
    });
  });

  if (groupRound.length) rounds.push(groupRound);

  // Rondas de eliminación
  const eliminationOrder = ['octavos', 'cuartos', 'semifinal', 'final'];
  eliminationOrder.forEach(round => {
    if (category.elimination[round]) {
      const elimRound: Partido[] = category.elimination[round].map((game: any) => ({
        jugador1: game.couple_1?.players || [{ name: 'Por asignar', photo: '', id: 0 }],
        jugador2: game.couple_2?.players || [{ name: 'Por asignar', photo: '', id: 0 }],
        ganador: null,
        groupName: '',
        id: game.game_id

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
  const g = this.gContainer.append('g').attr('transform', `translate(${x}, ${y})`);

  // Pareja 1
  g.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', this.matchWidth)
    .attr('height', matchHeight / 2 - 2)
    .attr('fill', '#90caf9')
    .attr('stroke', '#1e7e34')
    .attr('stroke-width', 2)
    .attr('rx', 5)
    .attr('ry', 5);

  // Pareja 2
  g.append('rect')
    .attr('x', 0)
    .attr('y', matchHeight / 2 + 2)
    .attr('width', this.matchWidth)
    .attr('height', matchHeight / 2 - 2)
    .attr('fill', '#f48fb1')
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

  const maxTextWidth = this.matchWidth - 20; // margen de 10px a cada lado

  // Nombres pareja 1
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

  // Nombres pareja 2
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

  partido.height = matchHeight;

  g.style('cursor', 'pointer')
    .on('click', () => this.abrirModalPartido(partido, roundIndex, matchIndex));
}

// ------------------- Método wrapText -------------------
private wrapText(text: d3.Selection<SVGTextElement, unknown, null, undefined>, width: number, maxHeight: number) {
  text.each(function(this: SVGTextElement) {
    const textEl = d3.select(this);
    const words = textEl.text().split(' / ');
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 14; // tamaño de fuente
    const tspan = textEl.text(null).append('tspan').attr('x', 10).attr('y', textEl.attr('y')).attr('dy', 0);

    for (const word of words) {
      line.push(word);
      tspan.text(line.join(' / '));
      if ((tspan.node() as any).getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' / '));
        line = [word];
        lineNumber++;
        // Si excede el máximo de altura, agregar '...'
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
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextPartido = nextRound[nextMatchIndex];
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
}