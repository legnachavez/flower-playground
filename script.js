const { Engine, Render, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events, Query } = Matter;

const FLOWER_FILES = [1, 2, 3, 4].map((n) => `flowers/flower-${n}.svg`);
const TEXTURE_SIZE = 128; // px width each SVG is pre-rendered to; drawing the raw SVG every frame is slow
const MAX_FLOWERS = 400; // oldest flowers are removed past this to keep the frame rate up
const WALL = 200; // wall thickness, thick enough that fast flowers don't tunnel through

const garden = document.getElementById('garden');
const hint = document.getElementById('hint');
const countEl = document.getElementById('count');
const swatches = document.querySelectorAll('.swatch');

let selected = 'random';
let textures = []; // { url, width, height } per flower
let flowers = [];
let walls = [];

// --- Flower picker ---

function selectSwatch(button) {
  swatches.forEach((s) => s.setAttribute('aria-checked', String(s === button)));
  selected = button.dataset.flower;
}

swatches.forEach((s) => s.addEventListener('click', () => selectSwatch(s)));
selectSwatch(swatches[0]);

function pickTexture() {
  if (selected === 'random') return textures[Math.floor(Math.random() * textures.length)];
  return textures[Number(selected) - 1];
}

// --- Physics world ---

const engine = Engine.create();
const render = Render.create({
  element: garden,
  engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    wireframes: false,
    background: 'transparent',
    pixelRatio: window.devicePixelRatio || 1,
  },
});

function buildWalls() {
  Composite.remove(engine.world, walls);
  const w = window.innerWidth;
  const h = window.innerHeight;
  const opts = { isStatic: true, render: { visible: false } };
  walls = [
    Bodies.rectangle(w / 2, h + WALL / 2, w + WALL * 2, WALL, opts), // ground
    Bodies.rectangle(-WALL / 2, h / 2 - h, WALL, h * 4, opts), // left, tall so flowers can't escape over it
    Bodies.rectangle(w + WALL / 2, h / 2 - h, WALL, h * 4, opts), // right
  ];
  Composite.add(engine.world, walls);
}

function addFlower(x, y, size = 40 + Math.random() * 50) {
  const tex = pickTexture();
  const scale = size / tex.width;
  const flower = Bodies.circle(x, y, size * 0.4, {
    restitution: 0.3,
    friction: 0.1,
    angle: Math.random() * Math.PI * 2,
    render: { sprite: { texture: tex.url, xScale: scale, yScale: scale } },
  });
  Composite.add(engine.world, flower);
  flowers.push(flower);

  if (flowers.length > MAX_FLOWERS) Composite.remove(engine.world, flowers.shift());
  countEl.textContent = flowers.length;
  hint.classList.add('hidden');
}

// Drop a loose grid of flowers from above the screen, like the stress demo's stack.
function dropBatch(n = 60) {
  const w = window.innerWidth;
  const cols = Math.max(4, Math.floor(w / 70));
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col + 0.5) * (w / cols) + (Math.random() - 0.5) * 20;
    addFlower(x, -80 - row * 80);
  }
}

function shake() {
  flowers.forEach((f) => {
    Body.setVelocity(f, { x: (Math.random() - 0.5) * 20, y: -10 - Math.random() * 15 });
    Body.setAngularVelocity(f, (Math.random() - 0.5) * 0.5);
  });
}

function clear() {
  Composite.remove(engine.world, flowers);
  flowers = [];
  countEl.textContent = 0;
  hint.classList.remove('hidden');
}

// --- Mouse: drag and fling flowers, click empty space to plant one ---

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: { stiffness: 0.2, render: { visible: false } },
});
Composite.add(engine.world, mouseConstraint);
render.mouse = mouse;

// Matter grabs the scroll wheel by default; give it back to the page.
mouse.element.removeEventListener('wheel', mouse.mousewheel);
mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);

Events.on(mouseConstraint, 'mousedown', ({ mouse: m }) => {
  if (Query.point(flowers, m.position).length === 0) addFlower(m.position.x, m.position.y);
});

// --- Resize ---

window.addEventListener('resize', () => {
  Render.setSize(render, window.innerWidth, window.innerHeight);
  buildWalls();
});

// --- Buttons ---

document.getElementById('drop').addEventListener('click', () => dropBatch());
document.getElementById('shake').addEventListener('click', shake);
document.getElementById('clear').addEventListener('click', clear);

// --- Start: pre-render each SVG to a small PNG texture, then run ---

function rasterize(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = TEXTURE_SIZE;
      const height = Math.round(TEXTURE_SIZE * (img.naturalHeight / img.naturalWidth));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve({ url: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = reject;
    img.src = src;
  });
}

Promise.all(FLOWER_FILES.map(rasterize)).then((loaded) => {
  textures = loaded;
  buildWalls();
  Render.run(render);
  Runner.run(Runner.create(), engine);
  dropBatch();
});
