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
  winner_id?: any | null;
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
  // Para debug
  _originalGame?: any;
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
        // CORREGIDO: Usar gameDetail.winner?.id en lugar de gameDetail.winner_id
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
        // CORREGIDO: Usar gameDetail.winner?.id
        winner_id: gameDetail.winner?.id ?? g.winner_id,
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
        // CORREGIDO: Usar gameDetail.winner?.id
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

  // BRACKET DRAWING METHODS
  private drawBracketSets() {
    if (!this.bracketContainerSets?.nativeElement || !this.filteredBracket?.[0]) return;

    const container = this.bracketContainerSets.nativeElement as HTMLElement;
    d3.select(container).selectAll('*').remove();

    try {
      const category = this.filteredBracket[0];
      console.log('🔍 CATEGORÍA COMPLETA:', category);

      const allRounds = this.mapToPartidos(category);
      console.log('🔍 PARTIDOS MAPEADOS:', allRounds);

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
      console.log(`🔍 Fase ${phase}:`, phaseGames);

      const phaseMatches = phaseGames.map((game: any, index: number) => {
        const nextMatchIndex = this.calculateNextMatchIndex(phase, index);

        // Preservar la estructura original completa
        const partido: Partido = {
          jugador1: this.getPlayersFromEliminationCouple(game.couple_1),
          jugador2: this.getPlayersFromEliminationCouple(game.couple_2),
          winner_id: game.winner_id || null,
          groupName: phase,
          id: game.game_id || game.id || null,
          couple1Id: game.couple_1?.id || null,
          couple2Id: game.couple_2?.id || null,
          nextMatchIndex,
          scores1: game.scores1 || [0, 0, 0],
          scores2: game.scores2 || [0, 0, 0],
          date: game.date,
          start_time: game.start_time,
          end_time: game.end_time,
          court: game.court,
          status_game: game.status_game || 'Not started',
          // Guardar referencia al juego original para debug
          _originalGame: game
        };

        console.log(`🎯 Partido mapeado [${phase}-${index}]:`, partido);
        return partido;
      });

      if (phaseMatches.length > 0) {
        rounds.push(phaseMatches);
      }
    });

    return rounds;
  }

  private extractCoupleId(couple: any): number | null {
    if (!couple) return null;
    if (couple.id) return couple.id;
    if (Array.isArray(couple) && couple[0]?.couple_id) return couple[0].couple_id;
    return null;
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

    console.log(`🎲 Dibujando partido ${partido.id}:`, {
      player1: this.getPlayerNamesFromPlayers(partido.jugador1),
      player2: this.getPlayerNamesFromPlayers(partido.jugador2),
      winner_id: partido.winner_id,
      status: partido.status_game
    });

    // SOLUCIÓN MEJORADA
    const { isPlayer1Winner, isPlayer2Winner } = this.determineWinnersFromOriginalData(partido);

    console.log(`🏅 Partido ${partido.id} - Ganadores:`, {
      isPlayer1Winner,
      isPlayer2Winner,
      expected: partido.winner_id
    });

    // Fondo del partido
    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2)
      .attr('rx', 12)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    // Jugadores - fondo verde para ganadores
    this.drawPlayerSection(g, 0, this.matchHeight / 2 - 1, isPlayer1Winner);
    this.drawPlayerSection(g, this.matchHeight / 2 + 1, this.matchHeight / 2 - 1, isPlayer2Winner);

    // Nombres
    this.drawPlayerNames(g, jugador1Safe, isPlayer1Winner, this.matchHeight / 4);
    this.drawPlayerNames(g, jugador2Safe, isPlayer2Winner, 3 * this.matchHeight / 4);

    // Indicador de ganador
    if (partido.status_game === 'completed' && partido.winner_id) {
      this.drawWinnerIndicator(g, isPlayer1Winner || isPlayer2Winner);
    }

    g.style('cursor', 'pointer')
      .on('click', () => this.abrirModalPartido(partido, roundIndex, matchIndex));
  }

  private determineWinnersFromOriginalData(partido: Partido): { isPlayer1Winner: boolean, isPlayer2Winner: boolean } {
    console.log('🎯 Determinando ganador para partido:', partido.id, 'winner_id:', partido.winner_id);

    // Si no hay winner_id o no está completado, no hay ganadores
    if (!partido.winner_id || partido.status_game !== 'completed') {
      console.log('❌ No hay ganador - winner_id:', partido.winner_id, 'status:', partido.status_game);
      return { isPlayer1Winner: false, isPlayer2Winner: false };
    }

    // Construir el mapa de couple_id a nombres
    const category = this.filteredBracket[0];
    const coupleIdToNamesMap = this.buildCoupleIdToNamesMap(category);

    // Buscar el partido original
    const originalGame = partido.id != null ? this.findOriginalGame(partido.id) : null;
    if (!originalGame) {
      console.log('❌ No se encontró el juego original');
      return { isPlayer1Winner: false, isPlayer2Winner: false };
    }

    console.log('🔍 Juego original encontrado:', originalGame);

    // Obtener los nombres de los equipos del partido
    const player1Names = this.getPlayerNamesFromPlayers(partido.jugador1).toLowerCase();
    const player2Names = this.getPlayerNamesFromPlayers(partido.jugador2).toLowerCase();

    console.log('👥 Nombres en partido:', { player1Names, player2Names });

    // Buscar qué couple_id corresponde a cada equipo basado en los nombres
    let player1CoupleId: number | null = null;
    let player2CoupleId: number | null = null;

    // Buscar en el mapa por coincidencia de nombres
    for (const [coupleId, names] of coupleIdToNamesMap.entries()) {
      const normalizedNames = names.toLowerCase();
      if (this.namesMatch(normalizedNames, player1Names)) {
        player1CoupleId = coupleId;
        console.log('✅ Player 1 coincide con couple_id:', coupleId);
      }
      if (this.namesMatch(normalizedNames, player2Names)) {
        player2CoupleId = coupleId;
        console.log('✅ Player 2 coincide con couple_id:', coupleId);
      }
    }

    // Si encontramos las coincidencias, determinar ganadores
    if (player1CoupleId !== null || player2CoupleId !== null) {
      console.log('🏆 Comparando winner_id:', partido.winner_id, 'con couple_ids:', { player1CoupleId, player2CoupleId });

      const isPlayer1Winner = player1CoupleId === partido.winner_id;
      const isPlayer2Winner = player2CoupleId === partido.winner_id;

      console.log('🎊 Resultado:', { isPlayer1Winner, isPlayer2Winner });

      return { isPlayer1Winner, isPlayer2Winner };
    }

    console.log('❌ No se pudieron encontrar coincidencias de couple_id');
    return { isPlayer1Winner: false, isPlayer2Winner: false };
  }

  private getPlayerNamesFromPlayers(players: any[] | undefined): string {
    if (!players || !Array.isArray(players)) return '';

    // Si es "Por asignar", retornar vacío
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

    // Normalizar nombres: quitar acentos, convertir a minúsculas, ordenar
    const normalize = (str: string) => {
      return str
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
        .toLowerCase()
        .split(',')
        .map(name => name.trim())
        .sort()
        .join(',');
    };

    const normalized1 = normalize(names1);
    const normalized2 = normalize(names2);

    console.log('🔤 Comparando nombres:', { normalized1, normalized2 });

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
      disableClose: false,

      data: { games: realGames }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.cargarBracket();


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

    // Mapear desde los grupos donde tenemos la relación completa
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

    console.log('🗺️ Mapa de couple_id a nombres:', Object.fromEntries(map));
    return map;
  }

  private findOriginalGame(gameId: number): any {
    const category = this.filteredBracket[0];
    if (!category || !category.elimination) return null;

    const eliminationPhases = ['octavos', 'cuartos', 'semifinal', 'final'];

    for (const phase of eliminationPhases) {
      const phaseGames = category.elimination[phase] || [];
      const game = phaseGames.find((g: any) => (g.game_id || g.id) === gameId);
      if (game) return game;
    }

    return null;
  }

}