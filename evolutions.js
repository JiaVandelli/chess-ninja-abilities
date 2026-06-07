// evolutions.js - Chess RPG Evolutions
const EVOLUTIONS = {
  p: {
    levels: [
      { name: 'Soldato', color: '#64748b' },
      { name: 'Veterano', color: '#eab308' },
      { name: 'Campione', color: '#a855f7' },
    ],
    getAbilityMoves(sq, game, level, color) {
      const moves = [];
      const file = sq.charCodeAt(0) - 97;
      const rank = parseInt(sq[1]);

      // Lv2: passo indietro
      if (level >= 2) {
        const backRank = color === 'w'? rank - 1 : rank + 1;
        if (backRank >= 1 && backRank <= 8) {
          const toSq = sq[0] + backRank;
          if (!game.get(toSq)) moves.push({ from: sq, to: toSq, isCapture: false });
        }
      }

      // Lv3: si muove come Re
      if (level >= 3) {
        [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
       .forEach(([df, dr]) => {
          const nf = file + df, nr = rank + dr;
          if (nf < 0 || nf > 7 || nr < 1 || nr > 8) return;
          const toSq = String.fromCharCode(97 + nf) + nr;
          const target = game.get(toSq);
          if (target?.color === color) return;
          moves.push({ from: sq, to: toSq, isCapture:!!target });
        });
      }
      return moves;
    },
  },

  n: {
    levels: [
      {name:'Pony',color:'#64748b'},
      {name:'Destriero',color:'#eab308'},
      {name:'Nightmare',color:'#a855f7'}
    ],
    getAbilityMoves:()=>[]
  },

  b: {
    levels: [
      {name:'Alfiere',color:'#64748b'},
      {name:'Vescovo',color:'#eab308'},
      {name:'Arcivescovo',color:'#a855f7'}
    ],
    getAbilityMoves:()=>[]
  },

  r: {
    levels: [
      {name:'Torre',color:'#64748b'},
      {name:'Fortezza',color:'#eab308'},
      {name:'Castello',color:'#a855f7'}
    ],
    getAbilityMoves:()=>[]
  },

  q: {
    levels: [
      {name:'Regina',color:'#64748b'},
      {name:'Imperatrice',color:'#eab308'},
      {name:'Dea',color:'#a855f7'}
    ],
    getAbilityMoves:()=>[]
  },

  k: {
    levels: [
      {name:'Re',color:'#64748b'},
      {name:'Imperatore',color:'#eab308'},
      {name:'Dio',color:'#a855f7'}
    ],
    getAbilityMoves:()=>[]
  }
};