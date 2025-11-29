import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GameDetailResponse, TournamentService } from '../../../app/services/torneos.service';
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
import { MatchesGrupoDialogComponent } from '../matches-grupo-dialog/matches-grupo-dialog.component';
import { AlertService } from '../../../app/services/alert.service';

export interface Partido {
  id?: number | null;
  jugador1?: any[];
  jugador2?: any[];
  winner_id?: any | null;
  x?: number;
  y?: number;
  game_label?: string | null;
  height?: number;
  groupName: string;
  couple1Id?: number | null;
  couple2Id?: number | null;
  nextMatchIndex?: number | null;
  scores1?: number[];
  scores2?: number[];
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  court?: string | null;
  status_game?: string | null;
  _originalGame?: any;
  _fromGameRefs?: string[]; 
}

export interface RankingItem {
  position: number;
  couple_id: number;
  global_rank: number;
  players: any[];
  stats: any;
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

  @ViewChild('bracketContainerSets', { static: false }) bracketContainerSets!: ElementRef;

  bracket: any[] = [];
  filteredBracket: any[] = [];
  selectedCategory: any = null;
  categories: any[] = [];
  groupStandings: any[] = [];

  loading = false;
  showCourts: boolean = true;

  error: string | null = null;

  private matchWidth = 220;
  private matchHeight = 70;
  private spacingX = 160;
  private verticalSpacing = 40;

  showResultsSidebar = true;
  bracketDataCards: Partido[][] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number },
    private dialogRef: MatDialogRef<InicioTorneoDialogComponent>,
    private tournamentService: TournamentService,
    private dialog: MatDialog,
    private cdRef: ChangeDetectorRef,
    private alertService: AlertService,
  ) { }

  ngOnInit(): void {
    this.cargarBracket();
  }

  ngAfterViewInit(): void {
    if (this.filteredBracket.length) {
      setTimeout(() => {
        this.drawBracketSets();
      }, 200);
    }
  }

  cargarBracket() {
    this.loading = true;
    this.tournamentService.getBracketsByTournament(this.data.torneoId).subscribe({
      next: (res) => {
        this.bracket = res.data?.data?.bracket || [];
        this.categories = this.bracket;
        this.selectedCategory = this.categories[0]?.category_name || null;
        this.calcularProgresoGrupos();

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
    if (!this.selectedCategory) return;

    this.filteredBracket = this.bracket.filter(b => b.category_name === this.selectedCategory);

    if (this.filteredBracket.length > 0) {
      const category = this.filteredBracket[0];
      this.processGroupsForTable(category.groups);

      this.bracketDataCards = this.mapToPartidos(category);

      setTimeout(() => {
        this.drawBracketSets();
      }, 100);
    } else {
      this.groupStandings = [];
    }
  }

  private processGroupsForTable(groups: any[]) {
    this.groupStandings = groups?.map(group => ({
      groupName: group.group_name,
      games: group.games || [],

      standings: (group.ranking || []).map((team: any) => {
        const stats = team.stats || {
          games_played: 0,
          wins: 0,
          losses: 0,
          set_diff: 0,
          game_diff: 0,
          points: 0
        };

        return {
          position: team.position,
          teamName: this.getPlayerNames(team.players),
          gamesPlayed: stats.games_played,
          gamesWon: stats.wins,
          gamesLost: stats.losses,
          points: stats.points,
          setDiff: stats.set_diff,
          gameDiff: stats.game_diff,
          coupleId: team.couple_id,
          global_rank: team.global_rank || 0,

        };
      })
    })) || [];

    this.calcularProgresoGrupos();
  }

  abrirModalPartido(partido: Partido, roundIndex: number, matchIndex: number) {
    const tieneParejasCompletas = this.validarParejasCompletas(partido);

    if (!tieneParejasCompletas) {
      return;
    }

    const puedeAbrir = this.validarPuedeAbrirModal(roundIndex);

    if (!puedeAbrir) {
      this.mostrarMensajeRondaAnteriorIncompleta(roundIndex);
      return;
    }

    const dialogRef = this.dialog.open(RegistrarGanadorDialogComponent, {
      width: '700px',
      data: { partido, roundIndex, matchIndex },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      this.limpiarContenedores();
      this.cargarBracket();
      setTimeout(() => {
        this.drawBracketSets();
      }, 200);
    });
  }

  private validarPuedeAbrirModal(roundIndex: number): boolean {
    if (!this.filteredBracket?.[0]) return false;

    const category = this.filteredBracket[0];
    const allRounds = this.mapToPartidos(category);
    const eliminationRounds = allRounds.filter(r => Array.isArray(r) && r.length > 0);

    if (roundIndex === 0) {
      return true;
    }

    const rondaAnterior = eliminationRounds[roundIndex - 1];

    if (!rondaAnterior) return false;

    const rondaAnteriorCompleta = rondaAnterior.every(partido =>
      partido.status_game === 'completed'
    );

    return rondaAnteriorCompleta;
  }

  private async mostrarMensajeRondaAnteriorIncompleta(roundIndex: number) {
    const nombresRondas: { [key: string]: string } = {
      '0': 'primera',
      '1': 'segunda',
      '2': 'tercera',
      '3': 'cuarta',
      '4': 'quinta',
      '5': 'sexta',
      '6': 'séptima'
    };

    const nombreRondaActual = nombresRondas[roundIndex] || `ronda ${roundIndex + 1}`;
    const nombreRondaAnterior = nombresRondas[roundIndex - 1] || `ronda ${roundIndex}`;

    const titulo = 'Ronda No Disponible';
    const mensaje = `No puedes abrir partidos de la ${nombreRondaActual} ronda hasta que todos los partidos de la ${nombreRondaAnterior} ronda estén completos.`;

    console.warn(mensaje);

    await this.alertService.info(titulo, mensaje);
  }

  private validarRondaCompleta(roundIndex: number): boolean {
    if (!this.filteredBracket?.[0]) return false;

    const category = this.filteredBracket[0];
    const allRounds = this.mapToPartidos(category);
    const eliminationRounds = allRounds.filter(r => Array.isArray(r) && r.length > 0);

    if (roundIndex >= eliminationRounds.length) return false;

    const rondaActual = eliminationRounds[roundIndex];

    const todosCompletos = rondaActual.every(partido =>
      partido.status_game === 'completed'
    );

    return todosCompletos;
  }

  private validarParejasCompletas(partido: Partido): boolean {
    const juegoOriginal = partido._originalGame;

    if (juegoOriginal?.couple_1?.pending || juegoOriginal?.couple_2?.pending) {
      return false;
    }

    const jugador1Valido = partido.jugador1 &&
      partido.jugador1.length > 0 &&
      partido.jugador1[0]?.name !== 'Por asignar' &&
      partido.jugador1[0]?.name !== undefined &&
      !partido.jugador1[0]?.name?.includes('Ganador de');

    const jugador2Valido = partido.jugador2 &&
      partido.jugador2.length > 0 &&
      partido.jugador2[0]?.name !== 'Por asignar' &&
      partido.jugador2[0]?.name !== undefined &&
      !partido.jugador2[0]?.name?.includes('Ganador de');

    return Boolean(jugador1Valido && jugador2Valido);
  }

  private actualizarPartidoYRedibujar(resultado: any) {
    const gameId = resultado.gameId || resultado.id;
    if (!gameId) return;

    this.tournamentService.getGameDetail(gameId).subscribe({
      next: (response) => {
        const gameDetail = response.data ?? response;
        this.actualizarPartidoEnTodasLasEstructuras(gameId, gameDetail);
        this.updateGameInFilteredBracket(gameId, gameDetail);

        if (this.filteredBracket?.[0]) {
          this.bracketDataCards = this.mapToPartidos(this.filteredBracket[0]);
        }

        this.limpiarContenedores();
        this.cdRef.detectChanges();
        requestAnimationFrame(() => this.drawBracketSets());
      },
      error: (error) => {
        console.error('Error al cargar detalles del juego:', error);
        this.cdRef.detectChanges();
        requestAnimationFrame(() => this.drawBracketSets());
      }
    });
  }

  private actualizarPartidoEnTodasLasEstructuras(gameId: number, gameDetail: any) {
    const actualizarPartido = (partido: any) => {
      if (partido.id === gameId) {
        if (gameDetail.sets?.length) {
          const sortedSets = gameDetail.sets.sort((a: any, b: any) => a.set_number - b.set_number);
          partido.scores1 = sortedSets.map((set: any) => set.score_1);
          partido.scores2 = sortedSets.map((set: any) => set.score_2);
        }
        partido.winner_id = gameDetail.winner?.id || null;
        partido.status_game = gameDetail.status_game || 'Not started';
      }
    };

    this.bracketDataCards.forEach(round => round.forEach(actualizarPartido));
  }

  private updateGameInFilteredBracket(gameId: number, gameDetail: any) {
    if (!this.filteredBracket?.[0]) return;

    const applyUpdate = (g: any) => {
      const sets = gameDetail.sets?.sort((a: any, b: any) => a.set_number - b.set_number);
      return {
        ...g,
        winner_id: gameDetail.winner?.id ?? g.winner_id,
        scores1: sets ? sets.map((s: any) => s.score_1) : (gameDetail.scores1 ?? g.scores1),
        scores2: sets ? sets.map((s: any) => s.score_2) : (gameDetail.scores2 ?? g.scores2),
        status_game: gameDetail.status_game ?? g.status_game,
      };
    };

    const category = this.filteredBracket[0];

    category.groups?.forEach((grp: any) => {
      grp.games?.forEach((g: any, i: number) => {
        if ((g.game_id ?? g.id) === gameId) {
          grp.games[i] = applyUpdate(g);
        }
      });
    });

    if (category.elimination) {
      Object.keys(category.elimination).forEach(phaseKey => {
        const arr = category.elimination[phaseKey];
        arr?.forEach((g: any, i: number) => {
          if ((g.game_id ?? g.id) === gameId) {
            arr[i] = applyUpdate(g);
          }
        });
      });
    }
  }

  private limpiarContenedores() {
    if (this.bracketContainerSets?.nativeElement) {
      const container = this.bracketContainerSets.nativeElement as HTMLElement;
      d3.select(container).selectAll('*').remove();
    }
  }

  loadGameDetails(gameId: number) {
    this.tournamentService.getGameDetail(gameId).subscribe({
      next: (response) => {
        this.updateMatchScores(gameId, response.data);
      },
      error: (error) => {
        console.error('Error al cargar detalles del juego:', error);
      }
    });
  }

  private updateMatchScores(gameId: number, gameDetail: GameDetailResponse) {
    const actualizarScores = (match: any) => {
      if (match.id === gameId) {
        if (gameDetail.sets?.length) {
          const sortedSets = gameDetail.sets.sort((a, b) => a.set_number - b.set_number);
          match.scores1 = sortedSets.map(set => set.score_1);
          match.scores2 = sortedSets.map(set => set.score_2);
        }
        match.winner_id = gameDetail.winner?.couple_id || null;
        match.status_game = gameDetail.status_game || 'Not started';
      }
    };

    this.bracketDataCards.forEach(round => round.forEach(actualizarScores));
    setTimeout(() => this.drawBracketSets(), 0);
  }

  private showEmptyState(container: HTMLElement) {
    container.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 200px; color: #6b7280; flex-direction: column;">
      <mat-icon style="font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px;">sports_tennis</mat-icon>
      <p>No hay partidos de eliminatorias programados aún</p>
      <small>Las llaves se generarán automáticamente cuando finalice la fase de grupos</small>
    </div>
  `;
  }

  private drawBracketSets() {
    if (!this.bracketContainerSets?.nativeElement || !this.filteredBracket?.[0]) return;

    const container = this.bracketContainerSets.nativeElement as HTMLElement;
    d3.select(container).selectAll('*').remove();

    try {
      const category = this.filteredBracket[0];
      const eliminationRounds = this.bracketDataCards.filter(r => Array.isArray(r) && r.length > 0);

      if (eliminationRounds.length === 0) {
        this.showEmptyState(container);
        return;
      }

      const totalWidth = eliminationRounds.length * (this.matchWidth + this.spacingX) + 300;
      const maxMatches = Math.max(...eliminationRounds.map(r => r.length));
      const totalHeight = Math.max(600, maxMatches * (this.matchHeight + this.verticalSpacing) + 200);

      const svg = d3.select(container).append('svg')
        .attr('width', totalWidth + 150)
        .attr('height', totalHeight + 150)
        .attr('class', 'bracket-svg')
        .style('background', '#f9f8fcff')
        .style('border-radius', '8px');

      const gContainer = svg.append('g')
        .attr('class', 'bracket-container')
        .attr('transform', 'translate(50, 50)');

      this.calculatePositionsForElimination(eliminationRounds, totalWidth, totalHeight);
      this.drawRoundBackgrounds(eliminationRounds, gContainer);

      // === Dibujar rondas ===
      eliminationRounds.forEach((ronda, roundIndex) => {
        this.drawRoundTitle(ronda, roundIndex, gContainer);
        ronda.forEach((partido, matchIndex) => {
          this.drawModernEliminationMatch(gContainer, partido, roundIndex, matchIndex);
        });
        if (roundIndex < eliminationRounds.length - 1) {
          this.drawModernConnections(eliminationRounds, roundIndex, gContainer);
        }
      });

      // === Dibujar cuadro del ganador final solo si existe ===
      if (category.winner && category.winner.name && category.winner.name.trim() !== '') {
        const ganador = category.winner.name.trim();
        const icono = category.winner.icon || '🏆';

        const finalRound = eliminationRounds[eliminationRounds.length - 1];
        const finalMatch = finalRound?.[0];

        // Si no hay coordenadas del partido final, lo centramos arriba
        const xPos = finalMatch?.x ? finalMatch.x + this.matchWidth + 100 : totalWidth / 2 - 100;
        const yPos = finalMatch?.y ? finalMatch.y + this.matchHeight / 2 : 80;

        const rectWidth = 250;
        const rectHeight = 90;

        gContainer.append('rect')
          .attr('x', xPos - 40)
          .attr('y', yPos - 45)
          .attr('width', rectWidth)
          .attr('height', rectHeight)
          .attr('rx', 16)
          .attr('fill', '#fffbea')
          .attr('stroke', '#facc15')
          .attr('stroke-width', 3)
          .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

        gContainer.append('text')
          .text(icono)
          .attr('x', xPos + rectWidth / 2 - 40)
          .attr('y', yPos - 10)
          .attr('font-size', '32px')
          .attr('text-anchor', 'middle');

        const textElement = gContainer.append('text')
          .text(ganador)
          .attr('x', xPos + rectWidth / 2 - 40)
          .attr('y', yPos + 25)
          .attr('fill', '#1e293b')
          .attr('font-weight', '700')
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px');

        const maxTextWidth = rectWidth - 20;
        let fontSize = 16;
        const textNode = textElement.node() as SVGTextElement;

        while (textNode.getComputedTextLength() > maxTextWidth && fontSize > 8) {
          fontSize -= 1;
          textElement.attr('font-size', `${fontSize}px`);
        }
      }

    } catch (error) {
      console.error('💥 Error al dibujar bracket:', error);
      this.showErrorState(container);
    }
  }

  // ========== NUEVAS FUNCIONES MEJORADAS CON from_game ==========

  private mapToPartidos(category: any): Partido[][] {
    const rounds: Partido[][] = [];
    const eliminationPhases = Object.keys(category.elimination || {});

    if (eliminationPhases.length === 0) {
      return rounds;
    }

    const phaseOrder: { [key: string]: number } = {
      'sesentaicuatroavos': 1,
      'sesentaicuatroavoss': 1,
      'sesentaicuatro': 1,
      'treintaidosavos': 2,
      'treintaidos': 2,
      'treintaidosavoss': 2,
      'dieciseisavos': 3,
      'dieciseis': 3,
      'octavos': 4,
      'cuartos': 5,
      'semifinal': 6,
      'semifinals': 6,
      'final': 7,
      'finals': 7
    };

    const sortedPhases = eliminationPhases.sort((a, b) => {
      const orderA = phaseOrder[a.toLowerCase()] || 99;
      const orderB = phaseOrder[b.toLowerCase()] || 99;
      return orderA - orderB;
    });

    sortedPhases.forEach((phase, phaseIndex) => {
      const phaseGames = category.elimination[phase] || [];
      const isFirstRound = phaseIndex === 0;

      const phaseMatches = phaseGames.map((game: any, index: number) => {
        const hasCouple1 = game.couple_1 && Object.keys(game.couple_1).length > 0;
        const hasCouple2 = game.couple_2 && Object.keys(game.couple_2).length > 0;

        const isPlaceholderCouple = (c: any) => {
          if (!c) return true;
          if (Array.isArray(c) && c.length === 0) return true;
          if (typeof c === 'object' && 'pending' in c) return true;
          return false;
        };

        const jugador1 = isPlaceholderCouple(game.couple_1) && isFirstRound
          ? [{ name: 'Por asignar' }]
          : this.getPlayersFromEliminationCouple(game.couple_1, isFirstRound);

        const jugador2 = isPlaceholderCouple(game.couple_2) && isFirstRound
          ? [{ name: 'Por asignar' }]
          : this.getPlayersFromEliminationCouple(game.couple_2, isFirstRound);

        const fromGameRefs = this.extractFromGameReferences(game);

        const partido: Partido = {
          jugador1,
          jugador2,
          winner_id: game.winner_id || null,
          groupName: phase,
          id: game.game_id || game.id || null,
          couple1Id: game.couple_1?.id || null,
          couple2Id: game.couple_2?.id || null,
          game_label: isFirstRound && !hasCouple1 && !hasCouple2 ? null : game.game_label,
          nextMatchIndex: null, 
          scores1: game.scores1 || [0, 0, 0],
          scores2: game.scores2 || [0, 0, 0],
          date: game.date,
          start_time: game.start_time,
          end_time: game.end_time,
          court: game.court,
          status_game: game.status_game || 'Not started',
          _originalGame: game,
          _fromGameRefs: fromGameRefs 
        };

        return partido;
      });

      if (phaseMatches.length > 0) {
        rounds.push(phaseMatches);
      }
    });

    return rounds;
  }

  private extractFromGameReferences(game: any): string[] {
    const refs: string[] = [];
    
    if (game.couple_1?.from_game) {
      refs.push(game.couple_1.from_game);
    }
    
    if (game.couple_2?.from_game) {
      refs.push(game.couple_2.from_game);
    }
    
    return refs.filter(ref => ref && ref !== 'null' && ref !== 'Por asignar');
  }

  private drawModernConnections(eliminationRounds: Partido[][], roundIndex: number, gContainer: any) {
    const currentRound = eliminationRounds[roundIndex];
    const nextRound = eliminationRounds[roundIndex + 1];

    if (!nextRound) return;


    nextRound.forEach(destino => {
      if (!destino._fromGameRefs || destino._fromGameRefs.length === 0) return;

      destino._fromGameRefs.forEach(fromGameLabel => {
        const source = this.findMatchByLabel(currentRound, fromGameLabel);
        if (!source || !source.x || !source.y || !destino.x || !destino.y) {
          return;
        }

        this.drawConnectionLine(gContainer, source, destino);
      });
    });
  }

  private findMatchByLabel(round: Partido[], label: string): Partido | null {
    if (!label) return null;

    return round.find(p => {
      return (p.game_label || '').trim() === label.trim();
    }) || null;
  }

  private drawConnectionLine(gContainer: any, source: Partido, destino: Partido) {
    const sX = source.x! + this.matchWidth;
    const sY = source.y! + source.height! / 2;
    const dX = destino.x!;
    const dY = destino.y! + destino.height! / 2;

    const midX = sX + this.spacingX / 3;

    gContainer.append('line')
      .attr('x1', sX).attr('y1', sY)
      .attr('x2', midX).attr('y2', sY)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5');

    gContainer.append('line')
      .attr('x1', midX).attr('y1', sY)
      .attr('x2', midX).attr('y2', dY)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5');

    gContainer.append('line')
      .attr('x1', midX).attr('y1', dY)
      .attr('x2', dX).attr('y2', dY)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5');
  }


  private extractCoupleId(couple: any): number | null {
    if (!couple) return null;
    if (couple.id) return couple.id;
    if (Array.isArray(couple) && couple[0]?.couple_id) return couple[0].couple_id;
    return null;
  }

  private getPlayersFromEliminationCouple(couple: any, isFirstRound: boolean = false): any[] {
    if (!couple) return [{ name: 'Por asignar' }];

    if (couple.players && Array.isArray(couple.players)) {
      return couple.players.map((p: any) => ({
        name: p?.name ?? 'Jugador sin nombre',
        level: p?.level,
        tournament_victories: p?.tournament_victories
      }));
    }

    if (Array.isArray(couple) && couple.length > 0) {
      return couple.map((p: any) => ({
        name: p?.name ?? 'Jugador sin nombre',
        level: p?.level,
        tournament_victories: p?.tournament_victories
      }));
    }

    if (typeof couple === 'object' && 'pending' in couple) {
      const text = String(couple.pending || '').trim();
      const esGanador = /^Ganador de\s*J\d+$/i.test(text);

      if (isFirstRound) {
        return [{ name: 'Por asignar' }];
      }

      return [{ name: text }];
    }

    return [{ name: 'Por asignar' }];
  }

  private calculateNextMatchIndex(phase: string, index: number): number | null {
    if (phase === 'final') return null;
    return Math.floor(index / 2);
  }

  private calculatePositionsForElimination(eliminationRounds: Partido[][], containerWidth: number, containerHeight: number) {
    if (!eliminationRounds?.length) return;
    const roundWidth = (containerWidth - 100) / eliminationRounds.length;
    eliminationRounds.forEach((ronda, roundIndex) => {
      const x = roundIndex * roundWidth + 50;
      const totalHeight = ronda.length * this.matchHeight + (ronda.length - 1) * this.verticalSpacing;
      const startY = (containerHeight - totalHeight) / 2;

      ronda.forEach((partido, i) => {
        partido.x = x;
        partido.y = startY + i * (this.matchHeight + this.verticalSpacing);
        partido.height = this.matchHeight;
      });
    });
  }

  private drawRoundBackgrounds(eliminationRounds: Partido[][], gContainer: any) {
    eliminationRounds.forEach(ronda => {
      if (ronda.length === 0) return;
      const firstMatch = ronda[0];
      const lastMatch = ronda[ronda.length - 1];
      gContainer.append('rect')
        .attr('x', firstMatch.x! - 40)
        .attr('y', firstMatch.y! - 60)
        .attr('width', this.matchWidth + 80)
        .attr('height', (lastMatch.y! - firstMatch.y!) + this.matchHeight + 80)
        .attr('rx', 16)
        .attr('fill', '#f1f5f9')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 2)
        .attr('opacity', 0.1);
    });
  }

  private drawRoundTitle(ronda: Partido[], roundIndex: number, gContainer: any) {
    if (ronda.length === 0) return;
    const firstMatch = ronda[0];
    const roundNames: { [key: string]: string } = {
      'sesentaicuatroavos': '64AVOS DE FINAL',
      'treintaidosavos': '32AVOS DE FINAL',
      'dieciseisavos': '16AVOS DE FINAL',
      'octavos': 'OCTAVOS DE FINAL',
      'cuartos': 'CUARTOS DE FINAL',
      'semifinal': 'SEMIFINAL',
      'final': 'FINAL'
    };

    const rawName = String(ronda[0].groupName || '').toLowerCase();
    const roundName = roundNames[rawName] || ronda[0].groupName?.toUpperCase() || 'RONDA';

    gContainer.append('text')
      .text(roundName)
      .attr('x', firstMatch.x! + this.matchWidth / 2)
      .attr('y', firstMatch.y! - 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#334155')
      .attr('font-weight', '800')
      .attr('font-size', '16px')
      .attr('letter-spacing', '1px');
  }

  private drawModernEliminationMatch(gContainer: any, partido: Partido, roundIndex: number, matchIndex: number) {
    const g = gContainer.append('g').attr('transform', `translate(${partido.x}, ${partido.y})`);
    const jugador1Safe = this.getSafePlayers(partido.jugador1);
    const jugador2Safe = this.getSafePlayers(partido.jugador2);

    const { isPlayer1Winner, isPlayer2Winner } = this.determineWinnersFromOriginalData(partido);

    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2)
      .attr('rx', 12)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(244, 241, 241, 0.17))');

    this.drawPlayerSection(g, 0, this.matchHeight / 2 - 1, isPlayer1Winner);
    this.drawPlayerSection(g, this.matchHeight / 2 + 1, this.matchHeight / 2 - 1, isPlayer2Winner);

    this.drawPlayerNames(g, jugador1Safe, isPlayer1Winner, this.matchHeight / 4);
    this.drawPlayerNames(g, jugador2Safe, isPlayer2Winner, 3 * this.matchHeight / 4);
    this.drawMatchFooter(g, partido.date ?? '', partido.start_time ?? '',partido.court ?? '');

    if (partido.status_game === 'completed' && partido.winner_id) {
      this.drawWinnerIndicator(g, isPlayer1Winner || isPlayer2Winner);
    }

    if (partido.game_label) {
      this.drawGameLabel(g, partido.game_label);
    }

    const tieneParejasCompletas = this.validarParejasCompletas(partido);

    if (tieneParejasCompletas) {
      g.style('cursor', 'pointer')
        .on('click', () => this.abrirModalPartido(partido, roundIndex, matchIndex));
    } else {
      g.style('cursor', 'not-allowed')
        .append('title')
        .text('No se puede abrir el partido: parejas incompletas');

      g.selectAll('rect')
        .attr('fill', '#f9fafb')
        .attr('stroke', '#d1d5db');
    }
  }

 private drawMatchFooter(g: any, date: string, startTime: string, court:string ) {
  if (!date || !startTime) return;

  const footerHeight = 22;

  g.append("rect")
    .attr("x", 0)
    .attr("y", this.matchHeight) 
    .attr("width", this.matchWidth)
    .attr("height", footerHeight)
    .attr("fill", "#ffffff")     
    .attr("stroke", "#d1d5db")    
    .attr("rx", 0);

  const fechaLegible = this.formatearFecha(date);
  const horaLegible = startTime.substring(0, 5);
  const courtText = this.showCourts ? court : "";   

  g.append("text")
    .attr("x", this.matchWidth / 2)
    .attr("y", this.matchHeight + footerHeight / 2 + 4) 
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", "#000000cc") 
    .text(`${fechaLegible} • ${horaLegible} ${courtText ? '• ' + courtText : ''}`);
}

toggleCourts() {
  this.showCourts = !this.showCourts;

  this.limpiarContenedores();
  this.drawBracketSets();
}

private formatearFecha(fecha: string): string {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const f = new Date(fecha);
  return `${f.getDate()} ${meses[f.getMonth()]}`;
}

  private drawGameLabel(g: any, gameLabel: string) {
    const labelGroup = g.append('g')
      .attr('transform', `translate(${this.matchWidth - 45}, 4)`)
      .attr('class', 'game-label');

    labelGroup.append('rect')
      .attr('width', 40)
      .attr('height', 14)
      .attr('rx', 6)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#1d4ed8')
      .attr('stroke-width', 1);

    labelGroup.append('text')
      .text(gameLabel)
      .attr('x', 20)
      .attr('y', 11)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#ffffff')
      .attr('font-weight', '700')
      .attr('pointer-events', 'none');
  }

  private determineWinnersFromOriginalData(partido: Partido): { isPlayer1Winner: boolean, isPlayer2Winner: boolean } {
    if (!partido.winner_id || partido.status_game !== 'completed') {
      return { isPlayer1Winner: false, isPlayer2Winner: false };
    }

    const category = this.filteredBracket[0];
    const coupleIdToNamesMap = this.buildCoupleIdToNamesMap(category);

    const originalGame = partido.id != null ? this.findOriginalGame(partido.id) : null;
    if (!originalGame) {
      return { isPlayer1Winner: false, isPlayer2Winner: false };
    }

    const player1Names = this.getPlayerNamesFromPlayers(partido.jugador1).toLowerCase();
    const player2Names = this.getPlayerNamesFromPlayers(partido.jugador2).toLowerCase();

    let player1CoupleId: number | null = null;
    let player2CoupleId: number | null = null;

    for (const [coupleId, names] of coupleIdToNamesMap.entries()) {
      const normalizedNames = names.toLowerCase();
      if (this.namesMatch(normalizedNames, player1Names)) {
        player1CoupleId = coupleId;
      }
      if (this.namesMatch(normalizedNames, player2Names)) {
        player2CoupleId = coupleId;
      }
    }

    if (player1CoupleId !== null || player2CoupleId !== null) {
      const isPlayer1Winner = player1CoupleId === partido.winner_id;
      const isPlayer2Winner = player2CoupleId === partido.winner_id;

      return { isPlayer1Winner, isPlayer2Winner };
    }

    return { isPlayer1Winner: false, isPlayer2Winner: false };
  }

  private getPlayerNamesFromPlayers(players: any[] | undefined): string {
    if (!players || !Array.isArray(players)) return '';

    if (players.length === 1 && players[0]?.name === 'Por asignar') {
      return '';
    }

    return players
      .map(p => p?.name || '')
      .filter(name => name && name !== 'Por asignar')
      .sort()
      .join(',');
  }

  private namesMatch(names1: string, names2: string): boolean {
    if (!names1 || !names2) return false;

    const normalize = (str: string) => {
      return str
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split(',')
        .map(name => name.trim())
        .sort()
        .join(',');
    };

    const normalized1 = normalize(names1);
    const normalized2 = normalize(names2);

    return normalized1 === normalized2;
  }

  private getSafePlayers(players: any[] | undefined): any[] {
    return (players?.length && players[0]?.name && players[0].name !== 'Por asignar') ?
      players : [{ name: 'Por asignar' }];
  }

  private drawPlayerSection(g: any, y: number, height: number, isWinner: boolean) {
    g.append('rect')
      .attr('y', y)
      .attr('width', this.matchWidth)
      .attr('height', height)
      .attr('fill', isWinner ? '#10b981' : '#f8fafc')
      .attr('stroke', isWinner ? '#10b981' : '#e2e8f0')
      .attr('stroke-width', isWinner ? 2 : 1)
      .attr('rx', 10)
      .attr('ry', 10);
  }

  private drawPlayerNames(g: any, players: any[], isWinner: boolean, baseY: number) {
    const names = players.map(p => p.name || 'Sin nombre').join(' / ');
    const displayName = names.length <= 20 ? names : this.getCompactName(names);

    g.append('text')
      .text(displayName)
      .attr('x', 8)
      .attr('y', baseY)
      .attr('fill', isWinner ? '#ffffff' : '#334155')
      .attr('font-size', '10px')
      .attr('font-weight', isWinner ? '700' : '600')
      .style('text-anchor', 'start')
      .style('dominant-baseline', 'central')
      .append('title').text(names);
  }

  private getCompactName(fullName: string): string {
    if (fullName.length <= 18) return fullName;

    if (fullName.includes(' / ')) {
      const pairs = fullName.split(' / ');
      return pairs.map(name => {
        if (name.length <= 12) return name;
        const parts = name.split(' ');
        return parts.length >= 2 ? `${parts[0].charAt(0)}. ${parts[parts.length - 1]}` : name;
      }).join(' / ');
    }

    const parts = fullName.split(' ');
    if (parts.length >= 3) return `${parts[0].charAt(0)}. ${parts[1].charAt(0)}. ${parts[parts.length - 1]}`;
    if (parts.length === 2) return `${parts[0].charAt(0)}. ${parts[1]}`;

    return fullName.substring(0, 20) + (fullName.length > 20 ? '...' : '');
  }

  private showErrorState(container: HTMLElement) {
    container.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 200px; color: #dc2626;">
        <div style="text-align: center;">
          <mat-icon style="font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px;">error</mat-icon>
          <p>Error al cargar el bracket de eliminatorias</p>
        </div>
      </div>
    `;
  }

  getPlayerNames(players?: any): string {
    if (!players) return 'Por asignar';

    if (typeof players === 'object' && !Array.isArray(players) && 'pending' in players) {
      return players.pending;
    }

    if (Array.isArray(players) && players.length > 0) {
      const nombresConLevel = players.map(p => {
        const level = p.level ?? 'N/A';
        return `${p.name} (L:${level})`;
      });

      return nombresConLevel.join(' / ');
    }

    if (typeof players === 'string') return players;

    return 'Por asignar';
  }

  toggleResultsSidebar() {
    this.showResultsSidebar = !this.showResultsSidebar;
  }

  cerrar() {
    this.dialogRef.close();
  }

  abrirPartidosGrupo(groupStanding: any) {
    const category = this.filteredBracket[0];
    const groupComplete = category.groups?.find((g: any) => g.group_name === groupStanding.groupName);

    if (!groupComplete) {
      console.error('No se encontró el grupo completo');
      return;
    }

    const realGames = this.mapRealGamesForGroup(groupComplete);


    const dialogRef = this.dialog.open(MatchesGrupoDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: false,
      data: { games: realGames }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.cargarBracket();
    });
  }

  private mapRealGamesForGroup(group: any): any[] {
    const realGames = group.games || [];

    return realGames.map((game: any) => {
      return {
        game_id: game.game_id,
        phase: "group",
        status_game: game.status_game || "Not started",
        winner_id: game.winner_id || null,
        couple_1: {
          id: game.couple_1?.id,
          players: game.couple_1?.players || [{ name: 'Por asignar' }]
        },
        couple_2: {
          id: game.couple_2?.id,
          players: game.couple_2?.players || [{ name: 'Por asignar' }]
        },
        court: game.court || "Por definir",
        date: game.date || "2024-01-15",
        start_time: game.start_time || "10:00:00",
        end_time: game.end_time || "11:00:00",
        sets: game.sets || [
          { set_number: 1, score_1: 0, score_2: 0 },
          { set_number: 2, score_1: 0, score_2: 0 },
          { set_number: 3, score_1: 0, score_2: 0 }
        ],
        label: game.label,
        group_name: group.group_name
      };
    });
  }

  private drawWinnerIndicator(g: any, isWinner: boolean) {
    if (!isWinner) return;

    g.append('circle')
      .attr('cx', this.matchWidth - 15)
      .attr('cy', this.matchHeight / 2)
      .attr('r', 8)
      .attr('fill', '#10b981')
      .attr('stroke', '#059669')
      .attr('stroke-width', 2);

    g.append('text')
      .text('✓')
      .attr('x', this.matchWidth - 15)
      .attr('y', this.matchHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold');
  }

  private buildCoupleIdToNamesMap(category: any): Map<number, string> {
    const map = new Map<number, string>();

    if (category.groups && Array.isArray(category.groups)) {
      category.groups.forEach((group: any) => {
        if (group.ranking && Array.isArray(group.ranking)) {
          group.ranking.forEach((team: any) => {
            if (team.couple_id && team.players) {
              const names = team.players.map((p: any) => p.name).sort().join(',');
              map.set(team.couple_id, names);
            }
          });
        }
      });
    }

    return map;
  }

  private findOriginalGame(gameId: number): any {
    const category = this.filteredBracket[0];
    if (!category || !category.elimination) return null;

    const eliminationPhases = Object.keys(category.elimination || {});

    for (const phase of eliminationPhases) {
      const phaseGames = category.elimination[phase] || [];
      const game = phaseGames.find((g: any) => (g.game_id || g.id) === gameId);
      if (game) return game;
    }

    return null;
  }

  calcularProgresoGrupos() {
    if (!this.groupStandings || this.groupStandings.length === 0) return;

    this.groupStandings.forEach(group => {
      if (group.games && Array.isArray(group.games)) {
        const total = group.games.length;
        const completed = group.games.filter((g: any) => g.status_game === 'completed').length;
        group.totalGames = total;
        group.completedGames = completed;
      } else {
        group.totalGames = 0;
        group.completedGames = 0;
      }
    });
  }

  getProgressPercent(group: any): number {
    if (!group.totalGames || group.totalGames === 0) return 0;
    return Math.round((group.completedGames / group.totalGames) * 100);
  }
}