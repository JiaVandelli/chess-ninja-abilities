// evolutions.js — Aggiungi qui le evoluzioni dei pezzi senza toccare il codice principale
const EVOLUTIONS = {
  p: {
    levels: [
      { name: 'Soldato', color: '#64748b', icons: { w: '♙', b: '♟' } },
      { name: 'Veterano', color: '#eab308', icons: { w: '⛨', b: '⛨' } },
      { name: 'Campione', color: '#a855f7', icons: { w: '⚔', b: '⚔' } },
    ],
    getAbilityMoves(sq, game, level, color) {
      const moves = [];
      const file = sq.charCodeAt(0) - 97;
      const rank = parseInt(sq[1]);

      // Livello 2: Passo indietro
      if (level >= 2) {
        const backRank = color === 'w' ? rank - 1 : rank + 1;
        if (backRank >= 1 && backRank <= 8) {
          const toSq = sq[0] + backRank;
          if (!game.get(toSq)) moves.push({ from: sq, to: toSq, isCapture: false });
        }
      }
      // Livello 3: Movimento omnidirezionale da Re
      if (level >= 3) {
        [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dc, dr]) => {
          const nf = file + dc, nr = rank + dr;
          if (nf < 0 || nf > 7 || nr < 1 || nr > 8) return;
          const toSq = String.fromCharCode(97 + nf) + nr;
          const target = game.get(toSq);
          if (target?.color === color) return;
          moves.push({ from: sq, to: toSq, isCapture: !!target });
        });
      }
      return moves;
    },
  },
  /* Puoi espandere il gioco qui in futuro:
  r: { levels: [...], getAbilityMoves(...) }, 
  */
};
