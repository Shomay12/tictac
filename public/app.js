const socket = io();
const $ = (s) => document.querySelector(s);

const lobby = $('#lobby');
const hud = $('#hud');
const game = $('#game');
const boardEl = $('#board');
const statusEl = $('#status');
const nextBtn = $('#nextBtn');
let me = null;

const cells = Array.from({ length: 9 }, (_, i) => {
  const d = document.createElement('div');
  d.className = 'cell';
  d.dataset.i = i;
  d.onclick = () => socket.emit('makeMove', i);
  boardEl.appendChild(d);
  return d;
});

$('#joinBtn').onclick = () => {
  const nickname = $('#nickname').value.trim() || 'Player';
  const roomId = $('#room').value.trim() || 'arena';
  socket.emit('joinRoom', { nickname, roomId });
};

nextBtn.onclick = () => socket.emit('nextRound');

socket.on('youAre', ({ symbol, roomId }) => {
  me = symbol;
  $('#you').textContent = symbol;
  $('#roomLabel').textContent = roomId;
  lobby.classList.add('hidden');
  hud.classList.remove('hidden');
  game.classList.remove('hidden');
});

socket.on('roomFull', () => alert('Room full. Try another room code.'));

socket.on('state', (s) => {
  const xName = s.players.X?.nickname || 'Waiting...';
  const oName = s.players.O?.nickname || 'Waiting...';
  $('#sx').textContent = s.score.X;
  $('#so').textContent = s.score.O;
  $('#turn').textContent = `${s.turn} (${s.turn === 'X' ? xName : oName})`;

  cells.forEach((c, i) => {
    c.className = 'cell';
    c.textContent = s.board[i] || '';
    if (s.board[i] === 'X') c.classList.add('x');
    if (s.board[i] === 'O') c.classList.add('o');
  });

  if (!s.players.X || !s.players.O) {
    statusEl.textContent = 'Waiting for second player...';
    nextBtn.classList.add('hidden');
    return;
  }

  if (!s.winner) {
    statusEl.textContent = me === s.turn ? 'Your move.' : 'Opponent turn...';
    nextBtn.classList.add('hidden');
  } else if (s.winner.symbol === 'DRAW') {
    statusEl.textContent = 'Draw!';
    nextBtn.classList.remove('hidden');
  } else {
    s.winner.line.forEach(i => cells[i].classList.add('win'));
    statusEl.textContent = s.winner.symbol === me ? 'You win! 🔥' : 'You lost this round.';
    nextBtn.classList.remove('hidden');
  }
});

const canvas = document.getElementById('fx');
const ctx = canvas.getContext('2d');
let dots = [];
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
addEventListener('resize', resize); resize();
for(let i=0;i<90;i++) dots.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.8+0.5});
function tick(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const p of dots){
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0||p.x>canvas.width) p.vx*=-1;
    if(p.y<0||p.y>canvas.height) p.vy*=-1;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='rgba(120,170,255,.45)'; ctx.fill();
  }
  requestAnimationFrame(tick);
}
tick();
