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
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  court?: string | null;
  status_game?: string | null;
}

export interface RankingItem {
  position: number;
  couple_id: number;
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
    private cdRef: ChangeDetectorRef
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
      standings: (group.ranking || []).map((team: any) => {
        const stats = team.stats || { games_played: 0, wins: 0, losses: 0, set_diff: 0, game_diff: 0, points: 0 };
        return {
          position: team.position,
          teamName: this.getPlayerNames(team.players),
          gamesPlayed: stats.games_played,
          gamesWon: stats.wins,
          gamesLost: stats.losses,
          points: stats.points,
          setDiff: stats.set_diff,
          gameDiff: stats.game_diff,
          coupleId: team.couple_id
        };
      })
    })) || [];
  }

  abrirModalPartido(partido: Partido, roundIndex: number, matchIndex: number) {
    const dialogRef = this.dialog.open(RegistrarGanadorDialogComponent, {
      width: '700px',
      data: { partido, roundIndex, matchIndex }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.actualizarPartidoYRedibujar(result);
        this.drawBracketSets();
      } else if (partido.id) {
        this.loadGameDetails(partido.id);
      }
    });
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
        partido.ganador = gameDetail.winner?.players || null;
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
        winner_id: gameDetail.winner?.players?.[0]?.id ?? g.winner_id,
        scores1: sets ? sets.map((s: any) => s.score_1) : (gameDetail.scores1 ?? g.scores1),
        scores2: sets ? sets.map((s: any) => s.score_2) : (gameDetail.scores2 ?? g.scores2),
        status_game: gameDetail.status_game ?? g.status_game,
      };
    };

    const category = this.filteredBracket[0];

    // Buscar y actualizar en groups
    category.groups?.forEach((grp: any) => {
      grp.games?.forEach((g: any, i: number) => {
        if ((g.game_id ?? g.id) === gameId) {
          grp.games[i] = applyUpdate(g);
        }
      });
    });

    // Buscar y actualizar en elimination
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
        match.ganador = gameDetail.winner?.players || null;
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

  // BRACKET DRAWING METHODS
  private drawBracketSets() {
    if (!this.bracketContainerSets?.nativeElement || !this.filteredBracket?.[0]) return;

    const container = this.bracketContainerSets.nativeElement as HTMLElement;
    d3.select(container).selectAll('*').remove();

    try {
      const category = this.filteredBracket[0];
      const allRounds = this.mapToPartidos(category);

  

     
      const eliminationRounds = allRounds
        .filter(r => Array.isArray(r) && r.length > 0);
   

      if (eliminationRounds.length === 0) {
        this.showEmptyState(container);
        return;
      }

      const totalWidth = eliminationRounds.length * (this.matchWidth + this.spacingX) + 120;
      const maxMatches = Math.max(...eliminationRounds.map(r => r.length));
      const totalHeight = Math.max(600, maxMatches * (this.matchHeight + this.verticalSpacing) + 200);

      const svg = d3.select(container).append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight)
        .attr('class', 'bracket-svg')
        .style('background', '#f8fafc')
        .style('border-radius', '8px');

      const gContainer = svg.append('g').attr('class', 'bracket-container');

      this.calculatePositionsForElimination(eliminationRounds, totalWidth, totalHeight);
      this.drawRoundBackgrounds(eliminationRounds, gContainer);

      eliminationRounds.forEach((ronda, roundIndex) => {
        console.log(`🎯 Dibujando ronda ${roundIndex}:`, ronda[0]?.groupName, 'con', ronda.length, 'partidos');
        this.drawRoundTitle(ronda, roundIndex, gContainer);
        ronda.forEach((partido, matchIndex) => {
          this.drawModernEliminationMatch(gContainer, partido, roundIndex, matchIndex);
        });
        if (roundIndex < eliminationRounds.length - 1) {
          this.drawModernConnections(eliminationRounds, roundIndex, gContainer);
        }
      });

    } catch (error) {
      console.error('💥 Error al dibujar bracket:', error);
      this.showErrorState(container);
    }
  }

  private mapToPartidos(category: any): Partido[][] {
 

  const rounds: Partido[][] = [];
  const eliminationPhases = Object.keys(category.elimination || {});

  if (eliminationPhases.length === 0) {
    return rounds;
  }

  const phaseOrder: { [key: string]: number } = {
    'octavos': 1, 'cuartos': 2, 'semifinal': 3, 'semifinals': 3, 'final': 4, 'finals': 4
  };

  const sortedPhases = eliminationPhases.sort((a, b) => {
    const orderA = phaseOrder[a.toLowerCase()] || 99;
    const orderB = phaseOrder[b.toLowerCase()] || 99;
    return orderA - orderB;
  });


  sortedPhases.forEach(phase => {
    const phaseGames = category.elimination[phase] || [];

    const phaseMatches = phaseGames.map((game: any, index: number) => {
      const nextMatchIndex = this.calculateNextMatchIndex(phase, index);

      const jugador1 = this.getPlayersFromEliminationCouple(game.couple_1);
      const jugador2 = this.getPlayersFromEliminationCouple(game.couple_2);

     

      return {
        jugador1,
        jugador2,
        ganador: this.getWinnerFromEliminationGame(game, jugador1, jugador2),
        groupName: phase,
        id: game.game_id || game.id || null,
        couple1Id: null, 
        couple2Id: null, 
        nextMatchIndex,
        scores1: game.scores1 || [0, 0, 0],
        scores2: game.scores2 || [0, 0, 0],
        date: game.date,
        start_time: game.start_time,
        end_time: game.end_time,
        court: game.court,
        status_game: game.status_game || 'Not started'
      };
    });

    if (phaseMatches.length > 0) {
      rounds.push(phaseMatches);
    }
  });

  return rounds;
}

private getPlayersFromEliminationCouple(couple: any[]): any[] {
  if (!couple || !Array.isArray(couple) || couple.length === 0) {
    return [{ name: 'Por asignar' }];
  }

  return couple.map(player => ({
    name: player.name || 'Jugador sin nombre',
    level: player.level,
    tournament_victories: player.tournament_victories
  }));
}

private getWinnerFromEliminationGame(game: any, jugador1: any[], jugador2: any[]): any | null {
  if (!game.winner_id) return null;

  return null; 
}

  private getPlayersFromCouple(couple: any): any[] {
    if (!couple) return [{ name: 'Por asignar' }];
    if (couple.pending) return [{ name: couple.pending }];
    return couple.players || [{ name: 'Por asignar' }];
  }

  private getWinnerFromGame(game: any): any | null {
    if (!game.winner_id) return null;

    if (game.winner_id === game.couple_1?.id) {
      return game.couple_1?.players || null;
    }
    if (game.winner_id === game.couple_2?.id) {
      return game.couple_2?.players || null;
    }
    return null;
  }

  private calculateNextMatchIndex(phase: string, index: number): number | null {
    if (phase === 'final') return null;
    return Math.floor(index / 2);
  }

  private getExpectedMatchesForPhase(phase: string): number {
    if (phase === 'final') return 1;
    if (phase === 'semifinal') return 2;
    if (phase === 'cuartos') return 4;
    if (phase === 'octavos') return 8;

    const num = parseInt(phase);

    if (!isNaN(num)) return num / 2;

    return 0;
  }


  private createEmptyMatch(phase: string, index: number): Partido {
    return {
      jugador1: [{ name: 'Por asignar' }],
      jugador2: [{ name: 'Por asignar' }],
      ganador: null,
      groupName: phase,
      id: null,
      couple1Id: null,
      couple2Id: null,
      nextMatchIndex: this.calculateNextMatchIndex(phase, index),
      scores1: [0, 0, 0],
      scores2: [0, 0, 0],
      date: null,
      start_time: null,
      end_time: null,
      court: null,
      status_game: 'Not started'
    };
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
      'octavos': 'OCTAVOS DE FINAL',
      'cuartos': 'CUARTOS DE FINAL',
      'semifinal': 'SEMIFINAL',
      'final': 'FINAL'
    };

    const roundName = roundNames[ronda[0].groupName] || ronda[0].groupName.toUpperCase();

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
    const ganador = partido.ganador || null;

    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2)
      .attr('rx', 12)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    const isPlayer1Winner = ganador && this.arePlayersEqual(ganador, jugador1Safe);
    const isPlayer2Winner = ganador && this.arePlayersEqual(ganador, jugador2Safe);

    this.drawPlayerSection(g, 0, this.matchHeight / 2 - 1, isPlayer1Winner);
    this.drawPlayerSection(g, this.matchHeight / 2 + 1, this.matchHeight / 2 - 1, isPlayer2Winner);

    this.drawPlayerNames(g, jugador1Safe, isPlayer1Winner, this.matchHeight / 4);
    this.drawPlayerNames(g, jugador2Safe, isPlayer2Winner, 3 * this.matchHeight / 4);

    g.style('cursor', 'pointer')
      .on('click', () => this.abrirModalPartido(partido, roundIndex, matchIndex));
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

  private drawModernConnections(eliminationRounds: Partido[][], roundIndex: number, gContainer: any) {
    const currentRound = eliminationRounds[roundIndex];
    const nextRound = eliminationRounds[roundIndex + 1];

    currentRound.forEach(partido => {
      if (partido.nextMatchIndex != null && nextRound[partido.nextMatchIndex]) {
        const currentX = partido.x! + this.matchWidth;
        const currentY = partido.y! + (partido.height! / 2);
        const nextPartido = nextRound[partido.nextMatchIndex];
        const nextX = nextPartido.x!;
        const nextY = nextPartido.y! + (nextPartido.height! / 2);

        // Líneas de conexión
        gContainer.append('line')
          .attr('x1', currentX).attr('y1', currentY)
          .attr('x2', currentX + (this.spacingX / 3)).attr('y2', currentY)
          .attr('stroke', '#cbd5e1').attr('stroke-width', 3).attr('stroke-dasharray', '5,5');

        gContainer.append('line')
          .attr('x1', currentX + (this.spacingX / 3)).attr('y1', currentY)
          .attr('x2', currentX + (this.spacingX / 3)).attr('y2', nextY)
          .attr('stroke', '#cbd5e1').attr('stroke-width', 3).attr('stroke-dasharray', '5,5');

        gContainer.append('line')
          .attr('x1', currentX + (this.spacingX / 3)).attr('y1', nextY)
          .attr('x2', nextX).attr('y2', nextY)
          .attr('stroke', '#cbd5e1').attr('stroke-width', 3).attr('stroke-dasharray', '5,5');
      }
    });
  }

  private createBasicEliminationStructure(): Partido[][] {
    return [
      { name: 'octavos', matches: 8 },
      { name: 'cuartos', matches: 4 },
      { name: 'semifinal', matches: 2 },
      { name: 'final', matches: 1 }
    ].map(round => {
      return Array.from({ length: round.matches }, (_, i) => ({
        jugador1: [{ name: 'Por asignar' }],
        jugador2: [{ name: 'Por asignar' }],
        ganador: null,
        groupName: round.name,
        id: null,
        couple1Id: null,
        couple2Id: null,
        nextMatchIndex: round.name !== 'final' ? Math.floor(i / 2) : null,
        scores1: [0, 0, 0],
        scores2: [0, 0, 0],
        date: null,
        start_time: null,
        end_time: null,
        court: null,
        status_game: 'Not started'
      }));
    });
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

  private arePlayersEqual(player1: any, player2: any[]): boolean {
    if (!player1 || !player2 || !Array.isArray(player2)) return false;

    if (Array.isArray(player1)) {
      const names1 = player1.map(p => p?.name || '').filter(name => name).sort().join(',');
      const names2 = player2.map(p => p?.name || '').filter(name => name).sort().join(',');
      return names1 === names2;
    }

    if (player1.name) {
      const names2 = player2.map(p => p?.name || '').filter(name => name).sort().join(',');
      return player1.name === names2;
    }

    return false;
  }

  getPlayerNames(players?: any[]): string {
    if (!players || players.length === 0) return 'Por asignar';
    if (typeof players === 'string') return players;
    if (Array.isArray(players)) return players.map(p => p.name || 'Sin nombre').join(' / ');
    return 'Por asignar';
  }

  toggleResultsSidebar() {
    this.showResultsSidebar = !this.showResultsSidebar;
  }

  cerrar() {
    this.dialogRef.close();
  }

  abrirPartidosGrupo(groupStanding: any) {
    console.log('Group standing recibido:', groupStanding);

    const category = this.filteredBracket[0];
    const groupComplete = category.groups?.find((g: any) => g.group_name === groupStanding.groupName);

    console.log('Grupo completo encontrado:', groupComplete);

    if (!groupComplete) {
      console.error('No se encontró el grupo completo');
      return;
    }

    const realGames = this.mapRealGamesForGroup(groupComplete);

    console.log('Games mapeados para el modal:', realGames);

    const dialogRef = this.dialog.open(MatchesGrupoDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: { games: realGames }
    });

    dialogRef.afterClosed().subscribe(updatedGames => {
      if (updatedGames) {
        console.log('Juegos actualizados:', updatedGames);
      }
    });
  }

  private mapRealGamesForGroup(group: any): any[] {
    const realGames = group.games || [];
    console.log('Games originales del grupo:', realGames);

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





}