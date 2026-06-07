/**
 * OMEGA AI — Chess RPG Engine
 *
 * Architettura:
 *   1. Stockfish  → valutazione scacchistica (3s per mossa principale)
 *   2. RPG Eval   → materiale livellato + energia
 *   3. Fusione    → Tactic * 0.65 + Strategy * 0.35
 *
 * Flusso decisionale per turno:
 *   Evolvi? → Abilità? → Mossa Stockfish
 *
 * NOTA: evoluzioni + mosse normali avvengono in turni separati del motore React.
 * Il componente App triggera il motore due volte quando il bot evolve:
 *   1° trigger → OMEGA sceglie "evolve"  (cambia pd/pts ma non game)
 *   2° trigger → OMEGA sceglie la mossa  (game.turn() è ancora il bot)
 */

// ── STOCKFISH WORKER ──────────────────────────────────────────────────────────
let sfWorker = null, sfBusy = false;

(function initSF() {
  try {
    const blob = new Blob(
      [`importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js');`],
      { type: 'application/javascript' }
    );
    sfWorker = new Worker(URL.createObjectURL(blob));
    sfWorker.postMessage('setoption name Hash value 128');
    console.log('✅ Stockfish Omega loaded (Hash 128)');
  } catch (e) {
    console.warn('⚠️ Stockfish unavailable — greedy fallback active');
  }
})();

/**
 * sfEval — chiedi a Stockfish la mossa migliore + punteggio
 * @param {string} fen
 * @param {number} movetime  millisecondi di pensiero
 * @returns {Promise<{from,to,promotion,score}|null>}
 *   score è in pedoni, relativo a chi muove (positivo = buono per chi muove)
 */
function sfEval(fen, movetime) {
  if (!sfWorker || sfBusy) return Promise.resolve(null);
  sfBusy = true;

  return new Promise(resolve => {
    let lastScore = 0;

    const timeout = setTimeout(() => {
      sfBusy = false;
      sfWorker.removeEventListener('message', h);
      resolve(null);
    }, movetime + 2500);

    const h = e => {
      if (typeof e.data !== 'string') return;
      const msg = e.data;

      // Intercetta il punteggio corrente nella ricerca
      if (msg.includes('score cp')) {
        const m = msg.match(/score cp (-?\d+)/);
        if (m) lastScore = parseInt(m[1]) / 100;
      } else if (msg.includes('score mate')) {
        const m = msg.match(/score mate (-?\d+)/);
        if (m) lastScore = parseInt(m[1]) > 0 ? 200 : -200;
      }

      if (msg.startsWith('bestmove')) {
        clearTimeout(timeout);
        sfBusy = false;
        sfWorker.removeEventListener('message', h);
        const mv = msg.split(' ')[1];
        if (!mv || mv === '(none)') { resolve(null); return; }
        resolve({
          from: mv.slice(0, 2),
          to:   mv.slice(2, 4),
          promotion: mv[4] || null,
          score: lastScore
        });
      }
    };

    sfWorker.addEventListener('message', h);
    sfWorker.postMessage('ucinewgame');
    sfWorker.postMessage('position fen ' + fen);
    sfWorker.postMessage('go movetime ' + movetime);
  });
}

// ── RPG EVALUATION ────────────────────────────────────────────────────────────

const BASE_VALS   = { p: 1.0, n: 3.2, b: 3.3, r: 5.0, q: 9.0, k: 200 };
const PAWN_BONUS  = [0, 0, 0.6, 1.8]; // livello 1,2,3

/** Valore RPG di un pezzo in pedoni */
function rpgVal(type, level) {
  const base = BASE_VALS[type] || 0;
  return type === 'p' ? base + (PAWN_BONUS[level] || 0) : base;
}

/**
 * evalRpg — punteggio RPG dello stato corrente
 * Include materiale livellato + vantaggio energia
 * @returns {number} in pedoni, relativo a `color`
 */
function evalRpg(pd, pts, color) {
  const opp = color === 'w' ? 'b' : 'w';
  let score = 0;

  for (const d of Object.values(pd)) {
    if (!d) continue;
    const v = rpgVal(d.type, d.level);
    score += d.color === color ? v : -v;
  }

  // Ogni punto energia vale circa 0.35 pedoni
  score += (pts[color] - pts[opp]) * 0.35;
  return score;
}

// ── OMEGA AI ──────────────────────────────────────────────────────────────────
const OMEGA_AI = {

  // Pesi della fusione tattica/strategica
  WT: 0.65, // Tactic  (Stockfish)
  WS: 0.35, // Strategy (RPG)

  fuse(tactic, strategy) {
    return tactic * this.WT + strategy * this.WS;
  },

  // Trovare il miglior pedone da evolvere
  // Preferisce pedoni avanzati e già a livello 2 (più vicini al massimo)
  findEvoTarget(pd, sm, color) {
    let best = null, bs = -999;
    for (const [sq, id] of Object.entries(sm)) {
      const d = pd[id];
      if (!d || d.color !== color || d.type !== 'p' || d.level >= 3) continue;
      const rank = parseInt(sq[1]);
      const adv  = color === 'w' ? rank : (9 - rank); // 1–8, alto = avanzato
      const score = adv * 12 + d.level * 18;
      if (score > bs) { bs = score; best = { sq, id, d }; }
    }
    return best;
  },

  // Raccogliere tutte le mosse abilità che catturano pezzi, ordinate per valore
  collectAbilities(game, pd, sm, color) {
    const list = [];
    for (const [sq, id] of Object.entries(sm)) {
      const piece = game.get(sq);
      if (!piece || piece.color !== color) continue;
      const d = pd[id];
      const evo = EVOLUTIONS[piece.type]; // da evolutions.js
      if (!evo) continue;
      for (const ab of evo.getAbilityMoves(sq, game, d.level, color)) {
        const target = game.get(ab.to);
        if (!target) continue; // ignora mosse abilità senza cattura
        const tId  = sm[ab.to];
        const tLvl = tId ? (pd[tId]?.level || 1) : 1;
        const capV = rpgVal(target.type, tLvl);
        list.push({ from: ab.from, to: ab.to, capV, tId });
      }
    }
    return list.sort((a, b) => b.capV - a.capV);
  },

  // Simulare una mossa abilità → restituire nuovo game Chess
  simAbilityGame(game, from, to) {
    const piece = game.get(from);
    const g = new Chess(game.fen());
    g.remove(from);
    if (g.get(to)) g.remove(to);
    g.put(piece, to);
    const parts = g.fen().split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    const ng = new Chess();
    ng.load(parts.join(' '));
    return ng;
  },

  /**
   * chooseAction — cuore del motore
   *
   * Ritorna:
   *   { type:'move',    from, to, promotion }
   *   { type:'evolve',  sq }
   *   { type:'ability', from, to }
   */
  async chooseAction(game, pd, sm, pts, color) {

    // ── 1. Mossa Stockfish (3 secondi di pensiero) ────────────────────────────
    const sfResult = await sfEval(game.fen(), 3000);

    if (!sfResult) {
      // Stockfish non disponibile → greedy: cattura il pezzo più prezioso
      const legals = game.moves({ verbose: true });
      if (!legals.length) return null;
      const top = legals.reduce((b, m) => {
        const tId = sm[m.to];
        const v   = m.captured ? rpgVal(m.captured, pd[tId]?.level || 1) : 0;
        return v > b.v ? { m, v } : b;
      }, { m: legals[0], v: -1 });
      return { type: 'move', from: top.m.from, to: top.m.to };
    }

    // Punteggio base (nessuna evoluzione, nessuna abilità)
    const baseRpg   = evalRpg(pd, pts, color);
    const baseScore = this.fuse(sfResult.score, baseRpg);

    let best = {
      type: 'move',
      from: sfResult.from, to: sfResult.to, promotion: sfResult.promotion,
      score: baseScore,
      label: `SF(${sfResult.score.toFixed(2)}) RPG(${baseRpg.toFixed(2)}) = ${baseScore.toFixed(2)}`
    };

    // ── 2. Valuta evoluzione (GRATIS: non cambia il FEN, riusa lo score SF) ───
    if (pts[color] >= 2) {
      const evo = this.findEvoTarget(pd, sm, color);
      if (evo) {
        const { sq, id, d } = evo;
        // Stato RPG dopo l'evoluzione
        const pd2  = { ...pd, [id]: { ...d, level: d.level + 1 } };
        const pts2 = { ...pts, [color]: pts[color] - 2 };
        const evoRpg   = evalRpg(pd2, pts2, color);
        const evoScore = this.fuse(sfResult.score, evoRpg);

        // Evolvi solo se il guadagno RPG supera una soglia minima (evita rumore)
        if (evoScore > best.score + 0.08) {
          best = {
            type: 'evolve', sq,
            score: evoScore,
            label: `Evo ${sq} Lv${d.level + 1} = ${evoScore.toFixed(2)}`
          };
        }
      }
    }

    // ── 3. Valuta abilità (solo catture di valore ≥ alfiere = 3.3) ───────────
    const abilities  = this.collectAbilities(game, pd, sm, color);
    const worthwhile = abilities.filter(ab => ab.capV >= 3.0).slice(0, 3); // max 3 valutazioni

    for (const ab of worthwhile) {
      const simGame = this.simAbilityGame(game, ab.from, ab.to);

      // Dopo l'abilità muove l'avversario → il punteggio SF è dalla sua prospettiva → neghiamo
      const abSf     = await sfEval(simGame.fen(), 800);
      const abTactic = abSf ? -abSf.score : 0;

      const pd_ab    = { ...pd };
      if (ab.tId) delete pd_ab[ab.tId]; // rimuovi il pezzo catturato dalla stima
      const abRpg   = evalRpg(pd_ab, pts, color);
      const abScore = this.fuse(abTactic, abRpg);

      // Soglia più alta per le abilità: evita mosse rischiose/suicide
      if (abScore > best.score + 0.25) {
        best = {
          type: 'ability', from: ab.from, to: ab.to,
          score: abScore,
          label: `Ability ${ab.from}→${ab.to} cap(${ab.capV.toFixed(1)}) = ${abScore.toFixed(2)}`
        };
      }
    }

    console.log(`[OMEGA] ▶ ${best.label}`);
    return best;
  }
};