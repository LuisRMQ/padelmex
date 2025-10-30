import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  court?: string | null;
  status_game?: string | null;
}

interface RankingItem {
  couple_id: number;
  players?: { name: string }[] | null;
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
  @ViewChild('bracketContainerSets', { static: false }) bracketContainerSets!: ElementRef;

  bracket: any[] = [];
  filteredBracket: any[] = [];
  selectedCategory: any = null;
  categories: any[] = [];
  results: any[] = [];

  loading = false;
  error: string | null = null;

  private svg: any;
  private gContainer: any;

  private matchWidth = 280;
  private matchHeight = 100;
  private spacingX = 300;
  private verticalSpacing = 60;
  private roundSpacing = 200;

  // Variables para arrastrar el bracket (drag)
  private startX = 0;
  private startY = 0;
  private translateX = 0;
  private translateY = 0;
private isDragging = false;

private scrollLeft = 0;
private scrollTop = 0;
  viewMode: ViewMode = 'bracket';
  bracketDataCards: Partido[][] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { torneoId: number },
    private dialogRef: MatDialogRef<InicioTorneoDialogComponent>,
    private tournamentService: TournamentService,
    private dialog: MatDialog
  ) { }

ngOnInit(): void {
  this.cargarBracket();
}

private cargarDetallesJuegosExistentes() {
  console.log('🔄 Iniciando carga de detalles de juegos existentes...');
  
  if (!this.bracketDataCards || this.bracketDataCards.length === 0) {
    console.warn('⚠️ bracketDataCards está vacío');
    return;
  }
  
  // Recopilar todos los IDs de juegos existentes de bracketDataCards
  const allMatches = this.bracketDataCards.flat();
  console.log('📋 Todos los partidos:', allMatches);
  
  const matchesWithIds = allMatches.filter(match => match.id && match.id !== null);
  
  console.log('🎯 Encontrados', matchesWithIds.length, 'juegos con IDs:', matchesWithIds.map(m => ({ id: m.id, group: m.groupName })));

  if (matchesWithIds.length === 0) {
    console.log('ℹ️ No hay juegos con IDs para cargar detalles');
    console.log('🔍 Revisando estructura de bracketDataCards:', this.bracketDataCards);
    return;
  }

  // Cargar detalles para cada juego
  matchesWithIds.forEach(match => {
    console.log('📥 Cargando detalles para gameId:', match.id);
    this.loadGameDetails(match.id!);
  });
}


enableBracketDragging(): void {
  const container = this.bracketContainerSets?.nativeElement;
  if (!container) return;

  container.addEventListener('mousedown', (e: MouseEvent) => {
    this.isDragging = true;
    container.classList.add('active');
    this.startX = e.pageX - container.offsetLeft;
    this.startY = e.pageY - container.offsetTop;
    this.scrollLeft = container.scrollLeft;
    this.scrollTop = container.scrollTop;
  });

  container.addEventListener('mouseleave', () => {
    this.isDragging = false;
    container.classList.remove('active');
  });

  container.addEventListener('mouseup', () => {
    this.isDragging = false;
    container.classList.remove('active');
  });

  container.addEventListener('mousemove', (e: MouseEvent) => {
    if (!this.isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;
    const walkX = (x - this.startX) * 1; // velocidad horizontal
    const walkY = (y - this.startY) * 1; // velocidad vertical
    container.scrollLeft = this.scrollLeft - walkX;
    container.scrollTop = this.scrollTop - walkY;
  });
}






  ngAfterViewInit(): void {
    if (this.filteredBracket.length) {
      this.drawBracket();
      // Inicializar el bracket de eliminatorias también
      setTimeout(() => this.drawBracketSets(), 100);
        setTimeout(() => this.enableBracketDragging(), 100);

    }
  }

  toggleViewMode() {
    if (this.viewMode === 'bracket') this.viewMode = 'cards';
    else if (this.viewMode === 'cards') this.viewMode = 'sets';
    else this.viewMode = 'bracket';

    if (this.viewMode === 'bracket') {
      setTimeout(() => this.drawBracket(true), 0);
    } else if (this.viewMode === 'sets') {
      setTimeout(() => this.drawBracketSets(), 0);
    }
  }

 cargarBracket() {
  this.loading = true;
  this.tournamentService.getBracketsByTournament(this.data.torneoId).subscribe({
    next: (res) => {
      console.log('🧱 Bracket API RAW:', res);
      console.log('🧱 Bracket data:', res.data?.data?.bracket);
      
      this.bracket = res.data?.data?.bracket || [];
      this.categories = this.bracket;
      this.selectedCategory = this.categories[0]?.category_name || null;
      
      console.log('📋 Categories disponibles:', this.categories);
      
      // Filtrar categoría primero
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
  if (!this.selectedCategory) {
    console.warn('⚠️ No hay categoría seleccionada');
    return;
  }

  console.log('🎯 Filtrando categoría:', this.selectedCategory);
  
  this.filteredBracket = this.bracket.filter(
    b => b.category_name === this.selectedCategory
  );

  console.log('📊 filteredBracket:', this.filteredBracket);

  if (this.filteredBracket.length > 0) {
    // Primero generar los datos del bracket
    this.generateResultsFromBracket(this.filteredBracket[0]);
    
    console.log('🔄 Llamando a drawBracket...');
    
    // Dibujar con un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      this.drawBracket();
      this.drawBracketSets();
      
      console.log('✅ Bracket dibujado');
      console.log('📊 bracketDataCards después de draw:', this.bracketDataCards);
      
      // 🔥 CARGAR DETALLES SOLO SI HAY DATOS
      if (this.bracketDataCards.length > 0) {
        console.log('🎯 Cargando detalles de juegos...');
        this.cargarDetallesJuegosExistentes();
      } else {
        console.warn('⚠️ bracketDataCards sigue vacío, intentando mapear directamente...');
        this.forceLoadGameDetails();
      }
      
    }, 100);
  } else {
    console.warn('⚠️ No hay datos en filteredBracket');
    this.results = [];
    if (this.gContainer) this.gContainer.selectAll('*').remove();
    setTimeout(() => this.drawBracketSets(), 0);
  }
}


private forceLoadGameDetails() {
  console.log('🚨 FORZANDO carga de detalles desde filteredBracket...');
  
  if (this.filteredBracket.length > 0) {
    // Mapear directamente desde filteredBracket
    const bracketData = this.mapToPartidos(this.filteredBracket[0]);
    this.bracketDataCards = bracketData;
    
    console.log('💾 bracketDataCards forzado:', this.bracketDataCards);
    console.log('📋 Partidos con IDs:', this.bracketDataCards.flat().filter(p => p.id).length);
    
    // Ahora cargar detalles
    this.cargarDetallesJuegosExistentes();
  }
}

private cargarScoresExistentes() {
  const allMatches = this.bracketDataCards.flat();
  const matchesWithIds = allMatches.filter(match => match.id);
  
  console.log('🎯 Cargando scores para matches:', matchesWithIds.length);
  
  matchesWithIds.forEach(match => {
    this.loadGameDetails(match.id!);
  });
}

  private generateResultsFromBracket(category: any) {
    const rounds = this.mapToPartidos(category);
    const results: any[] = [];

    const groupRound = rounds[0] || [];

    groupRound.forEach((match: any) => {
      // Asegurar que los scores tengan valores por defecto si no existen
      const scores1 = match.scores1 || [0, 0, 0];
      const scores2 = match.scores2 || [0, 0, 0];

      let winner: 'player1' | 'player2' | null = null;
      if (match.ganador) winner = match.ganador === match.jugador1 ? 'player1' : 'player2';

      results.push({
        roundName: 'Grupos',
        groupName: match.groupName,
        jugador1: match.jugador1,
        jugador2: match.jugador2,
        scores1: scores1,
        scores2: scores2,
        ganador: winner,
        isFinal: false,
        date: match.date || null,
        start_time: match.start_time || null,
        end_time: match.end_time || null,
        court: match.court || null,
        id: match.id || null,  // ← Asegurar que el ID esté presente
        status_game: match.status_game || 'Not started'  // ← Status por defecto
      });
    });

    this.results = results;
    console.log('🎯 Results generados:', this.results);
  }

  abrirModalPartido(partido: Partido, roundIndex: number, matchIndex: number) {
    console.log('🔍 DEBUG - Partido clickeado:', partido);

    // Cargar los detalles más recientes del juego
    if (partido.id) {
      this.loadGameDetails(partido.id);
    }

    const dialogRef = this.dialog.open(RegistrarGanadorDialogComponent, {
      width: '700px',
      data: { partido, roundIndex, matchIndex }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.marcarGanador(result, roundIndex, matchIndex);
        // Recargar detalles después de actualizar
        if (partido.id) {
          setTimeout(() => this.loadGameDetails(partido.id!), 500);
        }
      }
    });
  }

  marcarGanador(ganador: any, roundIndex: number, matchIndex: number) {
    const gameId = ganador.gameId || ganador.id;

    // Buscar el partido en bracketDataCards por id
    const partidoOriginal = this.bracketDataCards
      .flat()
      .find(p => p.id === gameId);

    if (!partidoOriginal) {
      console.warn('No se encontró el partido con ID:', gameId);
      return;
    }

    // Actualizar ganador
    partidoOriginal.ganador = ganador;

    // Si hay scores, actualizar también
    if (ganador.scores1) partidoOriginal.scores1 = ganador.scores1;
    if (ganador.scores2) partidoOriginal.scores2 = ganador.scores2;

    this.drawBracket();
    if (this.viewMode === 'sets') this.drawBracketSets();
  }

  cerrar() {
    this.dialogRef.close();
  }






  // ------------------ D3 DRAW ------------------
  private drawBracket(useCachedData: boolean = false) {
  if (this.viewMode === 'cards') return;
  if (!this.bracketContainer?.nativeElement) return;

  const container = this.bracketContainer.nativeElement as HTMLElement;
  if (container.offsetParent === null) {
    setTimeout(() => this.drawBracket(useCachedData), 50);
    return;
  }

  console.log('🎨 Dibujando bracket, useCachedData:', useCachedData);

  // 🔥 SIEMPRE mapear datos frescos para bracketDataCards
  const bracketData: Partido[][] = this.mapToPartidos(this.filteredBracket[0]);
  
  // 🔥 ACTUALIZAR bracketDataCards SIEMPRE
  this.bracketDataCards = bracketData;
  console.log('💾 bracketDataCards actualizado en drawBracket:', this.bracketDataCards.length);

  d3.select(container).selectAll('*').remove();

  const width = bracketData.length * (this.matchWidth + this.spacingX) + 100;
  const maxMatches = Math.max(...bracketData.map(r => r.length));
  const height = maxMatches * (this.matchHeight + this.verticalSpacing) + 100;

  this.svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'bracket-svg');

  this.gContainer = this.svg.append('g').attr('class', 'bracket-container');

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

  // Dragging
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
      this.drawBracket(true);
    } else if (this.viewMode === 'sets') {
      this.drawBracketSets();
    }
  }

  // ------------------ MAPEO DE PARTIDOS ------------------
  private mapToPartidos(category: any): Partido[][] {
  console.log('🗺️ Mapeando partidos de category:', category);
  
  const rounds: Partido[][] = [];

  // -------------------------------
  // 1️⃣ FASE DE GRUPOS
  // -------------------------------
  const groupRound: Partido[] = [];

  (category.groups || []).forEach((group: any) => {
    console.log('👥 Procesando grupo:', group.group_name);
    
    const ranking = group.ranking || [];
    const rankById: { [id: number]: any } = {};
    (ranking as RankingItem[]).forEach((r: RankingItem) => {
      rankById[r.couple_id] = r;
    });

    const seenPairs = new Set<string>();
    const matches: Partido[] = [];

    (group.games || []).forEach((game: any) => {
      console.log('🎮 Juego en grupo:', game);
      
      const a = game.couple_1;
      const b = game.couple_2;
      if (!a || !b) return;
      
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      seenPairs.add(key);

      const partido: Partido = {
        jugador1: rankById[a]?.players || [{ name: 'Por asignar' }],
        jugador2: rankById[b]?.players || [{ name: 'Por asignar' }],
        ganador: null,
        groupName: group.group_name,
        id: game.game_id || null,
        couple1Id: a || null,
        couple2Id: b || null,
        scores1: game.scores1 || [0, 0, 0],
        scores2: game.scores2 || [0, 0, 0],
        date: game.date || null,
        start_time: game.start_time || null,
        end_time: game.end_time || null,
        court: game.court || null,
        status_game: game.status_game || null
      };
      
      console.log('➕ Partido creado:', partido);
      matches.push(partido);
    });

    groupRound.push(...matches);
  });

  if (groupRound.length) {
    console.log('📦 Group round partidos:', groupRound);
    rounds.push(groupRound);
  }

  // -------------------------------
  // 2️⃣ FASE DE ELIMINACIONES
  // -------------------------------
  const eliminationOrder = ['octavos', 'cuartos', 'semifinal', 'final'];
  const eliminationRounds: Partido[][] = [];

  eliminationOrder.forEach((phase, phaseIndex) => {
    console.log(`🏆 Procesando fase: ${phase}`);
    
    const phaseGames = category.elimination?.[phase] || [];
    console.log(`🎮 Juegos en ${phase}:`, phaseGames);
    
    const phaseMatches: Partido[] = [];

    // Determinar cuántos partidos debería tener esta ronda
    const expectedMatches = phase === 'final' ? 1 :
      phase === 'semifinal' ? 2 :
        phase === 'cuartos' ? 4 : 8;

    for (let i = 0; i < expectedMatches; i++) {
      const existingGame = phaseGames[i];
      let nextMatchIndex: number | null = null;

      if (phase !== 'final') {
        nextMatchIndex = Math.floor(i / 2);
      }

      if (existingGame) {
        console.log(`✅ Juego existente en ${phase}[${i}]:`, existingGame);
        
        const partido: Partido = {
          jugador1: existingGame.couple_1?.players || [{ name: 'Por asignar' }],
          jugador2: existingGame.couple_2?.players || [{ name: 'Por asignar' }],
          ganador: null,
          groupName: phase,
          id: existingGame.game_id || null,
          couple1Id: existingGame.couple_1?.id || null,
          couple2Id: existingGame.couple_2?.id || null,
          nextMatchIndex,
          scores1: existingGame.scores1 || [0, 0, 0],
          scores2: existingGame.scores2 || [0, 0, 0],
          date: existingGame.date || null,
          start_time: existingGame.start_time || null,
          end_time: existingGame.end_time || null,
          court: existingGame.court || null
        };
        
        console.log(`➕ Partido de eliminación creado:`, partido);
        phaseMatches.push(partido);
      } else {
        console.log(`❌ No hay juego en ${phase}[${i}], creando vacío`);
        
        // Crear partido vacío
        phaseMatches.push({
          jugador1: [{ name: 'Por asignar' }],
          jugador2: [{ name: 'Por asignar' }],
          ganador: null,
          groupName: phase,
          id: null,
          couple1Id: null,
          couple2Id: null,
          nextMatchIndex,
          scores1: [0, 0, 0],
          scores2: [0, 0, 0],
          date: null,
          start_time: null,
          end_time: null,
          court: null
        });
      }
    }

    eliminationRounds.push(phaseMatches);
  });

  rounds.push(...eliminationRounds);
  
  console.log('🏁 TOTAL rounds mapeados:', rounds.length);
  console.log('🏁 TOTAL partidos:', rounds.flat().length);
  console.log('🏁 Partidos con IDs:', rounds.flat().filter(p => p.id).length);
  
  return rounds;
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

  private drawBracketSets() {
    console.log('Dibujando bracket sets moderno...');

    if (!this.bracketContainerSets?.nativeElement) {
      console.warn('bracketContainerSets no disponible');
      return;
    }

    const container = this.bracketContainerSets.nativeElement as HTMLElement;

    // Limpiar contenedor
    d3.select(container).selectAll('*').remove();

    try {
      // Obtener las eliminatorias o crear estructura básica si no hay datos
      let eliminationRounds = this.bracketDataCards.filter((round, index) => index > 0);

      // Si no hay eliminatorias en los datos, crear estructura básica
      if (!eliminationRounds.length) {
        eliminationRounds = this.createBasicEliminationStructure();
      }

      // Asegurarse de que todos los partidos tengan jugadores "Por asignar" si están vacíos
      eliminationRounds.forEach(round => {
        round.forEach(partido => {
          if (!partido.jugador1 || partido.jugador1.length === 0) {
            partido.jugador1 = [{ name: 'Por asignar' }];
          }
          if (!partido.jugador2 || partido.jugador2.length === 0) {
            partido.jugador2 = [{ name: 'Por asignar' }];
          }
        });
      });

      // Calcular dimensiones dinámicas
      const totalWidth = eliminationRounds.length * (this.matchWidth + this.spacingX) + this.roundSpacing;
      const maxMatches = Math.max(...eliminationRounds.map(r => r.length));
      const totalHeight = maxMatches * (this.matchHeight + this.verticalSpacing) + 200;

      const svg = d3.select(container).append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight)
        .attr('class', 'bracket-svg');

      const gContainer = svg.append('g').attr('class', 'bracket-container');

      // Calcular posiciones para las eliminatorias
      this.calculatePositionsForModernElimination(eliminationRounds, totalWidth, totalHeight);

      // Dibujar fondo de secciones para cada ronda
      this.drawRoundBackgrounds(eliminationRounds, gContainer);

      // Dibujar las eliminatorias
      eliminationRounds.forEach((ronda, roundIndex) => {
        // Dibujar título de la ronda
        this.drawRoundTitle(eliminationRounds, roundIndex, gContainer);

        // Dibujar partidos
        ronda.forEach((partido, matchIndex) => {
          this.drawModernEliminationMatch(gContainer, partido, roundIndex, matchIndex);
        });

        // Dibujar conexiones entre rondas
        if (roundIndex < eliminationRounds.length - 1) {
          this.drawModernConnections(eliminationRounds, roundIndex, gContainer);
        }
      });

      console.log('Bracket moderno dibujado exitosamente');

    } catch (error) {
      console.error('Error al dibujar bracket moderno:', error);
      this.showErrorState(container);
    }
  }

  private calculatePositionsForModernElimination(eliminationRounds: Partido[][], totalWidth: number, totalHeight: number) {
    eliminationRounds.forEach((ronda, roundIndex) => {
      // Posición X con más espacio entre rondas
      const x = roundIndex * (this.matchWidth + this.spacingX) + 100;

      // Calcular posición Y centrada verticalmente para cada ronda
      const totalRoundHeight = ronda.length * (this.matchHeight + this.verticalSpacing);
      const startY = (totalHeight - totalRoundHeight) / 2;

      ronda.forEach((partido, matchIndex) => {
        partido.x = x;
        partido.y = startY + matchIndex * (this.matchHeight + this.verticalSpacing);
        partido.height = this.matchHeight;
      });
    });
  }

  private drawRoundBackgrounds(eliminationRounds: Partido[][], gContainer: any) {
    eliminationRounds.forEach((ronda, roundIndex) => {
      if (ronda.length === 0) return;

      const firstMatch = ronda[0];
      const lastMatch = ronda[ronda.length - 1];

      const backgroundX = firstMatch.x! - 40;
      const backgroundY = firstMatch.y! - 60;
      const backgroundWidth = this.matchWidth + 80;
      const backgroundHeight = (lastMatch.y! - firstMatch.y!) + this.matchHeight + 80;

      // Fondo con gradiente moderno
      gContainer.append('rect')
        .attr('x', backgroundX)
        .attr('y', backgroundY)
        .attr('width', backgroundWidth)
        .attr('height', backgroundHeight)
        .attr('rx', 16)
        .attr('fill', 'url(#roundGradient)')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 2)
        .attr('opacity', 0.1);

      // Definir gradiente
      const defs = gContainer.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', 'roundGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#6366f1');

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#8b5cf6');
    });
  }

  private drawRoundTitle(eliminationRounds: Partido[][], roundIndex: number, gContainer: any) {
    const ronda = eliminationRounds[roundIndex];
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

    // Asegurar que los jugadores tengan al menos "Por asignar"
    const jugador1 = partido.jugador1 && partido.jugador1.length > 0 ? partido.jugador1 : [{ name: 'Por asignar' }];
    const jugador2 = partido.jugador2 && partido.jugador2.length > 0 ? partido.jugador2 : [{ name: 'Por asignar' }];

    // Fondo moderno del partido con sombra
    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 2)
      .attr('rx', 12)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    // Jugador 1 - Diseño moderno
    const isPlayer1Winner = partido.ganador && this.arePlayersEqual(partido.ganador, jugador1);
    const player1Bg = g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2 - 1)
      .attr('fill', isPlayer1Winner ? 'url(#winnerGradient)' : '#f8fafc')
      .attr('stroke', isPlayer1Winner ? '#10b981' : '#e2e8f0')
      .attr('stroke-width', isPlayer1Winner ? 2 : 1)
      .attr('rx', 10)
      .attr('ry', 10);

    // Jugador 2 - Diseño moderno
    const isPlayer2Winner = partido.ganador && this.arePlayersEqual(partido.ganador, jugador2);
    const player2Bg = g.append('rect')
      .attr('y', this.matchHeight / 2 + 1)
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2 - 1)
      .attr('fill', isPlayer2Winner ? 'url(#winnerGradient)' : '#f8fafc')
      .attr('stroke', isPlayer2Winner ? '#10b981' : '#e2e8f0')
      .attr('stroke-width', isPlayer2Winner ? 2 : 1)
      .attr('rx', 10)
      .attr('ry', 10);

    // Nombres de jugadores con mejor estilo
    const nombres1 = this.getPlayerNames(jugador1);
    const nombres2 = this.getPlayerNames(jugador2);

    // Jugador 1 text
    g.append('text')
      .text(nombres1)
      .attr('x', 12)
      .attr('y', this.matchHeight / 4)
      .attr('dy', '0.35em')
      .attr('fill', isPlayer1Winner ? '#ffffff' : '#334155')
      .attr('font-size', '13px')
      .attr('font-weight', isPlayer1Winner ? '700' : '600')
      .attr('class', 'player-name');

    // Jugador 2 text
    g.append('text')
      .text(nombres2)
      .attr('x', 12)
      .attr('y', (3 * this.matchHeight) / 4)
      .attr('dy', '0.35em')
      .attr('fill', isPlayer2Winner ? '#ffffff' : '#334155')
      .attr('font-size', '13px')
      .attr('font-weight', isPlayer2Winner ? '700' : '600')
      .attr('class', 'player-name');

    // Añadir gradiente para ganadores si no existe
    if (!gContainer.select('defs #winnerGradient').size()) {
      const defs = gContainer.append('defs');
      const winnerGradient = defs.append('linearGradient')
        .attr('id', 'winnerGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      winnerGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#10b981');

      winnerGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#059669');
    }


  }

  private drawModernConnections(eliminationRounds: Partido[][], roundIndex: number, gContainer: any) {
    const currentRound = eliminationRounds[roundIndex];
    const nextRound = eliminationRounds[roundIndex + 1];

    currentRound.forEach((partido, matchIndex) => {
      if (partido.nextMatchIndex != null && nextRound[partido.nextMatchIndex]) {
        const currentX = partido.x! + this.matchWidth;
        const currentY = partido.y! + (partido.height! / 2);
        const nextPartido = nextRound[partido.nextMatchIndex];
        const nextX = nextPartido.x!;
        const nextY = nextPartido.y! + (nextPartido.height! / 2);

        // Línea horizontal desde el partido actual (más larga)
        gContainer.append('line')
          .attr('x1', currentX)
          .attr('y1', currentY)
          .attr('x2', currentX + (this.spacingX / 3))
          .attr('y2', currentY)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', '5,5');

        // Línea vertical
        gContainer.append('line')
          .attr('x1', currentX + (this.spacingX / 3))
          .attr('y1', currentY)
          .attr('x2', currentX + (this.spacingX / 3))
          .attr('y2', nextY)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', '5,5');

        // Línea horizontal al siguiente partido
        gContainer.append('line')
          .attr('x1', currentX + (this.spacingX / 3))
          .attr('y1', nextY)
          .attr('x2', nextX)
          .attr('y2', nextY)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', '5,5');

        // Puntos de conexión
        [currentX + (this.spacingX / 3), nextX].forEach(x => {
          gContainer.append('circle')
            .attr('cx', x)
            .attr('cy', nextY)
            .attr('r', 4)
            .attr('fill', '#6366f1');
        });
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





  private createBasicEliminationStructure(): Partido[][] {
    console.log('Creando estructura básica de eliminatorias moderna...');

    const eliminationStructure: Partido[][] = [];

    // Definir las rondas típicas de un torneo
    const rounds = [
      { name: 'octavos', matches: 8 },
      { name: 'cuartos', matches: 4 },
      { name: 'semifinal', matches: 2 },
      { name: 'final', matches: 1 }
    ];

    rounds.forEach(round => {
      const roundMatches: Partido[] = [];

      for (let i = 0; i < round.matches; i++) {
        // Calcular nextMatchIndex para las conexiones
        let nextMatchIndex: number | null = null;
        if (round.name !== 'final') {
          nextMatchIndex = Math.floor(i / 2);
        }

        roundMatches.push({
          jugador1: [{ name: 'Por asignar' }],
          jugador2: [{ name: 'Por asignar' }],
          ganador: null,
          groupName: round.name,
          id: null,
          couple1Id: null,
          couple2Id: null,
          nextMatchIndex: nextMatchIndex,
          scores1: [0, 0, 0],
          scores2: [0, 0, 0],
          date: null,
          start_time: null,
          end_time: null,
          court: null,
          x: 0,
          y: 0,
          height: this.matchHeight
        });
      }

      eliminationStructure.push(roundMatches);
    });

    return eliminationStructure;
  }

  private calculatePositionsForElimination(eliminationRounds: Partido[][], containerWidth: number, containerHeight: number) {
    const roundWidth = (containerWidth - 100) / eliminationRounds.length;
    const maxMatches = Math.max(...eliminationRounds.map(r => r.length));

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

  private drawEliminationMatch(gContainer: any, partido: Partido, roundIndex: number, matchIndex: number) {
    const g = gContainer.append('g').attr('transform', `translate(${partido.x}, ${partido.y})`);

    // Asegurar que los jugadores tengan al menos "Por asignar"
    const jugador1 = partido.jugador1 && partido.jugador1.length > 0 ? partido.jugador1 : [{ name: 'Por asignar' }];
    const jugador2 = partido.jugador2 && partido.jugador2.length > 0 ? partido.jugador2 : [{ name: 'Por asignar' }];

    // Fondo del partido
    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight)
      .attr('fill', '#ffffff')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2)
      .attr('rx', 5);

    // Jugador 1
    const isPlayer1Winner = partido.ganador && this.arePlayersEqual(partido.ganador, jugador1);
    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2 - 1)
      .attr('fill', isPlayer1Winner ? '#10b981' : '#f3f4f6')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 1);

    // Jugador 2
    const isPlayer2Winner = partido.ganador && this.arePlayersEqual(partido.ganador, jugador2);
    g.append('rect')
      .attr('y', this.matchHeight / 2 + 1)
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2 - 1)
      .attr('fill', isPlayer2Winner ? '#10b981' : '#f3f4f6')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 1);

    // Nombres de jugadores
    const nombres1 = this.getPlayerNames(jugador1);
    const nombres2 = this.getPlayerNames(jugador2);

    g.append('text')
      .text(nombres1)
      .attr('x', 5)
      .attr('y', this.matchHeight / 4)
      .attr('dy', '0.35em')
      .attr('fill', isPlayer1Winner ? '#ffffff' : '#000000')
      .attr('font-size', '12px')
      .attr('font-weight', isPlayer1Winner ? 'bold' : 'normal');

    g.append('text')
      .text(nombres2)
      .attr('x', 5)
      .attr('y', (3 * this.matchHeight) / 4)
      .attr('dy', '0.35em')
      .attr('fill', isPlayer2Winner ? '#ffffff' : '#000000')
      .attr('font-size', '12px')
      .attr('font-weight', isPlayer2Winner ? 'bold' : 'normal');

    // Nombre de la ronda (solo para el primer partido de cada ronda)
    if (matchIndex === 0) {
      const roundNames: { [key: string]: string } = {
        'octavos': 'Octavos de Final',
        'cuartos': 'Cuartos de Final',
        'semifinal': 'Semifinal',
        'final': 'Final'
      };

      const roundName = roundNames[partido.groupName] || partido.groupName;
      gContainer.append('text')
        .text(roundName)
        .attr('x', partido.x! + this.matchWidth / 2)
        .attr('y', partido.y! - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#000')
        .attr('font-weight', 'bold')
        .attr('font-size', '14px');
    }

    g.style('cursor', 'pointer')
      .on('click', () => this.abrirModalPartido(partido, roundIndex + 1, matchIndex));
  }


  private drawEliminationConnections(eliminationRounds: Partido[][], roundIndex: number, gContainer: any) {
    const currentRound = eliminationRounds[roundIndex];
    const nextRound = eliminationRounds[roundIndex + 1];

    currentRound.forEach((partido, matchIndex) => {
      if (partido.nextMatchIndex != null && nextRound[partido.nextMatchIndex]) {
        const currentX = partido.x! + this.matchWidth;
        const currentY = partido.y! + (partido.height! / 2);
        const nextPartido = nextRound[partido.nextMatchIndex];
        const nextX = nextPartido.x!;
        const nextY = nextPartido.y! + (nextPartido.height! / 2);

        // Línea horizontal desde el partido actual
        gContainer.append('line')
          .attr('x1', currentX).attr('y1', currentY)
          .attr('x2', currentX + 20).attr('y2', currentY)
          .attr('stroke', '#1e7e34').attr('stroke-width', 2);

        // Línea vertical
        gContainer.append('line')
          .attr('x1', currentX + 20).attr('y1', currentY)
          .attr('x2', currentX + 20).attr('y2', nextY)
          .attr('stroke', '#1e7e34').attr('stroke-width', 2);

        // Línea horizontal al siguiente partido
        gContainer.append('line')
          .attr('x1', currentX + 20).attr('y1', nextY)
          .attr('x2', nextX).attr('y2', nextY)
          .attr('stroke', '#1e7e34').attr('stroke-width', 2);
      }
    });
  }

  // Método auxiliar para comparar jugadores
  private arePlayersEqual(player1: any, player2: any[]): boolean {
    if (!player1 || !player2) return false;

    const names1 = Array.isArray(player1) ?
      player1.map(p => p.name).sort().join(',') :
      player1.name || '';

    const names2 = player2.map(p => p.name).sort().join(',');

    return names1 === names2;
  }

  private drawMatch(partido: Partido, roundIndex: number, matchIndex: number) {
    const g = this.gContainer.append('g').attr('transform', `translate(${partido.x}, ${partido.y})`);

    g.append('rect')
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2 - 2)
      .attr('fill', '#90caf9')
      .attr('stroke', '#1e7e34')
      .attr('stroke-width', 2)
      .attr('rx', 5);

    g.append('rect')
      .attr('y', this.matchHeight / 2 + 2)
      .attr('width', this.matchWidth)
      .attr('height', this.matchHeight / 2 - 2)
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
        .attr('y', this.matchHeight / 4)
        .attr('dy', '0.35em')
        .attr('fill', '#000')
        .attr('font-weight', 'bold')
        .attr('font-size', '14px')
        .call(this.wrapText, maxTextWidth, this.matchHeight / 2 - 4);
    }

    if (partido.jugador2) {
      const nombres2 = partido.jugador2.map(j => j.name).join(' / ');
      g.append('text')
        .text(nombres2)
        .attr('x', 10)
        .attr('y', (3 * this.matchHeight) / 4)
        .attr('dy', '0.35em')
        .attr('fill', '#000')
        .attr('font-weight', 'bold')
        .attr('font-size', '14px')
        .call(this.wrapText, maxTextWidth, this.matchHeight / 2 - 4);
    }

    g.style('cursor', 'pointer')
      .on('click', () => this.abrirModalPartido(partido, roundIndex, matchIndex));
  }

  private wrapText(text: d3.Selection<SVGTextElement, unknown, null, undefined>, width: number, maxHeight: number) {
    text.each(function () {
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
    if (!nextRound || partido.nextMatchIndex == null) return;

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
      const ronda = bracketData[i];
      if (ronda[0]?.groupName === 'octavos') labels.push('Octavos');
      else if (ronda[0]?.groupName === 'cuartos') labels.push('Cuartos');
      else if (ronda[0]?.groupName === 'semifinal') labels.push('Semifinal');
      else if (ronda[0]?.groupName === 'final') labels.push('Final');
      else labels.push(`Ronda ${i}`);
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
    return Object.keys(groups).map(groupName => ({ groupName, matches: groups[groupName] }));
  }

  getPlayerNames(players?: any[]): string {
    if (!players || players.length === 0) return 'Por asignar';
    return players.map(p => p.name).join(' / ');
  }

  logMatch(match: any) {
    console.log('Match:', match);
    return true;
  }

  getStatusGame(match: any): string {
    if (match.status_game === 'Not started') return 'Pendiente';
    if (match.status_game === 'proccessing') return 'En Progreso';
    if (match.status_game === 'completed') return 'Finalizado';
    return 'Desconocido';
  }

  getStatusClass(match: any): string {
    if (match.status_game === 'Not started') return 'pendiente';
    if (match.status_game === 'proccessing') return 'en-progreso';
    if (match.status_game === 'completed') return 'finalizado';
    return 'desconocido';
  }

  loadGameDetails(gameId: number) {
    this.tournamentService.getGameDetail(gameId).subscribe({
      next: (response) => {
        console.log('Detalles del juego:', response.data);

        // Aquí puedes actualizar los scores en tu interfaz
        this.updateMatchScores(gameId, response.data);
      },
      error: (error) => {
        console.error('Error al cargar detalles del juego:', error);
      }
    });
  }

 private updateMatchScores(gameId: number, gameDetail: GameDetailResponse) {
  console.log('🔄 Actualizando scores para gameId:', gameId);

  let needsRedraw = false;

  // Actualizar en bracketDataCards
  this.bracketDataCards.forEach(round => {
    round.forEach(match => {
      if (match.id === gameId) {
        this.updateSingleMatchScores(match, gameDetail);
        needsRedraw = true;
      }
    });
  });

  // También actualizar en results
  this.results.forEach(match => {
    if (match.id === gameId) {
      this.updateSingleMatchScores(match, gameDetail);
      needsRedraw = true;
    }
  });

  console.log('✅ Scores actualizados, needsRedraw:', needsRedraw);

  // Forzar actualización visual inmediata
  if (needsRedraw) {
    this.forceImmediateRedraw();
  }
}

private forceImmediateRedraw() {
  // Usar setTimeout para asegurar que Angular actualice el ciclo de detección de cambios
  setTimeout(() => {
    if (this.viewMode === 'bracket') {
      this.drawBracket(true);
    } else if (this.viewMode === 'sets') {
      this.drawBracketSets();
    }
    
    // Forzar detección de cambios
    this.results = [...this.results];
    this.bracketDataCards = [...this.bracketDataCards];
  }, 0);
}

  private updateSingleMatchScores(match: any, gameDetail: GameDetailResponse) {
  console.log('📝 Actualizando match:', match.id);
  console.log('📊 GameDetail sets:', gameDetail.sets);

  // 🔥 MANEJAR CASO CUANDO SETS ES NULL O UNDEFINED
  let sortedSets: any[] = [];
  
  if (gameDetail.sets && Array.isArray(gameDetail.sets)) {
    sortedSets = gameDetail.sets.sort((a, b) => a.set_number - b.set_number);
  } else {
    console.warn('⚠️ gameDetail.sets es null o no es un array, usando array vacío');
  }

  // Actualizar scores solo si hay sets
  if (sortedSets.length > 0) {
    match.scores1 = sortedSets.map(set => set.score_1);
    match.scores2 = sortedSets.map(set => set.score_2);
  } else {
    // Si no hay sets, mantener los scores existentes o usar ceros
    match.scores1 = match.scores1 || [0, 0, 0];
    match.scores2 = match.scores2 || [0, 0, 0];
  }

  // Actualizar ganador si existe
  if (gameDetail.winner) {
    match.ganador = gameDetail.winner.players;
  } else {
    // Si no hay ganador, limpiar el ganador existente
    match.ganador = null;
  }

  // Actualizar estado del juego
  match.status_game = gameDetail.status_game || 'Not started';

  console.log('✅ Match actualizado:', {
    id: match.id,
    scores1: match.scores1,
    scores2: match.scores2,
    ganador: match.ganador,
    status: match.status_game,
    setsRecibidos: gameDetail.sets
  });
}

  private forceChangeDetection() {
    // Forzar actualización de la vista
    this.results = [...this.results];

    // Redibujar si es necesario
    this.forceRedrawBracket();
  }

}
