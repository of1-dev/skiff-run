import fs from 'fs';

async function test() {
  const content = fs.readFileSync('game.js', 'utf-8');
  // I can't just run game.js because it expects the DOM.
}
