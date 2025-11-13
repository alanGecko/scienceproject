//yay brain pain
const canvas = document.getElementById('sim');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Simulation parameters
const G = 0.5;
const softening = 5;
const baseDt = 1/120;  // base physics timestep
let speedMultiplier = 1;
const SUBSTEPS = 5;    // substeps

// Body array
let bodies = [];
function resetBodies() {
  const m1 = parseFloat(document.getElementById('mass1').value);
  const m2 = parseFloat(document.getElementById('mass2').value);

  // Positions
  const x1 = canvas.width/2 - 150;
  const y1 = canvas.height/2;
  const x2 = canvas.width/2 + 150;
  const y2 = canvas.height/2;

  //  velocities
  const dx = x2 - x1;
  const dy = y2 - y1;
  const r = Math.sqrt(dx*dx + dy*dy);
  const v = Math.sqrt(G*(m1+m2)/r);

  bodies = [
    { x:x1, y:y1, vx:0, vy: v*m2/(m1+m2), mass:m1, color:'cyan', radius: Math.cbrt(m1)*2 },
    { x:x2, y:y2, vx:0, vy:-v*m1/(m1+m2), mass:m2, color:'orange', radius: Math.cbrt(m2)*2 }
  ];
}
resetBodies();

// Reset button
document.getElementById('resetBtn').addEventListener('click', resetBodies);

// Speed control
document.getElementById('speed').addEventListener('input', e => {
  speedMultiplier = parseFloat(e.target.value);
});

// acceleration by other bodies
function computeAcceleration(b, others) {
  let ax = 0, ay = 0, totalForce = 0;
  for (let other of others) {
    if (other === b) continue;
    const dx = other.x - b.x;
    const dy = other.y - b.y;
    const dist2 = dx * dx + dy * dy + softening * softening;
    const dist = Math.sqrt(dist2);
    const force = G * b.mass * other.mass / dist2;
    ax += (force / b.mass) * (dx / dist);
    ay += (force / b.mass) * (dy / dist);
    totalForce += force; // accumulate total magnitude
  }
  return { ax, ay, totalForce };
}


// Symplectic Euler step
let lastForce = 0;

function step(dt) {
  const accs = bodies.map(b => computeAcceleration(b, bodies));
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += accs[i].ax * dt;
    bodies[i].vy += accs[i].ay * dt;
    bodies[i].x += bodies[i].vx * dt;
    bodies[i].y += bodies[i].vy * dt;
  }
  if (bodies.length === 2) lastForce = accs[0].totalForce;
  handleCollisions();
}


// collision detect & merge
function handleCollisions() {
  if (bodies.length < 2) return;
  const b1 = bodies[0], b2 = bodies[1];
  const dx = b2.x - b1.x, dy = b2.y - b1.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < b1.radius + b2.radius) {
    const totalMass = b1.mass + b2.mass;
    const vx = (b1.vx*b1.mass + b2.vx*b2.mass)/totalMass;
    const vy = (b1.vy*b1.mass + b2.vy*b2.mass)/totalMass;
    const x = (b1.x*b1.mass + b2.x*b2.mass)/totalMass;
    const y = (b1.y*b1.mass + b2.y*b2.mass)/totalMass;
    bodies = [{ x, y, vx, vy, mass: totalMass, color:'lime', radius: Math.cbrt(totalMass)*2 }];
  }
}

// Energy calculation I'm insane lol
function computeEnergy() {
  let T=0, U=0;
  for (let i=0;i<bodies.length;i++) {
    const b = bodies[i];
    T += 0.5*b.mass*(b.vx*b.vx + b.vy*b.vy);
    for (let j=i+1;j<bodies.length;j++) {
      const other = bodies[j];
      const dx = other.x - b.x, dy = other.y - b.y;
      const r = Math.sqrt(dx*dx + dy*dy + softening*softening);
      U += -G*b.mass*other.mass/r;
    }
  }
  return {T,U,E:T+U};
}

// Draw
function draw() {
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Center of mass
  const totalMass = bodies.reduce((sum,b)=>sum+b.mass,0);
  const cmX = bodies.reduce((sum,b)=>sum+b.x*b.mass,0)/totalMass;
  const cmY = bodies.reduce((sum,b)=>sum+b.y*b.mass,0)/totalMass;
  ctx.beginPath();
  ctx.arc(cmX, cmY, 5, 0, Math.PI*2);

  for (let b of bodies) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
    ctx.fillStyle = b.color;
    ctx.fill();

    // Velocity vector
    ctx.beginPath();
    ctx.moveTo(b.x,b.y);
    ctx.lineTo(b.x+b.vx*10, b.y+b.vy*10);
    ctx.strokeStyle = 'yellow';
    ctx.stroke();
  }
}

// Main loop
function loop() {
  // Update masses 
  if (bodies.length===2) {
    bodies[0].mass = parseFloat(document.getElementById('mass1').value);
    bodies[0].radius = Math.cbrt(bodies[0].mass)*2;
    bodies[1].mass = parseFloat(document.getElementById('mass2').value);
    bodies[1].radius = Math.cbrt(bodies[1].mass)*2;
  }

  const dtStep = baseDt * speedMultiplier;
  for (let i=0;i<SUBSTEPS;i++) step(dtStep/SUBSTEPS);

  draw();

  const energies = computeEnergy();
  document.getElementById('energyDisplay').innerText =
    `Force: ${lastForce.toFixed(2)} N`;

      

    requestAnimationFrame(loop);
}

loop();
