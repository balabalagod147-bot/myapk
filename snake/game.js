const GRID_SIZE = 14;
const INITIAL_DIRECTION = 'RIGHT';
const TICK_MS = 160;

const DIRECTION_VECTORS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTIONS = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

function createInitialSnake() {
  return [
    { x: 2, y: 7 },
    { x: 1, y: 7 },
    { x: 0, y: 7 },
  ];
}

function toKey(position) {
  return `${position.x},${position.y}`;
}

function isInsideGrid(position, gridSize = GRID_SIZE) {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < gridSize &&
    position.y < gridSize
  );
}

function getNextHead(head, direction) {
  const vector = DIRECTION_VECTORS[direction];
  return { x: head.x + vector.x, y: head.y + vector.y };
}

function isSamePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function sanitizeDirection(nextDirection, currentDirection) {
  if (!nextDirection) return currentDirection;
  if (OPPOSITE_DIRECTIONS[currentDirection] === nextDirection) {
    return currentDirection;
  }
  return nextDirection;
}

function getAvailableCells(snake, gridSize = GRID_SIZE) {
  const occupied = new Set(snake.map(toKey));
  const cells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const cell = { x, y };
      if (!occupied.has(toKey(cell))) {
        cells.push(cell);
      }
    }
  }

  return cells;
}

function placeFood(snake, gridSize = GRID_SIZE, random = Math.random) {
  const availableCells = getAvailableCells(snake, gridSize);
  if (availableCells.length === 0) {
    return null;
  }

  const index = Math.floor(random() * availableCells.length);
  return availableCells[index];
}

function createGameState(random = Math.random) {
  const snake = createInitialSnake();
  return {
    gridSize: GRID_SIZE,
    snake,
    direction: INITIAL_DIRECTION,
    queuedDirection: INITIAL_DIRECTION,
    food: placeFood(snake, GRID_SIZE, random),
    score: 0,
    isRunning: false,
    isGameOver: false,
  };
}

function advanceGame(state, random = Math.random) {
  if (state.isGameOver) {
    return state;
  }

  const direction = sanitizeDirection(state.queuedDirection, state.direction);
  const nextHead = getNextHead(state.snake[0], direction);
  const willEat = state.food && isSamePosition(nextHead, state.food);
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);

  const hitsWall = !isInsideGrid(nextHead, state.gridSize);
  const hitsSelf = bodyToCheck.some((segment) => isSamePosition(segment, nextHead));

  if (hitsWall || hitsSelf) {
    return {
      ...state,
      direction,
      queuedDirection: direction,
      isRunning: false,
      isGameOver: true,
    };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!willEat) {
    nextSnake.pop();
  }

  const nextScore = willEat ? state.score + 1 : state.score;
  const nextFood = willEat ? placeFood(nextSnake, state.gridSize, random) : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction,
    queuedDirection: direction,
    food: nextFood,
    score: nextScore,
    isRunning: nextFood !== null,
    isGameOver: nextFood === null,
  };
}

function runLogicTests() {
  const tests = [];
  const assert = (condition, name) => tests.push({ name, passed: Boolean(condition) });

  assert(sanitizeDirection('LEFT', 'RIGHT') === 'RIGHT', 'reject reverse direction');
  assert(sanitizeDirection('UP', 'RIGHT') === 'UP', 'accept perpendicular direction');

  const moved = advanceGame({
    gridSize: 5,
    snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
    direction: 'RIGHT',
    queuedDirection: 'RIGHT',
    food: { x: 4, y: 4 },
    score: 0,
    isRunning: true,
    isGameOver: false,
  }, () => 0);
  assert(isSamePosition(moved.snake[0], { x: 3, y: 2 }), 'move head forward');
  assert(moved.snake.length === 3, 'keep length without food');

  const grown = advanceGame({
    gridSize: 5,
    snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
    direction: 'RIGHT',
    queuedDirection: 'RIGHT',
    food: { x: 3, y: 2 },
    score: 0,
    isRunning: true,
    isGameOver: false,
  }, () => 0);
  assert(grown.snake.length === 4, 'grow after eating food');
  assert(grown.score === 1, 'increment score after eating food');

  const wallCollision = advanceGame({
    gridSize: 5,
    snake: [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }],
    direction: 'RIGHT',
    queuedDirection: 'RIGHT',
    food: { x: 0, y: 0 },
    score: 0,
    isRunning: true,
    isGameOver: false,
  }, () => 0);
  assert(wallCollision.isGameOver === true, 'detect wall collision');

  const selfCollision = advanceGame({
    gridSize: 5,
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    direction: 'UP',
    queuedDirection: 'LEFT',
    food: { x: 4, y: 4 },
    score: 0,
    isRunning: true,
    isGameOver: false,
  }, () => 0);
  assert(selfCollision.isGameOver === true, 'detect self collision');

  const placedFood = placeFood([{ x: 0, y: 0 }], 2, () => 0.99);
  assert(isSamePosition(placedFood, { x: 1, y: 1 }), 'place food on free cell');

  const failed = tests.filter((test) => !test.passed);
  if (failed.length > 0) {
    console.error('Snake logic tests failed:', failed);
  }
}

runLogicTests();

const boardElement = document.getElementById('board');
const scoreElement = document.getElementById('score');
const statusElement = document.getElementById('status');
const messageElement = document.getElementById('message');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const restartButton = document.getElementById('restart-button');
const controlButtons = document.querySelectorAll('[data-direction]');

let state = createGameState();
let timerId = null;

function setMessage(text) {
  messageElement.textContent = text;
}

function render() {
  boardElement.innerHTML = '';

  const snakeKeys = new Set(state.snake.map(toKey));
  const headKey = toKey(state.snake[0]);
  const foodKey = state.food ? toKey(state.food) : null;

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const cell = document.createElement('div');
      const key = `${x},${y}`;
      cell.className = 'cell';

      if (snakeKeys.has(key)) {
        cell.classList.add('cell--snake');
      }
      if (key === headKey) {
        cell.classList.add('cell--head');
      }
      if (foodKey && key === foodKey) {
        cell.classList.add('cell--food');
      }

      boardElement.appendChild(cell);
    }
  }

  scoreElement.textContent = String(state.score);

  if (state.isGameOver) {
    statusElement.textContent = 'Game over';
    setMessage(state.food === null ? 'You win. The board is full.' : 'Game over. Press Restart to play again.');
  } else if (state.isRunning) {
    statusElement.textContent = 'Running';
    setMessage('Use arrow keys or WASD to steer the snake.');
  } else {
    statusElement.textContent = 'Paused';
    setMessage('Press Start to begin or continue.');
  }
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function tick() {
  state = advanceGame(state);
  if (state.isGameOver) {
    stopTimer();
  }
  render();
}

function startGame() {
  if (state.isGameOver || state.isRunning) {
    return;
  }
  state = { ...state, isRunning: true };
  stopTimer();
  timerId = window.setInterval(tick, TICK_MS);
  render();
}

function pauseGame() {
  if (!state.isRunning || state.isGameOver) {
    return;
  }
  state = { ...state, isRunning: false };
  stopTimer();
  render();
}

function restartGame() {
  stopTimer();
  state = createGameState();
  render();
}

function setDirection(direction) {
  if (!DIRECTION_VECTORS[direction] || state.isGameOver) {
    return;
  }

  const nextDirection = sanitizeDirection(direction, state.direction);
  state = { ...state, queuedDirection: nextDirection };

  if (!state.isRunning) {
    startGame();
  }
}

function handleKeydown(event) {
  const keyMap = {
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    w: 'UP',
    W: 'UP',
    s: 'DOWN',
    S: 'DOWN',
    a: 'LEFT',
    A: 'LEFT',
    d: 'RIGHT',
    D: 'RIGHT',
  };

  const direction = keyMap[event.key];
  if (direction) {
    event.preventDefault();
    setDirection(direction);
    return;
  }

  if (event.key === ' ') {
    event.preventDefault();
    if (state.isRunning) {
      pauseGame();
    } else if (!state.isGameOver) {
      startGame();
    }
  }
}

startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);
restartButton.addEventListener('click', restartGame);
window.addEventListener('keydown', handleKeydown);
controlButtons.forEach((button) => {
  button.addEventListener('click', () => setDirection(button.dataset.direction));
});

render();

export {
  GRID_SIZE,
  createGameState,
  advanceGame,
  placeFood,
  sanitizeDirection,
  isInsideGrid,
};
