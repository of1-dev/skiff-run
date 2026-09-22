import fs from 'fs';

const gameCode = fs.readFileSync('game.js', 'utf-8');

// I can't easily simulate game.js without a DOM, but I can look at the bug.
