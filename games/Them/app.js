const canvas = document.getElementById('gameCanvas');
const uiMode = document.getElementById('mode-display');
const uiHealth = document.getElementById('health-bar');
const uiEMP = document.getElementById('emp-display');
const uiGameOver = document.getElementById('game-over');
const btnRestart = document.getElementById('restart-btn');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const uiLevel = document.getElementById('level-display');
const uiProgress = document.getElementById('progress-display');
const uiLevelUpBanner = document.getElementById('level-up-banner');

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth < 768);

// Mobile touch input state
const mobileInput = {
    leftStick: { active: false, touchId: null, centerX: 0, centerY: 0, dx: 0, dy: 0 },
    rightStick: { active: false, touchId: null, centerX: 0, centerY: 0, dx: 0, dy: 0 }
};

// --- THREE.JS SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2ebe1); // bright cream
scene.fog = new THREE.Fog(0xf2ebe1, 300, 1500);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
// We will look down at an angle
camera.position.set(0, 400, 300);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isMobile });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

if (!isMobile) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} else {
    renderer.shadowMap.enabled = false;
}

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 500, 200);

if (!isMobile) {
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -1000;
    dirLight.shadow.camera.right = 1000;
    dirLight.shadow.camera.top = 1000;
    dirLight.shadow.camera.bottom = -1000;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 2000;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
}
scene.add(dirLight);

function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

// Input Handling
const keys = {};
const mouse = { x: 0, y: 0, down: false };

// Psychedelic Effects State
let effectFloorFlash = false;
let effectRubberBuildings = false;
let effectFilmNoir = false;
let effectCamZoom = false;
let effectFractals = false;
let effectFloorScroll = false;
let effectTronMode = false;
let effectScreenShake = false;
let effectTimeDilation = false;
let effectCameraRoll = false;
let camDistance = 400;
let timeScale = 1.0;

const uiEffectsHUD = document.getElementById('effects-hud');

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    
    // Toggle visual effects
    if (e.code === 'Digit1') toggleEffect(1);
    if (e.code === 'Digit2') toggleEffect(2);
    if (e.code === 'Digit3') toggleEffect(3);
    if (e.code === 'Digit4') toggleEffect(4);
    if (e.code === 'Digit5') toggleEffect(5);
    if (e.code === 'Digit6') toggleEffect(6);
    if (e.code === 'Digit7') toggleEffect(7);
    if (e.code === 'Digit8') toggleEffect(8);
    if (e.code === 'Digit9') toggleEffect(9);
    if (e.code === 'Digit0') toggleEffect(10);
});
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => mouse.down = true);
window.addEventListener('mouseup', e => mouse.down = false);

// Gamepad State
let gpState = { axes: [0,0,0,0], buttons: [] };
let lastGpButtons = [];

function updateGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) { gp = gamepads[i]; break; }
    }
    if (gp) {
        gpState.axes = gp.axes;
        lastGpButtons = [...gpState.buttons];
        gpState.buttons = gp.buttons.map(b => b.pressed);
    } else {
        gpState.axes = [0,0,0,0];
        lastGpButtons = [];
        gpState.buttons = [];
    }
}
function justPressed(btnIdx) { return gpState.buttons[btnIdx] && !lastGpButtons[btnIdx]; }

// Game Settings
const WORLD_W = 3000;
const WORLD_H = 3000;

// Ground Plane
function generateFloorTexture(isGrayscale = false) {
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 1024;
    tCanvas.height = 1024;
    const tCtx = tCanvas.getContext('2d');
    
    tCtx.fillStyle = '#f2ebe1'; // Cream base
    tCtx.fillRect(0, 0, 1024, 1024);
    
    const cols = 20; 
    const colW = 1024 / cols;
    const paletteColors = ['#f2ebe1', '#52d1dc', '#f5af3d', '#ff3356'];
    
    for(let i=0; i<cols; i++) {
        if (isGrayscale) {
            tCtx.fillStyle = `hsl(0, 0%, ${90 - (i % 2) * 5}%)`;
        } else {
            tCtx.fillStyle = paletteColors[i % paletteColors.length];
        }
        tCtx.fillRect(i * colW, 0, colW, 1024);
    }
    
    tCtx.globalCompositeOperation = 'multiply';
    const rows = 15; 
    const rowH = 1024 / rows;
    for(let i=0; i<rows; i++) {
        if (isGrayscale) {
            tCtx.fillStyle = `hsl(0, 0%, ${90 - (i % 2) * 5}%)`;
        } else {
            tCtx.fillStyle = paletteColors[(i + 2) % paletteColors.length];
        }
        tCtx.fillRect(0, i * rowH, 1024, rowH);
    }
    
    tCtx.globalCompositeOperation = 'source-over';
    
    // Draw subtle grid lines on top
    tCtx.strokeStyle = isGrayscale ? 'rgba(0, 0, 0, 0.05)' : 'rgba(42, 50, 51, 0.15)';
    tCtx.lineWidth = 4;
    for(let i=0; i<=cols; i++) {
        tCtx.beginPath();
        tCtx.moveTo(i * colW, 0);
        tCtx.lineTo(i * colW, 1024);
        tCtx.stroke();
    }
    for(let i=0; i<=rows; i++) {
        tCtx.beginPath();
        tCtx.moveTo(0, i * rowH);
        tCtx.lineTo(1024, i * rowH);
        tCtx.stroke();
    }
    
    const tex = new THREE.CanvasTexture(tCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function generateUnionJackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#012169'; 
    ctx.fillRect(0, 0, 256, 128);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 24;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(256, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(256, 0); ctx.stroke();
    
    ctx.strokeStyle = '#C8102E';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(256, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(256, 0); ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(104, 0, 48, 128);
    ctx.fillRect(0, 40, 256, 48);
    
    ctx.fillStyle = '#C8102E';
    ctx.fillRect(112, 0, 32, 128);
    ctx.fillRect(0, 48, 256, 32);
    
    return new THREE.CanvasTexture(canvas);
}

let boundaryLightningMesh; // InstancedMesh for thick boundary lightning

// Reusable math objects for performance (avoids GC allocations)
const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();
const _zAxis = new THREE.Vector3(0, 0, 1);

const groundGeo = new THREE.PlaneGeometry(WORLD_W, WORLD_H);
const colorFloorTexture = generateFloorTexture(false);
const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: colorFloorTexture, roughness: 0.9, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set(WORLD_W/2, 0, WORLD_H/2);
ground.receiveShadow = true;
scene.add(ground);

// Grid Helper for that retro feel
const gridHelper = new THREE.GridHelper(WORLD_W, 60, 0x334155, 0x1e293b);
gridHelper.position.set(WORLD_W/2, 1, WORLD_H/2);
scene.add(gridHelper);

// Common Materials
const matMech = new THREE.MeshStandardMaterial({ color: 0x2a3233, metalness: 0.6, roughness: 0.4 });
const matMechAccent = new THREE.MeshStandardMaterial({ color: 0xff3356, emissive: 0xff3356, emissiveIntensity: 0.5 });
const matFoot = new THREE.MeshStandardMaterial({ color: 0x52d1dc });
const matDog = new THREE.MeshStandardMaterial({ color: 0xf5af3d });
const matEnemy = new THREE.MeshStandardMaterial({ color: 0x2a3233, metalness: 0.5, roughness: 0.5 });
const matEnemyEye = new THREE.MeshStandardMaterial({ color: 0x52d1dc, emissive: 0x52d1dc, emissiveIntensity: 0.8 });
const matAntBody = new THREE.MeshStandardMaterial({ color: 0x2a3233, metalness: 0.8, roughness: 0.25 });
const tronCyan = new THREE.Color(0x52d1dc);
const tronPink = new THREE.Color(0xff3356);
function generateBuildingTexture() {
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 256;
    tCanvas.height = 256;
    const tCtx = tCanvas.getContext('2d');
    
    tCtx.fillStyle = '#f2ebe1'; // Cream base
    tCtx.fillRect(0, 0, 256, 256);
    
    // Optical illusion: dense concentric squares in dark charcoal
    tCtx.strokeStyle = '#2a3233';
    tCtx.lineWidth = 4;
    for(let i=4; i<128; i+=8) {
        tCtx.strokeRect(i, i, 256-i*2, 256-i*2);
    }

    const tex = new THREE.CanvasTexture(tCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter; // keeps it blocky/crisp
    return tex;
}

function generateStoneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base cyan volcanic rock color (matching the 0x52d1dc cyan color scheme)
    ctx.fillStyle = '#40a5b0'; 
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw multiple noise passes to get speckled tuff stone texture
    // Pass 1: Dark cyan speckles
    ctx.fillStyle = '#1e5b63';
    for (let i = 0; i < 4000; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        let size = Math.random() * 2 + 1;
        ctx.fillRect(x, y, size, size);
    }
    
    // Pass 2: Light cyan speckles
    ctx.fillStyle = '#83e2ed';
    for (let i = 0; i < 3000; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        let size = Math.random() * 2 + 1;
        ctx.fillRect(x, y, size, size);
    }
    
    // Pass 3: Fine dark pores
    ctx.fillStyle = '#10363b';
    for (let i = 0; i < 1500; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        let size = Math.random() * 1.5;
        ctx.fillRect(x, y, size, size);
    }

    // Pass 4: Larger organic weathered color patches
    for (let i = 0; i < 40; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        let radius = Math.random() * 30 + 10;
        let grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const color = Math.random() > 0.5 ? 'rgba(40, 160, 170, 0.25)' : 'rgba(20, 80, 85, 0.25)';
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

const buildingTexture = generateBuildingTexture();
const stoneTexture = generateStoneTexture();
const matMoai = new THREE.MeshStandardMaterial({
    map: stoneTexture,
    bumpMap: stoneTexture,
    bumpScale: 1.5,
    roughness: 0.95,
    metalness: 0.05
});
const buildingPalette = [0x52d1dc, 0xf5af3d, 0xff3356, 0xf2ebe1, 0x2a3233]; // Harmonious bright palette
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const coneGeo = new THREE.ConeGeometry(1, 1, 3);
const matCollectable = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.2 });
const matParachute = new THREE.MeshStandardMaterial({ map: generateUnionJackTexture(), side: THREE.DoubleSide });

function toggleEffect(id) {
    if (id === 1) {
        effectFloorFlash = !effectFloorFlash;
        if (!effectFloorFlash) groundMat.color.setHex(0xffffff); // Reset
    } else if (id === 2) {
        effectRubberBuildings = !effectRubberBuildings;
        if (!effectRubberBuildings) {
            // Reset building scale, position, rotation
            buildings.forEach(b => {
                b.mesh.scale.set(b.w, b.height, b.h);
                b.mesh.position.y = b.height / 2;
                b.mesh.rotation.set(0, 0, 0);
                
                b.line.scale.set(b.w, b.height, b.h);
                b.line.position.y = b.height / 2;
                b.line.rotation.set(0, 0, 0);
            });
        }
    } else if (id === 3) {
        effectFilmNoir = !effectFilmNoir;
        const overlay = document.getElementById('grain-overlay');
        if (effectFilmNoir) {
            canvas.classList.add('film-noir');
            overlay.classList.add('active');
        } else {
            canvas.classList.remove('film-noir');
            overlay.classList.remove('active');
        }
    } else if (id === 4) {
        effectCamZoom = !effectCamZoom;
    } else if (id === 5) {
        effectFractals = !effectFractals;
        if (!effectFractals) {
            // Restore default optical illusion building texture
            const canvasTex = buildingTexture.image;
            if (canvasTex) {
                const ctx = canvasTex.getContext('2d');
                ctx.fillStyle = '#f2ebe1';
                ctx.fillRect(0, 0, 256, 256);
                ctx.strokeStyle = '#2a3233';
                ctx.lineWidth = 4;
                for(let i=4; i<128; i+=8) {
                    ctx.strokeRect(i, i, 256-i*2, 256-i*2);
                }
                buildingTexture.needsUpdate = true;
            }
        }
    } else if (id === 6) {
        effectFloorScroll = !effectFloorScroll;
        if (!effectFloorScroll) {
            floorTexture.offset.set(0, 0);
        }
    } else if (id === 7) {
        effectTronMode = !effectTronMode;
        buildings.forEach(b => {
            b.mesh.visible = !effectTronMode;
            if (!effectTronMode) {
                b.line.material.color.setHex(0x2a3233); // Reset color to dark charcoal
            }
        });
    } else if (id === 8) {
        effectScreenShake = !effectScreenShake;
    } else if (id === 9) {
        effectTimeDilation = !effectTimeDilation;
        timeScale = effectTimeDilation ? 0.20 : 1.0;
    } else if (id === 10) {
        effectCameraRoll = !effectCameraRoll;
        if (!effectCameraRoll) {
            camera.up.set(0, 1, 0);
        }
    }
    updateEffectsHUD();
}

function updateEffectsHUD() {
    if (!uiEffectsHUD) return;
    let html = '';
    if (effectFloorFlash) html += '<div style="text-shadow: 0 0 8px #ff3356;">✦ (1) STROBE FLOOR ON</div>';
    if (effectRubberBuildings) html += '<div style="text-shadow: 0 0 8px #ff3356;">✦ (2) RUBBER CITY ON</div>';
    if (effectFilmNoir) html += '<div style="text-shadow: 0 0 8px #ff3356;">✦ (3) FILM NOIR ON</div>';
    if (effectCamZoom) html += '<div style="text-shadow: 0 0 8px #ff3356;">✦ (4) BREATHING CAMERA ON</div>';
    if (effectFractals) html += '<div style="text-shadow: 0 0 8px #ff3356;">✦ (5) FRACTAL WALLS ON</div>';
    if (effectFloorScroll) html += '<div style="text-shadow: 0 0 8px #06b6d4;">✦ (6) HYPERSPACE FLOOR ON</div>';
    if (effectTronMode) html += '<div style="text-shadow: 0 0 8px #06b6d4;">✦ (7) TRON WIREFRAME ON</div>';
    if (effectScreenShake) html += '<div style="text-shadow: 0 0 8px #06b6d4;">✦ (8) EARTHQUAKE SHAKE ON</div>';
    if (effectTimeDilation) html += '<div style="text-shadow: 0 0 8px #06b6d4;">✦ (9) BULLET TIME ON</div>';
    if (effectCameraRoll) html += '<div style="text-shadow: 0 0 8px #06b6d4;">✦ (0) DIZZY CAMERA ROLL ON</div>';
    uiEffectsHUD.innerHTML = html;
}

let fractalTime = 0;
function animateFractalTexture() {
    fractalTime += 0.04;
    const canvasTex = buildingTexture.image;
    if (!canvasTex) return;
    const ctx = canvasTex.getContext('2d');
    const w = canvasTex.width;
    const h = canvasTex.height;
    
    // Recursive rotating square fractal in neon red/pink
    ctx.fillStyle = '#f2ebe1';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff3356';
    ctx.lineWidth = 5;
    
    ctx.save();
    ctx.translate(w/2, h/2);
    const depth = 8;
    for (let i = 0; i < depth; i++) {
        ctx.rotate(fractalTime * 0.15 + i * 0.1);
        let scale = 0.76 + 0.06 * Math.sin(fractalTime * 0.4 + i);
        ctx.scale(scale, scale);
        ctx.strokeRect(-w/2, -h/2, w, h);
    }
    ctx.restore();
    buildingTexture.needsUpdate = true;
}

function checkBuildingCollision(x, y, radius) {
    for(let b of buildings) {
        if (x + radius > b.x && x - radius < b.x + b.w &&
            y + radius > b.y && y - radius < b.y + b.h) {
            return true;
        }
    }
    return false;
}

function solveLegIK(z, y, L1, L2) {
    const d = Math.sqrt(z * z + y * y);
    const dClamped = Math.max(0.1, Math.min(L1 + L2 - 0.01, d));
    
    // Angle of target relative to downward vertical
    const alpha = Math.atan2(z, -y);
    
    // Law of cosines
    const cosBeta = (L1 * L1 + dClamped * dClamped - L2 * L2) / (2 * L1 * dClamped);
    const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
    
    const cosGamma = (L1 * L1 + L2 * L2 - dClamped * dClamped) / (2 * L1 * L2);
    const gamma = Math.acos(Math.max(-1, Math.min(1, cosGamma)));
    
    // Knee bends backward (calf rotates positive relative to thigh)
    const thighRot = alpha - beta;
    const kneeRot = Math.PI - gamma;
    
    return { thigh: thighRot, knee: kneeRot };
}

function getFootCoords(phi, W, S, H_lift, y_rest) {
    const t = (phi / (2 * Math.PI)) % 1; // Normalized phase [0, 1)
    let z = 0;
    let y = y_rest;
    
    if (t < 0.5) {
        // Stance phase: move backward linearly from +S to -S
        const s = t * 4; // 0 to 2
        z = S * (1 - s);
        y = y_rest;
    } else {
        // Swing phase: swing forward from -S to +S following a cosine curve
        const u = (t - 0.5) * 2; // 0 to 1
        z = -S * Math.cos(Math.PI * u);
        y = y_rest + H_lift * Math.sin(Math.PI * u);
    }
    
    // Lerp towards the center/rest state based on walkWeight W
    return {
        z: z * W,
        y: y * W + y_rest * (1 - W)
    };
}

class Player {
    constructor() {
        this.x = WORLD_W / 2;
        this.y = WORLD_H / 2;
        this.prevX = this.x;
        this.prevY = this.y;
        this.radius = 15;
        this.controlDog = false;
        this.health = 100;
        this.maxHealth = 100;
        this.speedFoot = 3.2; // Slower, smoother walk speed
        this.lastToggle = 0;
        this.lastShot = 0;
        this.empReady = true;
        this.lastEmpTime = 0;

        this.group = new THREE.Group();
        scene.add(this.group);

        // Voxel Model - Foot (Stealth Player)
        this.footMesh = new THREE.Group();
        let body = new THREE.Mesh(boxGeo, matFoot);
        body.scale.set(12, 18, 12);
        body.position.y = 64; // Raised to account for taller legs
        body.castShadow = true;
        // Procedural Moai Statue Head Group (retains clean geometric style)
        let head = new THREE.Group();
        head.position.set(0, 78, 0);
        
        // Base Moai Head Block
        let base = new THREE.Mesh(boxGeo, matMoai);
        base.scale.set(8.5, 15, 8.5);
        base.position.set(0, 0, 0);
        base.castShadow = !isMobile;
        base.receiveShadow = !isMobile;
        head.add(base);

        // Brow Ridge
        let brow = new THREE.Mesh(boxGeo, matMoai);
        brow.scale.set(9.5, 2.5, 2.5);
        brow.position.set(0, 5.5, 3.5);
        brow.castShadow = !isMobile;
        brow.receiveShadow = !isMobile;
        head.add(brow);

        // Nose Bridge
        let nose = new THREE.Mesh(boxGeo, matMoai);
        nose.scale.set(2.5, 7.5, 3.5);
        nose.position.set(0, 1.0, 4.0);
        nose.castShadow = !isMobile;
        nose.receiveShadow = !isMobile;
        head.add(nose);

        // Nostril base
        let nostrils = new THREE.Mesh(boxGeo, matMoai);
        nostrils.scale.set(4.5, 2.0, 3.5);
        nostrils.position.set(0, -2.5, 4.0);
        nostrils.castShadow = !isMobile;
        nostrils.receiveShadow = !isMobile;
        head.add(nostrils);

        // Lips
        let lips = new THREE.Mesh(boxGeo, matMoai);
        lips.scale.set(5.5, 1.2, 1.5);
        lips.position.set(0, -4.5, 4.0);
        lips.castShadow = !isMobile;
        lips.receiveShadow = !isMobile;
        head.add(lips);

        // Chin
        let chin = new THREE.Mesh(boxGeo, matMoai);
        chin.scale.set(7.0, 2.5, 2.5);
        chin.position.set(0, -6.5, 2.5);
        chin.castShadow = !isMobile;
        chin.receiveShadow = !isMobile;
        head.add(chin);

        // Left Ear
        let earL = new THREE.Mesh(boxGeo, matMoai);
        earL.scale.set(1.2, 8.5, 2.5);
        earL.position.set(-4.5, 0.5, -0.5);
        earL.castShadow = !isMobile;
        earL.receiveShadow = !isMobile;
        head.add(earL);

        // Right Ear
        let earR = new THREE.Mesh(boxGeo, matMoai);
        earR.scale.set(1.2, 8.5, 2.5);
        earR.position.set(4.5, 0.5, -0.5);
        earR.castShadow = !isMobile;
        earR.receiveShadow = !isMobile;
        head.add(earR);

        this.footMesh.add(body, head);
        
        // Store references for sways
        this.playerBody = body;
        this.playerHead = head;

        // Add 4-joint legs (Hip, Knee, Ankle, Toes)
        const createPlayerLeg = (px, py, pz) => {
            const legGroup = new THREE.Group();
            legGroup.position.set(px, py, pz);
            
            // Thigh (Hip to Knee joint) - length 24
            const thighGroup = new THREE.Group();
            const thighMesh = new THREE.Mesh(boxGeo, matFoot);
            thighMesh.scale.set(3, 24, 3);
            thighMesh.position.y = -12; // Pivot at the top (hip)
            thighMesh.castShadow = true;
            thighGroup.add(thighMesh);
            
            // Knee to Ankle joint - length 24
            const kneeGroup = new THREE.Group();
            kneeGroup.position.set(0, -24, 0);
            const calfMesh = new THREE.Mesh(boxGeo, matFoot);
            calfMesh.scale.set(2.5, 24, 2.5);
            calfMesh.position.y = -12; // Pivot at top (knee)
            calfMesh.castShadow = true;
            kneeGroup.add(calfMesh);
            
            // Ankle to Toes joint - length 15
            const ankleGroup = new THREE.Group();
            ankleGroup.position.set(0, -24, 0);
            const footPartMesh = new THREE.Mesh(boxGeo, matFoot);
            footPartMesh.scale.set(2, 15, 2);
            footPartMesh.position.y = -7.5; // Pivot at top (ankle)
            footPartMesh.castShadow = true;
            ankleGroup.add(footPartMesh);
            
            // Toes
            const toeGroup = new THREE.Group();
            toeGroup.position.set(0, -15, 0);
            const toeMesh = new THREE.Mesh(boxGeo, matFoot);
            toeMesh.scale.set(2.5, 2, 6);
            toeMesh.position.set(0, -1, 2.5); // Pivot at the back (toe joint), extends forward
            toeMesh.castShadow = true;
            toeGroup.add(toeMesh);
            
            ankleGroup.add(toeGroup);
            kneeGroup.add(ankleGroup);
            thighGroup.add(kneeGroup);
            legGroup.add(thighGroup);
            
            // Save references for animation
            legGroup.thigh = thighGroup;
            legGroup.knee = kneeGroup;
            legGroup.ankle = ankleGroup;
            legGroup.toe = toeGroup;
            
            return legGroup;
        };

        this.legL = createPlayerLeg(-4, 60, 0);
        this.legR = createPlayerLeg(4, 60, 0);
        this.footMesh.add(this.legL, this.legR);
        this.walkCycle = 0;
        this.walkWeight = 0;

        // Add physics-based arms (Shoulder, Elbow, Forearm) - x2 longer (48 units total)
        const createPlayerArm = (px, py, pz, isLeft) => {
            const armGroup = new THREE.Group();
            armGroup.position.set(px, py, pz);
            
            // Upper Arm (Shoulder to Elbow) - x2 longer
            const upperArmGroup = new THREE.Group();
            const upperArmMesh = new THREE.Mesh(boxGeo, matFoot);
            upperArmMesh.scale.set(1.5, 24, 1.5);
            upperArmMesh.position.y = -12; // Pivot at top
            upperArmMesh.castShadow = !isMobile;
            upperArmGroup.add(upperArmMesh);
            
            // Lower Arm (Elbow to Hand) - x2 longer
            const lowerArmGroup = new THREE.Group();
            lowerArmGroup.position.set(0, -24, 0); // Pivot at elbow (double distance)
            const lowerArmMesh = new THREE.Mesh(boxGeo, matFoot);
            lowerArmMesh.scale.set(1.0, 24, 1.0);
            lowerArmMesh.position.y = -12; // Pivot at top
            lowerArmMesh.castShadow = !isMobile;
            lowerArmGroup.add(lowerArmMesh);
            
            upperArmGroup.add(lowerArmGroup);
            armGroup.add(upperArmGroup);
            
            // Save references for animation
            armGroup.upper = upperArmGroup;
            armGroup.lower = lowerArmGroup;
            
            return armGroup;
        };

        this.armL = createPlayerArm(-6.5, 70, 0, true);
        this.armR = createPlayerArm(6.5, 70, 0, false);
        this.footMesh.add(this.armL, this.armR);

        // Arm Physics simulation state
        this.armPhys = {
            left: { angleS: 0, velS: 0, angleE: 0, velE: 0 },
            right: { angleS: 0, velS: 0, angleE: 0, velE: 0 }
        };

        this.group.add(this.footMesh);
    }

    update() {
        if (this.health <= 0) return;
        let oldX = this.prevX;
        let oldY = this.prevY;

        // Right stick or Arrow keys to orbit/pitch the camera (boosted sensitivity)
        if (!effectCamZoom) {
            // Gamepad right stick (inverted so pushing right looks right, pushing up looks up)
            if (Math.abs(gpState.axes[2]) > 0.15) {
                cameraYaw -= gpState.axes[2] * 0.09 * timeScale;
            }
            if (Math.abs(gpState.axes[3]) > 0.15) {
                cameraPitch = Math.max(0.05, Math.min(1.3, cameraPitch - gpState.axes[3] * 0.07 * timeScale));
            }
            // Mobile right stick camera orbit
            if (mobileInput.rightStick.active) {
                cameraYaw -= mobileInput.rightStick.dx * 0.08 * timeScale;
                cameraPitch = Math.max(0.05, Math.min(1.3, cameraPitch + mobileInput.rightStick.dy * 0.06 * timeScale));
            }
            // Keyboard Arrow keys (synchronized with inverted stick controls)
            if (keys['ArrowLeft']) cameraYaw += 0.09 * timeScale;
            if (keys['ArrowRight']) cameraYaw -= 0.09 * timeScale;
            if (keys['ArrowUp']) cameraPitch = Math.max(0.05, Math.min(1.3, cameraPitch + 0.07 * timeScale));
            if (keys['ArrowDown']) cameraPitch = Math.max(0.05, Math.min(1.3, cameraPitch - 0.07 * timeScale));
        }

        let togglePressed = keys['Space'] || justPressed(0);
        if (togglePressed && Date.now() - this.lastToggle > 500) {
            this.controlDog = !this.controlDog;
            this.lastToggle = Date.now();
            updateHUD();
        }

        let empPressed = keys['KeyE'] || justPressed(2);
        if (empPressed && this.empReady && this.controlDog) {
            fireEMP();
        }

        let camForwardX = 0;
        let camForwardZ = -1;
        let camRightX = 1;
        let camRightZ = 0;

        if (!effectCamZoom) {
            // Get direction vector pointing from camera to controlled character
            let targetX = this.controlDog ? bigDog.x : this.x;
            let targetZ = this.controlDog ? bigDog.y : this.y;
            const dirX = targetX - camera.position.x;
            const dirZ = targetZ - camera.position.z;
            const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
            if (len > 0) {
                camForwardX = dirX / len;
                camForwardZ = dirZ / len;
                // Correct 90-degree clockwise right-turn vector
                camRightX = -camForwardZ;
                camRightZ = camForwardX;
            }
        }

        let moveX = 0, moveY = 0;
        if (keys['KeyW']) moveY += 1; // forward relative to camera view
        if (keys['KeyS']) moveY -= 1; // backward
        if (keys['KeyA']) moveX -= 1; // left
        if (keys['KeyD']) moveX += 1; // right

        if (mobileInput.leftStick.active) {
            moveX = mobileInput.leftStick.dx;
            moveY = -mobileInput.leftStick.dy; // Invert touch Y (moving up goes forward)
        }

        if (Math.abs(gpState.axes[0]) > 0.2) moveX = gpState.axes[0];
        if (Math.abs(gpState.axes[1]) > 0.2) moveY = -gpState.axes[1]; // Gamepad Y is inverted (up is negative)

        let dx = camForwardX * moveY + camRightX * moveX;
        let dy = camForwardZ * moveY + camRightZ * moveX;

        let mag = Math.sqrt(dx*dx + dy*dy);
        if (mag > 0 && mag > 1) { dx /= mag; dy /= mag; }

        let currentSpeed = this.speedFoot;
        
        if (this.controlDog && bigDog && bigDog.active && !bigDog.isParachuting) {
            // Move Robo Dog
            let dogRadius = 10;
            let newX = bigDog.x + dx * currentSpeed;
            let newY = bigDog.y + dy * currentSpeed;
            if (!checkBuildingCollision(newX, bigDog.y, dogRadius)) bigDog.x = newX;
            if (!checkBuildingCollision(bigDog.x, newY, dogRadius)) bigDog.y = newY;
            bigDog.x = Math.max(0, Math.min(WORLD_W, bigDog.x));
            bigDog.y = Math.max(0, Math.min(WORLD_H, bigDog.y));

            // Human follows Robo Dog
            let hdx = bigDog.x - this.x;
            let hdy = bigDog.y - this.y;
            let hdist = Math.sqrt(hdx*hdx + hdy*hdy);
            if (hdist > 80) {
                let hdxMove = (hdx/hdist) * this.speedFoot * 0.9 * timeScale;
                let hdyMove = (hdy/hdist) * this.speedFoot * 0.9 * timeScale;
                if (!checkBuildingCollision(this.x + hdxMove, this.y, this.radius)) this.x += hdxMove;
                if (!checkBuildingCollision(this.x, this.y + hdyMove, this.radius)) this.y += hdyMove;
            }
        } else {
            // Move Human
            let newX = this.x + dx * currentSpeed;
            let newY = this.y + dy * currentSpeed;
            if (!checkBuildingCollision(newX, this.y, this.radius)) this.x = newX;
            if (!checkBuildingCollision(this.x, newY, this.radius)) this.y = newY;
            this.x = Math.max(0, Math.min(WORLD_W, this.x));
            this.y = Math.max(0, Math.min(WORLD_H, this.y));
        }

        // Determine rotation direction
        let rotated = false;
        if (this.controlDog && bigDog && bigDog.active) {
            let aimX = 0, aimY = 0;
            let aiming = false;

            if (Math.abs(gpState.axes[2]) > 0.2 || Math.abs(gpState.axes[3]) > 0.2) {
                let aimStickX = gpState.axes[2];
                let aimStickY = -gpState.axes[3];
                aimX = camForwardX * aimStickY + camRightX * aimStickX;
                aimY = camForwardZ * aimStickY + camRightZ * aimStickX;
                aiming = true;
            } else if (mobileInput.rightStick.active && (Math.abs(mobileInput.rightStick.dx) > 0.15 || Math.abs(mobileInput.rightStick.dy) > 0.15)) {
                let aimStickX = mobileInput.rightStick.dx;
                let aimStickY = -mobileInput.rightStick.dy;
                aimX = camForwardX * aimStickY + camRightX * aimStickX;
                aimY = camForwardZ * aimStickY + camRightZ * aimStickX;
                aiming = true;
            } else if (mouse.down) {
                let aimStickX = mouse.x - window.innerWidth/2;
                let aimStickY = -(mouse.y - window.innerHeight/2);
                aimX = camForwardX * aimStickY + camRightX * aimStickX;
                aimY = camForwardZ * aimStickY + camRightZ * aimStickX;
                aiming = true;
            }

            if (aiming) {
                let aimMag = Math.sqrt(aimX*aimX + aimY*aimY);
                if (aimMag > 0) {
                    bigDog.group.rotation.y = Math.atan2(aimX, aimY);
                    rotated = true;
                }
            }
            if (!rotated && mag > 0) {
                bigDog.group.rotation.y = Math.atan2(dx, dy);
            }
            
            // Human faces Dog
            let hdx = bigDog.x - this.x;
            let hdy = bigDog.y - this.y;
            let hdist = Math.sqrt(hdx*hdx + hdy*hdy);
            if (hdist > 40) {
                this.group.rotation.y = Math.atan2(hdx, hdy);
            }
        } else {
            // Face movement direction if moving
            if (mag > 0) {
                this.group.rotation.y = Math.atan2(dx, dy);
            }
        }

        this.group.position.set(this.x, 0, this.y);

        if (this.controlDog && bigDog && bigDog.active && !bigDog.isParachuting) {
            let aimX = 0, aimY = 0;
            let shooting = false;

            if (Math.abs(gpState.axes[2]) > 0.2 || Math.abs(gpState.axes[3]) > 0.2) {
                let aimStickX = gpState.axes[2];
                let aimStickY = -gpState.axes[3];
                aimX = camForwardX * aimStickY + camRightX * aimStickX;
                aimY = camForwardZ * aimStickY + camRightZ * aimStickX;
                shooting = true;
            } else if (mobileInput.rightStick.active && (Math.abs(mobileInput.rightStick.dx) > 0.15 || Math.abs(mobileInput.rightStick.dy) > 0.15)) {
                let aimStickX = mobileInput.rightStick.dx;
                let aimStickY = -mobileInput.rightStick.dy;
                aimX = camForwardX * aimStickY + camRightX * aimStickX;
                aimY = camForwardZ * aimStickY + camRightZ * aimStickX;
                shooting = true;
            } else if (mouse.down) {
                let aimStickX = mouse.x - window.innerWidth/2;
                let aimStickY = -(mouse.y - window.innerHeight/2);
                aimX = camForwardX * aimStickY + camRightX * aimStickX;
                aimY = camForwardZ * aimStickY + camRightZ * aimStickX;
                shooting = true;
            }
            if (gpState.buttons[7]) {
                shooting = true;
                if (aimX === 0 && aimY === 0) {
                    aimX = dx; aimY = dy;
                }
            }

            if (shooting && Date.now() - this.lastShot > 150) {
                let aimMag = Math.sqrt(aimX*aimX + aimY*aimY);
                if (aimMag > 0) {
                    projectiles.push(new Projectile(bigDog.x, bigDog.y, aimX/aimMag, aimY/aimMag, true));
                    this.lastShot = Date.now();
                }
            }
        }

        // Animate stealth player legs
        if (!this.isMech) {
            let actualDx = this.x - oldX;
            let actualDy = this.y - oldY;
            let actualDist = Math.sqrt(actualDx * actualDx + actualDy * actualDy);
            
            const isMoving = actualDist > 0.01;
            
            if (isMoving) {
                this.walkCycle += (Math.PI / (2 * 16)) * actualDist;
                this.walkWeight = THREE.MathUtils.lerp(this.walkWeight, 1, 0.15 * timeScale);
            } else {
                this.walkWeight = THREE.MathUtils.lerp(this.walkWeight, 0, 0.15 * timeScale);
            }
            
            // Calculate foot targets in local 2D space relative to hip
            // Hip height is 60, ankle target rest Y is -45 (since ankle is 15 above Y=0)
            const coordsL = getFootCoords(this.walkCycle, this.walkWeight, 16, 10, -45);
            const coordsR = getFootCoords(this.walkCycle + Math.PI, this.walkWeight, 16, 10, -45);
            
            const ikL = solveLegIK(coordsL.z, coordsL.y, 24, 24);
            const ikR = solveLegIK(coordsR.z, coordsR.y, 24, 24);
            
            // Apply rotations
            this.legL.thigh.rotation.x = ikL.thigh;
            this.legL.knee.rotation.x = ikL.knee;
            this.legL.ankle.rotation.x = -(ikL.thigh + ikL.knee);
            this.legL.toe.rotation.x = 0; // Keep flat
            
            this.legR.thigh.rotation.x = ikR.thigh;
            this.legR.knee.rotation.x = ikR.knee;
            this.legR.ankle.rotation.x = -(ikR.thigh + ikR.knee);
            this.legR.toe.rotation.x = 0; // Keep flat
            
            // Ensure hips are reset/fixed to Y=60
            this.legL.position.y = 60;
            this.legR.position.y = 60;
            
            // Hips and head dynamic sway
            if (this.playerBody && this.playerHead) {
                const bob = Math.sin(this.walkCycle * 2) * 1.2 * this.walkWeight;
                const swayY = Math.sin(this.walkCycle) * 0.08 * this.walkWeight;
                const swayZ = Math.cos(this.walkCycle) * 0.04 * this.walkWeight;
                const headBob = Math.abs(Math.sin(this.walkCycle * 2)) * 1.5 * this.walkWeight;
                
                this.playerBody.position.y = THREE.MathUtils.lerp(this.playerBody.position.y, 64 + bob, 0.15 * timeScale);
                this.playerBody.rotation.y = THREE.MathUtils.lerp(this.playerBody.rotation.y, swayY, 0.15 * timeScale);
                this.playerBody.rotation.z = THREE.MathUtils.lerp(this.playerBody.rotation.z, swayZ, 0.15 * timeScale);
                this.playerHead.position.y = THREE.MathUtils.lerp(this.playerHead.position.y, 78 + headBob, 0.15 * timeScale);
            }
        }

        // Physics-based arm swinging & lag simulation
        if (!this.isMech) {
            // Left arm physics targets (oscillate at half leg speed: walkCycle * 0.5)
            let targetSL = -0.4 * Math.sin(this.walkCycle * 0.5) * mag - mag * 0.4;
            let targetEL = Math.max(0, -this.armPhys.left.velS * 1.5) + mag * 0.4;
            
            // Right arm physics targets
            let targetSR = 0.4 * Math.sin(this.walkCycle * 0.5) * mag - mag * 0.4;
            let targetER = Math.max(0, -this.armPhys.right.velS * 1.5) + mag * 0.4;
            
            if (mag === 0) {
                targetSL = 0;
                targetEL = 0;
                targetSR = 0;
                targetER = 0;
            }
            
            // Left spring logic (reduced stiffness 0.08, increased damping 0.85 for relaxed feel)
            this.armPhys.left.velS += (targetSL - this.armPhys.left.angleS) * 0.08;
            this.armPhys.left.velS *= 0.85;
            this.armPhys.left.angleS += this.armPhys.left.velS * timeScale;
            
            this.armPhys.left.velE += (targetEL - this.armPhys.left.angleE) * 0.09;
            this.armPhys.left.velE *= 0.82;
            this.armPhys.left.angleE += this.armPhys.left.velE * timeScale;
            
            // Right spring logic
            this.armPhys.right.velS += (targetSR - this.armPhys.right.angleS) * 0.08;
            this.armPhys.right.velS *= 0.85;
            this.armPhys.right.angleS += this.armPhys.right.velS * timeScale;
            
            this.armPhys.right.velE += (targetER - this.armPhys.right.angleE) * 0.09;
            this.armPhys.right.velE *= 0.82;
            this.armPhys.right.angleE += this.armPhys.right.velE * timeScale;
            
            // Apply rotations
            this.armL.upper.rotation.x = this.armPhys.left.angleS;
            this.armL.lower.rotation.x = -this.armPhys.left.angleE;
            this.armL.upper.rotation.z = -0.05 - mag * 0.1;
            
            this.armR.upper.rotation.x = this.armPhys.right.angleS;
            this.armR.lower.rotation.x = -this.armPhys.right.angleE;
            this.armR.upper.rotation.z = 0.05 + mag * 0.1;
        }
        this.prevX = this.x;
        this.prevY = this.y;
    }

    destroy() {
        scene.remove(this.group);
    }
}

class BigDog {
    constructor() {
        this.x = player.x + 50;
        this.y = player.y + 50;
        this.altitude = 0;
        this.isParachuting = false;
        this.active = true;
        this.dogScale = 1.0;
        this.group = new THREE.Group();
        
        let body = new THREE.Mesh(boxGeo, matDog);
        body.scale.set(16, 12, 24);
        body.position.y = 84; // Raised to account for taller legs
        body.castShadow = true;
        this.body = body; // Stored reference for weight sways
        
        this.head = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color: 0x222222}));
        this.head.scale.set(8, 8, 8);
        this.head.position.set(0, 90, 12); // Raised head position
        this.head.castShadow = true;
        
        // Parachute
        let parachuteGeo = new THREE.SphereGeometry(25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        this.parachuteMesh = new THREE.Mesh(parachuteGeo, matParachute);
        this.parachuteMesh.position.y = 120; // Raised parachute position
        this.parachuteMesh.visible = false;
        
        this.group.add(body, this.head, this.parachuteMesh);

        // Add 4 legs
        const matLeg = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
        const createLeg = (px, py, pz) => {
            const legGroup = new THREE.Group();
            legGroup.position.set(px, py, pz);
            
            // Upper leg segment (hip joint to knee joint) - length 44
            const upperLegGroup = new THREE.Group();
            const upperLegMesh = new THREE.Mesh(boxGeo, matLeg);
            upperLegMesh.scale.set(4, 44, 4);
            upperLegMesh.position.y = -22; // Pivot at the hip
            upperLegMesh.castShadow = true;
            upperLegGroup.add(upperLegMesh);
            
            // Lower leg segment (knee joint to foot) - length 44
            const lowerLegGroup = new THREE.Group();
            lowerLegGroup.position.set(0, -44, 0); // Positioned at knee joint
            const lowerLegMesh = new THREE.Mesh(boxGeo, matLeg);
            lowerLegMesh.scale.set(3, 44, 3);
            lowerLegMesh.position.y = -22; // Pivot at the knee
            lowerLegMesh.castShadow = true;
            lowerLegGroup.add(lowerLegMesh);
            
            upperLegGroup.add(lowerLegGroup);
            legGroup.add(upperLegGroup);
            
            // Save references for animation
            legGroup.upper = upperLegGroup;
            legGroup.lower = lowerLegGroup;
            
            return legGroup;
        };

        // Attach legs to body bottom (legs are 88 units long when straight, hip is at y = 83)
        this.legFL = createLeg(-6, 83, 8);
        this.legFR = createLeg(6, 83, 8);
        this.legBL = createLeg(-6, 83, -8);
        this.legBR = createLeg(6, 83, -8);

        this.group.add(this.legFL, this.legFR, this.legBL, this.legBR);

        // Add a wagging tail
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 86, -12); // Raised tail position
        const tailMesh = new THREE.Mesh(boxGeo, matDog);
        tailMesh.scale.set(2, 2, 10);
        tailMesh.position.z = -5; // Extends backward
        tailMesh.rotation.x = -0.3; // Upward tilt
        tailMesh.castShadow = true;
        tailGroup.add(tailMesh);
        this.tail = tailGroup;
        this.group.add(this.tail);

        this.walkCycle = 0;
        this.walkWeight = 0;
        this.prevX = this.x;
        this.prevY = this.y;

        scene.add(this.group);
    }
    update() {
        if (!this.active) return;
        let oldX = this.prevX;
        let oldY = this.prevY;
        this.group.scale.set(this.dogScale, this.dogScale, this.dogScale);
        
        this.parachuteMesh.visible = this.isParachuting;

        let isMoving = false;

        if (this.isParachuting) {
            this.altitude -= 4 * timeScale; // slowly drift down
            this.x += (player.x - this.x) * 0.05 * timeScale; // drift towards player loosely
            this.y += (player.y - this.y) * 0.05 * timeScale;
            
            if (this.altitude <= 0) {
                this.altitude = 0;
                this.isParachuting = false;
            }

            // Flail legs and tail while parachuting!
            const time = Date.now() * 0.01 * timeScale;
            this.legFL.upper.rotation.x = Math.sin(time) * 0.5;
            this.legFL.lower.rotation.x = -Math.abs(Math.sin(time)) * 0.6;
            this.legFR.upper.rotation.y = Math.cos(time) * 0.3;
            this.legBL.upper.rotation.x = Math.sin(time + 1) * 0.4;
            this.legBL.lower.rotation.x = -Math.abs(Math.sin(time + 1)) * 0.6;
            this.legBR.upper.rotation.y = -Math.cos(time + 1) * 0.3;
            this.tail.rotation.y = Math.sin(time * 2) * 0.2;
            this.head.position.y = 90 + Math.sin(time) * 1.5;
        } else {
            if (!player.controlDog) {
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 80) {
                    let dxMove = (dx/dist) * player.speedFoot * 0.9 * timeScale;
                    let dyMove = (dy/dist) * player.speedFoot * 0.9 * timeScale;
                    if (!checkBuildingCollision(this.x + dxMove, this.y, 10)) this.x += dxMove;
                    if (!checkBuildingCollision(this.x, this.y + dyMove, 10)) this.y += dyMove;
                    this.group.rotation.y = Math.atan2(dx, dy);
                }
            }

            let actualDx = this.x - oldX;
            let actualDy = this.y - oldY;
            let actualDist = Math.sqrt(actualDx * actualDx + actualDy * actualDy);
            let isMoving = actualDist > 0.01;

            if (isMoving) {
                this.walkCycle += (Math.PI / (2 * 22)) * actualDist;
                this.walkWeight = THREE.MathUtils.lerp(this.walkWeight, 1, 0.15 * timeScale);
            } else {
                this.walkWeight = THREE.MathUtils.lerp(this.walkWeight, 0, 0.15 * timeScale);
            }

            // Calculate targets for 4 legs (stride: 22, lift: 14, rest Y: -83)
            const coordsFL = getFootCoords(this.walkCycle, this.walkWeight, 22, 14, -83);
            const coordsBR = getFootCoords(this.walkCycle + 0.1, this.walkWeight, 22, 14, -83);
            const coordsFR = getFootCoords(this.walkCycle + Math.PI, this.walkWeight, 22, 14, -83);
            const coordsBL = getFootCoords(this.walkCycle + Math.PI - 0.1, this.walkWeight, 22, 14, -83);

            const ikFL = solveLegIK(coordsFL.z, coordsFL.y, 44, 44);
            const ikBR = solveLegIK(coordsBR.z, coordsBR.y, 44, 44);
            const ikFR = solveLegIK(coordsFR.z, coordsFR.y, 44, 44);
            const ikBL = solveLegIK(coordsBL.z, coordsBL.y, 44, 44);

            // Apply rotations
            this.legFL.upper.rotation.x = ikFL.thigh;
            this.legFL.lower.rotation.x = ikFL.knee;
            this.legBR.upper.rotation.x = ikBR.thigh;
            this.legBR.lower.rotation.x = ikBR.knee;
            this.legFR.upper.rotation.x = ikFR.thigh;
            this.legFR.lower.rotation.x = ikFR.knee;
            this.legBL.upper.rotation.x = ikBL.thigh;
            this.legBL.lower.rotation.x = ikBL.knee;

            // Ensure leg hips are fixed to Y=83
            this.legFL.position.y = 83;
            this.legBR.position.y = 83;
            this.legFR.position.y = 83;
            this.legBL.position.y = 83;

            // Body weight shifts (bobbing, rolling, yawning)
            if (this.body) {
                const bob = Math.sin(this.walkCycle * 2) * 1.5 * this.walkWeight;
                const roll = Math.sin(this.walkCycle) * 0.04 * this.walkWeight;
                const yaw = Math.cos(this.walkCycle) * 0.03 * this.walkWeight;
                
                this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 84 + bob, 0.15 * timeScale);
                this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, roll, 0.15 * timeScale);
                this.body.rotation.y = THREE.MathUtils.lerp(this.body.rotation.y, yaw, 0.15 * timeScale);
            }

            // Tail wag
            const tailWag = isMoving 
                ? Math.sin(this.walkCycle * 2.5) * 0.4 
                : Math.sin(Date.now() * 0.003) * 0.2;
            this.tail.rotation.y = THREE.MathUtils.lerp(this.tail.rotation.y, tailWag, 0.15 * timeScale);
            
            // Head bob and sway
            const headBob = isMoving ? Math.abs(Math.sin(this.walkCycle)) * 4.5 : 0;
            const headSwayX = isMoving ? Math.sin(this.walkCycle) * 0.8 : 0;
            this.head.position.y = THREE.MathUtils.lerp(this.head.position.y, 90 + headBob, 0.15 * timeScale);
            this.head.position.x = THREE.MathUtils.lerp(this.head.position.x, headSwayX, 0.15 * timeScale);
        }
        this.group.position.set(this.x, this.altitude, this.y);
        this.prevX = this.x;
        this.prevY = this.y;
    }
    destroy() {
        scene.remove(this.group);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 50;
        this.health = 30;
        this.speed = 1.5 + Math.random() + (currentLevel - 1) * 0.35; // Scale speed with level progress
        this.angle = Math.random() * Math.PI * 2;
        this.state = 'wander'; 
        this.lastShot = 0;

        this.group = new THREE.Group();
        
        // Define a unique glow material per enemy instance to avoid global color bleeding
        this.glowMat = new THREE.MeshStandardMaterial({ 
            color: 0x52d1dc, // Glow cyan/teal
            emissive: 0x52d1dc, 
            emissiveIntensity: 0.8,
            metalness: 0.5,
            roughness: 0.5
        });

        // antBodyGroup will contain all segments of the ant (Thorax, Head, Mandibles, Antennae, Abdomen, Spikes, Eyes)
        this.antBodyGroup = new THREE.Group();

        // Thorax (central part)
        let thorax = new THREE.Mesh(boxGeo, matAntBody);
        thorax.scale.set(14, 14, 32);
        thorax.position.set(0, 75, -2); // Lowered from 84 to 75
        thorax.castShadow = true;
        thorax.receiveShadow = true;
        this.antBodyGroup.add(thorax);

        // Head
        let head = new THREE.Mesh(boxGeo, matAntBody);
        head.scale.set(16, 16, 16);
        head.position.set(0, 79, 24); // Lowered from 88 to 79
        head.castShadow = true;
        head.receiveShadow = true;
        this.antBodyGroup.add(head);

        // Mandibles (creepy curved teeth)
        let mandibleL = new THREE.Mesh(boxGeo, matAntBody);
        mandibleL.scale.set(2, 4, 10);
        mandibleL.position.set(-5, 75, 32); // Lowered from 84 to 75
        mandibleL.rotation.set(0.1, -0.4, -0.2);
        mandibleL.castShadow = true;
        this.antBodyGroup.add(mandibleL);

        let mandibleR = new THREE.Mesh(boxGeo, matAntBody);
        mandibleR.scale.set(2, 4, 10);
        mandibleR.position.set(5, 75, 32); // Lowered from 84 to 75
        mandibleR.rotation.set(0.1, 0.4, 0.2);
        mandibleR.castShadow = true;
        this.antBodyGroup.add(mandibleR);

        // Long Antennae with glowing sonar-emitting tips
        const antLen = 35;
        
        // Left Antenna Group
        const antennaLGroup = new THREE.Group();
        antennaLGroup.position.set(-5, 85, 28);
        antennaLGroup.rotation.set(0.35, -0.25, -0.1);
        
        const antennaLMesh = new THREE.Mesh(boxGeo, matAntBody);
        antennaLMesh.scale.set(1.2, 1.2, antLen);
        antennaLMesh.position.set(0, 0, antLen / 2); // pivot at base, extending forward along local Z
        antennaLMesh.castShadow = true;
        antennaLGroup.add(antennaLMesh);
        
        const tipL = new THREE.Mesh(boxGeo, this.glowMat);
        tipL.scale.set(3.5, 3.5, 3.5);
        tipL.position.set(0, 0, antLen); // at the end of the antenna
        tipL.castShadow = true;
        antennaLGroup.add(tipL);
        this.antBodyGroup.add(antennaLGroup);
        this.antennaL = antennaLGroup;
        
        // Right Antenna Group
        const antennaRGroup = new THREE.Group();
        antennaRGroup.position.set(5, 85, 28);
        antennaRGroup.rotation.set(0.35, 0.25, 0.1);
        
        const antennaRMesh = new THREE.Mesh(boxGeo, matAntBody);
        antennaRMesh.scale.set(1.2, 1.2, antLen);
        antennaRMesh.position.set(0, 0, antLen / 2);
        antennaRMesh.castShadow = true;
        antennaRGroup.add(antennaRMesh);
        
        const tipR = new THREE.Mesh(boxGeo, this.glowMat);
        tipR.scale.set(3.5, 3.5, 3.5);
        tipR.position.set(0, 0, antLen);
        tipR.castShadow = true;
        antennaRGroup.add(tipR);
        this.antBodyGroup.add(antennaRGroup);
        this.antennaR = antennaRGroup;

        // Abdomen (gaster - bulbous back part)
        let abdomen = new THREE.Mesh(boxGeo, matAntBody);
        abdomen.scale.set(22, 18, 30);
        abdomen.position.set(0, 77, -30); // Lowered from 86 to 77
        abdomen.rotation.set(-0.15, 0, 0);
        abdomen.castShadow = true;
        abdomen.receiveShadow = true;
        this.antBodyGroup.add(abdomen);

        // Abdominal Spikes
        for (let i = 0; i < 3; i++) {
            let spike = new THREE.Mesh(boxGeo, matAntBody);
            spike.scale.set(3, 6, 3);
            let spikeZ = -22 - i * 8;
            let spikeY = 77 + 9 - i * 2; // Lowered from 86 to 77 base
            spike.position.set(0, spikeY + 2, spikeZ);
            spike.rotation.set(0.3, 0, 0);
            spike.castShadow = true;
            this.antBodyGroup.add(spike);
        }

        // Eyes (glowing)
        this.eyeL = new THREE.Mesh(boxGeo, this.glowMat);
        this.eyeL.scale.set(5, 5, 2);
        this.eyeL.position.set(-8.1, 82, 27); // Lowered from 91 to 82
        this.eyeL.rotation.set(0, -0.5, 0);
        this.antBodyGroup.add(this.eyeL);

        this.eyeR = new THREE.Mesh(boxGeo, this.glowMat);
        this.eyeR.scale.set(5, 5, 2);
        this.eyeR.position.set(8.1, 82, 27); // Lowered from 91 to 82
        this.eyeR.rotation.set(0, 0.5, 0);
        this.antBodyGroup.add(this.eyeR);

        // Add the entire ant body group to the main entity group
        this.group.add(this.antBodyGroup);
        this.body = this.antBodyGroup; // Cache reference for jitter/bobbing
        this.eye = this.eyeL; // Keep reference to avoid breaking code assuming single eye mesh (though updated via glowMat)

        // Helper function to create insect-like gothic arched legs
        const createEnemyLeg = (side, legIndex) => {
            const legGroup = new THREE.Group();
            
            // Positioning along thorax:
            // Spaced along Z at wider offsets to avoid collision
            const pz = 15 - legIndex * 11;
            const px = side * 11; // Wider attachment from body center
            const py = 69; // Lowered hip joint center
            legGroup.position.set(px, py, pz);
            
            // Thigh (Femur)
            const thighGroup = new THREE.Group();
            const thighMesh = new THREE.Mesh(boxGeo, matAntBody);
            thighMesh.scale.set(2.5, 26, 2.5);
            thighMesh.position.y = -13; // Pivot at hip joint
            thighMesh.castShadow = true;
            thighGroup.add(thighMesh);
            
            // Knee to Ankle (Tibia)
            const kneeGroup = new THREE.Group();
            kneeGroup.position.set(0, -26, 0); // Positioned at knee joint (bottom of femur)
            const calfMesh = new THREE.Mesh(boxGeo, matAntBody);
            calfMesh.scale.set(2, 28, 2);
            calfMesh.position.y = -14; // Pivot at knee joint
            calfMesh.castShadow = true;
            kneeGroup.add(calfMesh);
            
            // Ankle to Toes (Tarsus)
            const ankleGroup = new THREE.Group();
            ankleGroup.position.set(0, -28, 0); // Positioned at ankle joint (bottom of tibia)
            const footPartMesh = new THREE.Mesh(boxGeo, matAntBody);
            footPartMesh.scale.set(1.5, 30, 1.5);
            footPartMesh.position.y = -15; // Pivot at ankle joint
            footPartMesh.castShadow = true;
            ankleGroup.add(footPartMesh);
            
            // Toe Tip (glowing segment)
            const toeGroup = new THREE.Group();
            toeGroup.position.set(0, -30, 0); // Positioned at toe joint (bottom of tarsus)
            const toeMesh = new THREE.Mesh(boxGeo, this.glowMat);
            toeMesh.scale.set(2, 5, 2);
            toeMesh.position.y = -2.5; // Pivot at toe joint, extends down
            toeMesh.castShadow = true;
            toeGroup.add(toeMesh);
            
            ankleGroup.add(toeGroup);
            kneeGroup.add(ankleGroup);
            thighGroup.add(kneeGroup);
            legGroup.add(thighGroup);
            
            // Base rotations to create insect fanned stance and gothic arches:
            let fanY = 0;
            if (legIndex === 0) fanY = 0.9 * side;
            else if (legIndex === 1) fanY = 0.35 * side;
            else if (legIndex === 2) fanY = -0.35 * side;
            else if (legIndex === 3) fanY = -0.9 * side;
            
            legGroup.rotation.y = fanY;
            
            // Tilt joints to form a nice spider leg arch
            thighGroup.rotation.z = -1.0 * side; // left points left, right points right
            kneeGroup.rotation.z = 1.4 * side;  // bends back in
            ankleGroup.rotation.z = -0.4 * side; // angles out to meet the floor
            
            // References for animation
            legGroup.thigh = thighGroup;
            legGroup.knee = kneeGroup;
            legGroup.ankle = ankleGroup;
            legGroup.toe = toeGroup;
            
            // Save base angles
            legGroup.baseThighRotX = 0;
            legGroup.baseKneeRotX = 0;
            legGroup.baseAnkleRotX = 0;
            
            return legGroup;
        };

        // Attach 8 legs
        this.legsL = [];
        this.legsR = [];
        for (let i = 0; i < 4; i++) {
            let legL = createEnemyLeg(-1, i);
            let legR = createEnemyLeg(1, i);
            this.legsL.push(legL);
            this.legsR.push(legR);
            this.group.add(legL, legR);
        }

        this.walkCycle = Math.random() * Math.PI * 2;

        // Create scanning cone (radio waves danger zone)
        this.scanConeGroup = new THREE.Group();
        this.scanArcs = [];
        
        const arcMat = new THREE.MeshBasicMaterial({
            color: 0x52d1dc,
            transparent: true,
            opacity: 0.35,
            wireframe: true,
            side: THREE.DoubleSide
        });
        
        const maxScanDistance = 220;
        const numArcs = 2; // Reduced cadence by half (2 arcs instead of 3)
        const angleWidth = 1.05; // ~60 degrees fov cone
        const scanHeight = 60; // 1.5x taller (0.75x height of ants)
        
        for (let i = 0; i < numArcs; i++) {
            const radius = (i + 1) * (maxScanDistance / numArcs);
            // CylinderGeometry arguments: radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength
            const geo = new THREE.CylinderGeometry(radius, radius, scanHeight, 16, 8, true, -angleWidth/2, angleWidth);
            const mesh = new THREE.Mesh(geo, arcMat.clone());
            // Center vertically so bottom rests at y = 0
            mesh.position.set(0, scanHeight/2, 55);
            this.scanConeGroup.add(mesh);
            this.scanArcs.push({
                line: mesh, // keep named 'line' to match update code references
                baseRadius: radius
            });
        }
        this.group.add(this.scanConeGroup);

        this.group.position.set(this.x, 0, this.y);
        scene.add(this.group);
    }
    update() {
        let targetX = player.controlDog && bigDog && bigDog.active ? bigDog.x : player.x;
        let targetY = player.controlDog && bigDog && bigDog.active ? bigDog.y : player.y;
        let dx = targetX - this.x;
        let dy = targetY - this.y;
        let distToTarget = Math.sqrt(dx*dx + dy*dy);

        let spotted = false;
        if (player.health > 0) {
            if (player.controlDog && distToTarget < 800) {
                spotted = true; // Dog is loud, spotted from far away!
            } else if (distToTarget < 220) {
                // On foot (stealth): spotted only if in scanner cone!
                let forwardX = Math.sin(this.group.rotation.y);
                let forwardZ = Math.cos(this.group.rotation.y);
                let dot = (dx / distToTarget) * forwardX + (dy / distToTarget) * forwardZ;
                if (dot > 0.85) { // cos(31 degrees) ≈ 0.85
                    spotted = true;
                }
            }
        }

        if (spotted) {
            this.state = 'chase';
            this.glowMat.color.setHex(0xff3356);
            this.glowMat.emissive.setHex(0xff3356);
        } else {
            this.state = 'wander';
            this.glowMat.color.setHex(0x52d1dc);
            this.glowMat.emissive.setHex(0x52d1dc);
        }

        // Animate scan arcs propagating forward (once every 1500ms)
        const cycle = (Date.now() / 1500) % 1.0; // Pulse once every 1.5 seconds (0.66 Hz)
        const isChase = (this.state === 'chase');
        const scanColor = isChase ? 0xff3356 : 0x52d1dc;
        
        if (this.scanArcs) {
            const totalArcs = this.scanArcs.length;
            this.scanArcs.forEach((arc, idx) => {
                const progress = (idx / totalArcs + cycle) % 1.0;
                // Smooth sine-wave easing for expansion
                const smoothProgress = Math.sin(progress * Math.PI / 2);
                const scale = 0.2 + smoothProgress * 1.2;
                arc.line.scale.set(scale, 1, scale);
                
                // Opacity fades out smoothly as it expands
                const baseOpacity = isChase ? 0.75 : 0.35;
                arc.line.material.opacity = (1.0 - smoothProgress) * baseOpacity;
                arc.line.material.color.setHex(scanColor);
                
                // Animate the actual 3D wave ripples along the height of the curtain (analogue & curved)
                const position = arc.line.geometry.attributes.position;
                const array = position.array;
                const segments = 16;
                const heightSegments = 8;
                const h = 60; // scanHeight
                const thetaStart = -1.05 / 2; // -angleWidth/2
                const thetaLength = 1.05; // angleWidth
                
                let vIdx = 0;
                for (let j = 0; j <= heightSegments; j++) {
                    const yVal = h/2 - (j / heightSegments) * h;
                    // Modulate radius using a smooth sine wave along height (4x slower ripple!)
                    const waveFactor = 1.0 + 0.12 * Math.sin(yVal * 0.12 - Date.now() * 0.002);
                    const currentRadius = arc.baseRadius * waveFactor;
                    
                    for (let i = 0; i <= segments; i++) {
                        const theta = thetaStart + (i / segments) * thetaLength;
                        
                        array[vIdx * 3] = Math.sin(theta) * currentRadius;
                        array[vIdx * 3 + 1] = yVal;
                        array[vIdx * 3 + 2] = Math.cos(theta) * currentRadius;
                        vIdx++;
                    }
                }
                position.needsUpdate = true;
            });
        }
        // Animate antennae wiggling (simulating active sonar scan)
        if (this.antennaL && this.antennaR) {
            const antTime = Date.now() * 0.012 * timeScale;
            this.antennaL.rotation.y = -0.25 + Math.sin(antTime) * 0.08;
            this.antennaL.rotation.x = 0.35 + Math.cos(antTime) * 0.04;
            this.antennaR.rotation.y = 0.25 + Math.sin(antTime + 1.5) * 0.08;
            this.antennaR.rotation.x = 0.35 + Math.cos(antTime + 1.5) * 0.04;
        }

        // Animate 8 legs walking with a rapid, scurrying staggered gait (2 legs moving at a time)
        this.walkCycle += this.speed * 0.08 * timeScale; // Reduced by half
        
        for (let i = 0; i < 4; i++) {
            const legL = this.legsL[i];
            const legR = this.legsR[i];
            
            // 4 leg pairs moving staggered: L0+R2, L1+R3, L2+R0, L3+R1
            const phaseL = this.walkCycle + i * (Math.PI / 2);
            const phaseR = this.walkCycle + ((i + 2) % 4) * (Math.PI / 2);
            
            // Shape the swing to snap forward quickly
            const swingL = Math.sin(phaseL + 0.25 * Math.sin(phaseL * 2));
            const swingR = Math.sin(phaseR + 0.25 * Math.sin(phaseR * 2));
            
            // Thigh swings forward and backward
            legL.thigh.rotation.x = swingL * 0.45;
            legR.thigh.rotation.x = swingR * 0.45;
            
            // Lift swinging-forward legs off the ground (swing > 0)
            // Left leg
            if (swingL > 0) {
                const liftL = Math.pow(swingL, 1.5); // Snappier lift curve
                legL.knee.rotation.x = legL.baseKneeRotX - liftL * 0.55;
                legL.position.y = 69 + liftL * 9;
                legL.ankle.rotation.x = legL.baseAnkleRotX + liftL * 0.3;
            } else {
                legL.knee.rotation.x = legL.baseKneeRotX;
                legL.position.y = 69;
                legL.ankle.rotation.x = legL.baseAnkleRotX;
            }
            
            // Right leg
            if (swingR > 0) {
                const liftR = Math.pow(swingR, 1.5); // Snappier lift curve
                legR.knee.rotation.x = legR.baseKneeRotX - liftR * 0.55;
                legR.position.y = 69 + liftR * 9;
                legR.ankle.rotation.x = legR.baseAnkleRotX + liftR * 0.3;
            } else {
                legR.knee.rotation.x = legR.baseKneeRotX;
                legR.position.y = 69;
                legR.ankle.rotation.x = legR.baseAnkleRotX;
            }
        }
        
        // Body bobbing/jitter when moving (relative to its local coordinate system, Y base is 0)
        if (this.body) {
            // Creepy rapid insect body jitter
            this.body.position.y = Math.sin(this.walkCycle * 2) * 2.0;
            this.body.position.z = Math.cos(this.walkCycle * 4) * 1.0;
            this.body.rotation.z = Math.sin(this.walkCycle * 4) * 0.06;
            this.body.rotation.y = Math.cos(this.walkCycle * 2) * 0.04;
        }

        if (this.state === 'chase' && player.health > 0) {
            let dxMove = (dx/distToTarget) * this.speed * timeScale;
            let dyMove = (dy/distToTarget) * this.speed * timeScale;
            if (!checkBuildingCollision(this.x + dxMove, this.y, this.size/2)) this.x += dxMove;
            if (!checkBuildingCollision(this.x, this.y + dyMove, this.size/2)) this.y += dyMove;
            this.group.rotation.y = Math.atan2(dx, dy);

            if (distToTarget < 400 && Date.now() - this.lastShot > (1000 + Math.random()*1000) / timeScale) {
                projectiles.push(new Projectile(this.x, this.y, dx/distToTarget, dy/distToTarget, false));
                this.lastShot = Date.now();
            }
        } else {
            let dxMove = Math.cos(this.angle) * this.speed * 0.5 * timeScale;
            let dyMove = Math.sin(this.angle) * this.speed * 0.5 * timeScale;
            
            if (checkBuildingCollision(this.x + dxMove, this.y + dyMove, this.size/2)) {
                this.angle += (Math.PI/2 + (Math.random()-0.5)) * timeScale; // bounce off wall
            } else {
                this.x += dxMove;
                this.y += dyMove;
            }

            if (Math.random() < 0.02 * timeScale) this.angle += (Math.random() - 0.5);
            
            if (this.x < 0 || this.x > WORLD_W) this.angle = Math.PI - this.angle;
            if (this.y < 0 || this.y > WORLD_H) this.angle = -this.angle;

            this.group.rotation.y = Math.atan2(Math.cos(this.angle), Math.sin(this.angle));
        }

        this.group.position.set(this.x, 0, this.y);

        let hitSize = player.controlDog ? 10 : player.radius;
        if (player.controlDog && distToTarget < this.size/2 + hitSize && player.health > 0) {
            player.health -= 0.5 * timeScale;
            updateHUD();
        }
    }
    destroy() {
        scene.remove(this.group);
        if (this.glowMat) this.glowMat.dispose();
        
        // Clean up scanner assets
        if (this.scanArcs) {
            this.scanArcs.forEach(arc => {
                arc.line.geometry.dispose();
                arc.line.material.dispose();
            });
        }
    }
}

class Projectile {
    constructor(x, y, dx, dy, isPlayer) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.speed = 12;
        this.isPlayer = isPlayer;
        this.life = 100;
        
        let color = isPlayer ? 0x00f0ff : 0xf59e0b; // Bright cyan neon vs enemy orange
        let mat = new THREE.MeshBasicMaterial({ color: color });
        
        if (this.isPlayer) {
            // Neon cyan spinning triangle (cone with 3 radial segments)
            this.mesh = new THREE.Mesh(coneGeo, mat);
            this.mesh.scale.set(6, 12, 6);
            // Spawn from the dog's chest/head height (around Y = 86)
            this.mesh.position.set(this.x, 86, this.y);
        } else {
            // Normal box bullet for enemies
            this.mesh = new THREE.Mesh(boxGeo, mat);
            this.mesh.scale.set(8, 8, 8);
            this.mesh.position.set(this.x, 20, this.y);
        }
        scene.add(this.mesh);
    }
    update() {
        this.x += this.dx * this.speed * timeScale;
        this.y += this.dy * this.speed * timeScale;
        this.mesh.position.set(this.x, this.mesh.position.y, this.y); // Keep the Y position of the mesh!
        this.life -= timeScale;
        
        if (this.isPlayer) {
            // Spin the triangle in space
            this.mesh.rotation.x += 0.08 * timeScale;
            this.mesh.rotation.y += 0.12 * timeScale;
            this.mesh.rotation.z += 0.05 * timeScale;
        }
        
        if (checkBuildingCollision(this.x, this.y, 4)) {
            this.life = 0; // kill projectile on wall hit
        }
    }
    destroy() {
        scene.remove(this.mesh);
    }
}

class Particle {
    constructor(x, y, colorHex, spawnZ) {
        this.x = x;
        this.y = y;
        this.z = spawnZ !== undefined ? spawnZ : 10 + Math.random() * 20;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 8 + 2;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.dz = (Math.random() - 0.2) * 8;
        this.life = 30 + Math.random() * 20;
        
        let mat = new THREE.MeshBasicMaterial({ color: colorHex });
        this.mesh = new THREE.Mesh(boxGeo, mat);
        this.mesh.scale.set(6, 6, 6);
        this.mesh.position.set(this.x, this.z, this.y);
        scene.add(this.mesh);
    }
    update() {
        this.x += this.dx * timeScale;
        this.y += this.dy * timeScale;
        this.z += this.dz * timeScale;
        this.dz -= 0.5 * timeScale; // gravity
        if (this.z < 0) this.z = 0;
        
        this.mesh.position.set(this.x, this.z, this.y);
        this.mesh.scale.multiplyScalar(1 - 0.05 * timeScale);
        this.life -= timeScale;
    }
    destroy() {
        scene.remove(this.mesh);
    }
}

class Building {
    constructor(x, y, w, h, overrideHeight) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        
        let height = overrideHeight !== undefined ? overrideHeight : 100 + Math.random() * 300;
        this.height = height; // Cache for rubber effect resets
        
        let colorHex = buildingPalette[Math.floor(Math.random() * buildingPalette.length)];
        
        this.bMat = new THREE.MeshStandardMaterial({ 
            color: colorHex, 
            map: buildingTexture,
            emissiveMap: buildingTexture,
            emissive: 0x000000,
            metalness: 0.1, 
            roughness: 0.9 
        });
        
        this.mesh = new THREE.Mesh(boxGeo, this.bMat);
        this.mesh.scale.set(w, height, h);
        this.mesh.position.set(x + w/2, height/2, y + h/2);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Edge highlighting (wireframe) - bright white for Joy Division aesthetic
        const edges = new THREE.EdgesGeometry(boxGeo);
        this.line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2a3233, transparent: true, opacity: 0.8 }));
        this.line.scale.set(w, height, h);
        this.line.position.copy(this.mesh.position);
        
        // Determine base color based on grid column to match floor
        let colIdx = Math.max(0, Math.min(19, Math.floor(this.x / (WORLD_W / 20))));
        this.glowColor = new THREE.Color(`hsl(${colIdx * (360/20)}, 100%, 50%)`);
        
        scene.add(this.mesh);
        scene.add(this.line);
    }
    
    update() {
        // Mesh position Z is the 2D Y coordinate
        let dx = this.mesh.position.x - player.x;
        let dy = this.mesh.position.z - player.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        let glowRadius = 500;
        if (dist < glowRadius) {
            let intensity = Math.pow(1 - (dist / glowRadius), 2); // Squared for smoother falloff
            this.bMat.emissive.copy(this.glowColor);
            this.bMat.emissiveIntensity = intensity * 1.5; // Strong glow
        } else {
            this.bMat.emissiveIntensity = 0;
        }

        // Effect 7: Tron Mode color cycling
        if (effectTronMode) {
            let time = Date.now() * 0.003 * timeScale;
            let factor = 0.5 + 0.5 * Math.sin(time + this.x * 0.005 + this.y * 0.005);
            this.line.material.color.copy(tronCyan).lerp(tronPink, factor);
        }

        // Effect 2: Rubber deformation
        if (effectRubberBuildings) {
            let time = Date.now() * 0.003;
            // Wobble scale and height using spatial waves
            let scaleY = this.height * (1 + 0.35 * Math.sin(time + this.x * 0.01 + this.y * 0.01));
            this.mesh.scale.y = scaleY;
            this.mesh.position.y = scaleY / 2;
            
            // Sync wireframe line scale
            this.line.scale.y = scaleY;
            this.line.position.y = scaleY / 2;

            // Wobble rotations (bending)
            let rotZ = 0.08 * Math.sin(time * 1.2 + this.x * 0.01);
            let rotX = 0.08 * Math.cos(time * 1.2 + this.y * 0.01);
            
            this.mesh.rotation.z = rotZ;
            this.mesh.rotation.x = rotX;
            this.line.rotation.z = rotZ;
            this.line.rotation.x = rotX;
        }
    }
}

class Collectable {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.mesh = new THREE.Mesh(boxGeo, matCollectable);
        this.mesh.scale.set(this.size, this.size, this.size);
        this.mesh.position.set(this.x, 15, this.y);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
    }
    update() {
        this.mesh.rotation.y += 0.05;
        this.mesh.rotation.x += 0.03;
        this.mesh.position.y = 15 + Math.sin(Date.now() * 0.005) * 5; // hover
    }
    destroy() {
        scene.remove(this.mesh);
    }
}

class HealthPack {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.group = new THREE.Group();
        this.group.position.set(this.x, 10, this.y);
        
        // White medical box body
        const crateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 });
        const crate = new THREE.Mesh(boxGeo, crateMat);
        crate.scale.set(12, 12, 12);
        crate.castShadow = true;
        crate.receiveShadow = true;
        this.group.add(crate);
        
        // Glowing red cross
        const crossMat = new THREE.MeshStandardMaterial({ 
            color: 0xef4444, 
            emissive: 0xef4444, 
            emissiveIntensity: 0.8,
            roughness: 0.2
        });
        this.crossGroup = new THREE.Group();
        this.crossGroup.position.set(0, 11, 0); // floats above the crate
        
        const barH = new THREE.Mesh(boxGeo, crossMat);
        barH.scale.set(8, 2.2, 2.2);
        const barV = new THREE.Mesh(boxGeo, crossMat);
        barV.scale.set(2.2, 8, 2.2);
        this.crossGroup.add(barH, barV);
        this.group.add(this.crossGroup);
        
        scene.add(this.group);
    }
    update() {
        // Rotate the floating cross
        this.crossGroup.rotation.y += 0.04;
        // Crate hovers slightly
        this.group.position.y = 10 + Math.sin(Date.now() * 0.004) * 3;
    }
    destroy() {
        scene.remove(this.group);
    }
}

// Global Entities
let player;
let bigDog;
let smoothCamDirX = 0;
let smoothCamDirZ = 1;
let cameraYaw = 0;
let cameraPitch = 0.3; // radians looking slightly down
let dogRailX = null;
let enemies = [];
let projectiles = [];
let particles = [];
let healthPacks = [];
let lastHealthPackSpawn = 0;
let buildings = [];
let collectables = [];
let lastCollectableSpawn = 0;
let empEffectRadius = 0;
let empActive = false;
let gameState = 'playing';
let empMesh;
let lightningBolts = [];

// Progression & Difficulty Scaling
let currentLevel = 1;
let currentProgress = 0;
let progressTarget = 3;

let screenShakeTimeout = null;
function triggerAutoScreenShake(durationMs) {
    effectScreenShake = true;
    updateEffectsHUD();
    if (screenShakeTimeout) clearTimeout(screenShakeTimeout);
    screenShakeTimeout = setTimeout(() => {
        effectScreenShake = false;
        updateEffectsHUD();
    }, durationMs);
}

function levelUp() {
    currentLevel++;
    currentProgress = 0;
    progressTarget = 2 + currentLevel; // Level 2: 4 cubes, Level 3: 5 cubes, etc.
    
    // Level up visual notification banner
    if (uiLevelUpBanner) {
        uiLevelUpBanner.textContent = `LEVEL ${currentLevel}`;
        uiLevelUpBanner.classList.remove('hidden');
        
        // Force Reflow to restart CSS Animation
        uiLevelUpBanner.style.animation = 'none';
        uiLevelUpBanner.offsetHeight; 
        uiLevelUpBanner.style.animation = null;
        
        setTimeout(() => {
            uiLevelUpBanner.classList.add('hidden');
        }, 2000);
    }
    
    // Rewards
    player.health = player.maxHealth; // Full health restore!
    bigDog.dogScale += 0.2; // Extra dog growth reward
    
    // Difficulty Scaling: Increase Speed on all existing enemies
    let extraSpeed = (currentLevel - 1) * 0.35;
    enemies.forEach(e => {
        e.speed = (1.5 + Math.random()) + extraSpeed;
    });
    
    // Difficulty Scaling: Spawn extra enemies
    let spawnCount = 3;
    for (let i = 0; i < spawnCount; i++) {
        let ex, ey;
        let attempts = 0;
        do {
            ex = Math.random() * WORLD_W;
            ey = Math.random() * WORLD_H;
            attempts++;
        } while (attempts < 100 && checkBuildingCollision(ex, ey, 25));
        enemies.push(new Enemy(ex, ey));
    }
    
    // Visual flash/shake impact
    triggerAutoScreenShake(1000);
    updateHUD();
}

function init() {
    // Reset timestep clock to prevent lag spikes from triggering multiple catch-up updates
    lastTime = performance.now();
    accumulator = 0;

    // Clean up previous scene objects
    if (player) player.destroy();
    if (bigDog) bigDog.destroy();
    enemies.forEach(e => e.destroy());
    projectiles.forEach(p => p.destroy());
    particles.forEach(p => p.destroy());
    collectables.forEach(c => c.destroy());
    if (healthPacks) healthPacks.forEach(h => h.destroy());
    if (empMesh) scene.remove(empMesh);
    
    // Clean up previous boundary lightning
    if (boundaryLightningMesh) {
        scene.remove(boundaryLightningMesh);
        boundaryLightningMesh.geometry.dispose();
        boundaryLightningMesh.material.dispose();
        boundaryLightningMesh = null;
    }
    lightningBolts = [];
    
    // Reset arrays (Note: Buildings remain the same to avoid rebuilding geometry)
    enemies = [];
    projectiles = [];
    particles = [];
    collectables = [];
    healthPacks = [];
    lastCollectableSpawn = Date.now();
    lastHealthPackSpawn = Date.now();
    empEffectRadius = 0;
    empActive = false;
    gameState = 'playing';
    
    // Reset progression state
    currentLevel = 1;
    currentProgress = 0;
    progressTarget = 3;
    
    player = new Player();
    bigDog = new BigDog();

    // Create boundary lightning bolts (3 stacked bars in Cyan, Yellow, and Red using InstancedMesh)
    const numSegmentsPerBolt = 15;
    const totalBolts = 12; // 4 sides * 3 heights
    const totalInstances = totalBolts * numSegmentsPerBolt;

    const boltGeo = new THREE.BoxGeometry(1, 1, 1); // Unit box, scaled dynamically
    const boltMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85
    });

    boundaryLightningMesh = new THREE.InstancedMesh(boltGeo, boltMat, totalInstances);
    boundaryLightningMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(boundaryLightningMesh);

    const lightningSpecs = [
        // Left boundary
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(0, 0, WORLD_H) },
        // Right boundary
        { start: new THREE.Vector3(WORLD_W, 0, 0), end: new THREE.Vector3(WORLD_W, 0, WORLD_H) },
        // Top boundary
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(WORLD_W, 0, 0) },
        // Bottom boundary
        { start: new THREE.Vector3(0, 0, WORLD_H), end: new THREE.Vector3(WORLD_W, 0, WORLD_H) }
    ];

    const boltHeights = [15, 45, 75];
    const boltColors = [0x52d1dc, 0xf5af3d, 0xff3356]; // Cyan, Yellow, Red

    let instanceIdx = 0;
    lightningSpecs.forEach(spec => {
        boltHeights.forEach((height, hIdx) => {
            const startPt = spec.start.clone().setY(height);
            const endPt = spec.end.clone().setY(height);
            const colorHex = boltColors[hIdx];
            
            const dir = new THREE.Vector3().subVectors(endPt, startPt);
            const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
            
            const bolt = {
                start: startPt,
                end: endPt,
                dir: dir.clone().normalize(),
                perp: perp,
                length: dir.length(),
                color: new THREE.Color(colorHex),
                colorHex: colorHex,
                numSegments: numSegmentsPerBolt,
                startIndex: instanceIdx
            };
            
            lightningBolts.push(bolt);
            
            // Assign instance colors for this bolt
            for (let i = 0; i < numSegmentsPerBolt; i++) {
                boundaryLightningMesh.setColorAt(instanceIdx + i, bolt.color);
            }
            instanceIdx += numSegmentsPerBolt;
        });
    });
    boundaryLightningMesh.instanceColor.needsUpdate = true;
    
    if (buildings.length === 0) {
        const numRows = 15;
        const colsPerRow = 20;
        const spacingX = WORLD_W / colsPerRow;
        const spacingY = WORLD_H / numRows;
        
        for (let r = 0; r < numRows; r++) {
            let rowY = r * spacingY + (Math.random() * spacingY * 0.1);
            for (let c = 0; c < colsPerRow; c++) {
                let colX = c * spacingX + (Math.random() * spacingX * 0.1);
                
                // Gaussian curve based on distance from center X
                let distFromCenterX = Math.abs(colX - WORLD_W/2);
                let bell = Math.exp(-(distFromCenterX * distFromCenterX) / 500000); 
                
                // Add noise for jagged peaks
                let noise = Math.random() * 0.8 + 0.2; 
                
                // Base height + curve height (Much lower now)
                let height = 10 + (bell * noise * 300);
                
                let w = spacingX * 0.45; // Much wider gaps for navigation
                let h = spacingY * 0.45;
                
                // Leave a spawn clearing in the very center
                if (Math.abs(colX - WORLD_W/2) < 250 && Math.abs(rowY - WORLD_H/2) < 250) {
                    continue; 
                }
                
                buildings.push(new Building(colX, rowY, w, h, height));
            }
        }
    }

    for(let i=0; i<15; i++) {
        let ex, ey;
        let attempts = 0;
        do {
            ex = Math.random() * WORLD_W;
            ey = Math.random() * WORLD_H;
            attempts++;
        } while (attempts < 100 && checkBuildingCollision(ex, ey, 25)); // Enemy size is 50, so radius 25
        
        enemies.push(new Enemy(ex, ey));
    }

    // Spawn initial health packs
    for(let i=0; i<5; i++) {
        let hx, hy;
        let attempts = 0;
        do {
            hx = Math.random() * WORLD_W;
            hy = Math.random() * WORLD_H;
            attempts++;
        } while (attempts < 100 && checkBuildingCollision(hx, hy, 20));
        healthPacks.push(new HealthPack(hx, hy));
    }

    // EMP Mesh setup
    const empGeo = new THREE.SphereGeometry(1, 32, 32);
    const empMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5, wireframe: true });
    empMesh = new THREE.Mesh(empGeo, empMat);
    empMesh.visible = false;
    scene.add(empMesh);

    uiGameOver.classList.add('hidden');
    updateHUD();
}

function updateHUD() {
    if (uiLevel) uiLevel.textContent = currentLevel;
    if (uiProgress) uiProgress.textContent = `${currentProgress} / ${progressTarget}`;

    if (player.controlDog) {
        uiMode.textContent = 'ROBO DOG';
        uiMode.className = 'value text-mech';
        uiEMP.textContent = player.empReady ? 'READY (Press E/X)' : 'OFFLINE';
    } else {
        uiMode.textContent = 'ON FOOT (STEALTH)';
        uiMode.className = 'value text-accent';
        uiEMP.textContent = 'ROBO DOG REQUIRED';
    }

    let hpPct = Math.max(0, (player.health / player.maxHealth) * 100);
    uiHealth.style.width = hpPct + '%';
    uiHealth.className = 'health-bar-fill';
    if (hpPct < 30) uiHealth.classList.add('critical');
    else if (hpPct < 60) uiHealth.classList.add('warning');
}

function fireEMP() {
    empActive = true;
    player.empReady = false;
    player.lastEmpTime = Date.now();
    empEffectRadius = 0;
    let originMesh = (player.controlDog && bigDog && bigDog.active) ? bigDog.group : player.group;
    empMesh.position.copy(originMesh.position);
    empMesh.visible = true;
    updateHUD();
    triggerAutoScreenShake(4000); // 4-second shake during EMP pulse
}

function evaluateAutoEffects() {
    if (gameState !== 'playing') {
        // Reset everything on Game Over / Idle to restore normal visuals
        effectFloorFlash = false;
        effectFloorScroll = false;
        effectFilmNoir = false;
        effectRubberBuildings = false;
        effectCamZoom = false;
        effectTimeDilation = false;
        timeScale = 1.0;
        effectCameraRoll = false;
        effectTronMode = false;
        
        const vignette = document.getElementById('vignette-overlay');
        if (vignette) vignette.classList.remove('active');
        if (ambientLight) ambientLight.intensity = 0.4;
        if (groundMat) groundMat.color.setHex(0xffffff);
        if (camera) camera.up.set(0, 1, 0);
        return;
    }

    // 1. Mode-based triggers
    if (player && player.controlDog) {
        effectFloorFlash = true;
        effectFloorScroll = true;
        effectFilmNoir = false;
    } else {
        effectFloorFlash = false;
        effectFloorScroll = false;
        effectFilmNoir = true;
    }

    // 2. Health-based hallucinations (< 40% health)
    if (player && player.health < 40 && player.health > 0) {
        effectRubberBuildings = true;
        effectCamZoom = true;
    } else {
        effectRubberBuildings = false;
        effectCamZoom = false;
    }

    // 3. Critical health slowdown (< 20% health)
    if (player && player.health < 20 && player.health > 0) {
        effectTimeDilation = true;
        timeScale = 0.20;
        effectCameraRoll = true;
    } else {
        effectTimeDilation = false;
        timeScale = 1.0;
        effectCameraRoll = false;
        if (camera) camera.up.set(0, 1, 0); // Reset camera tilt
    }

    // 4. EMP visual overrides
    if (empActive) {
        effectTronMode = true;
    } else {
        effectTronMode = false;
    }

    // Apply the high-performance vignette overlay and dim lighting for stealth (cheap!)
    const vignette = document.getElementById('vignette-overlay');
    if (effectFilmNoir) {
        if (vignette) vignette.classList.add('active');
        if (ambientLight) ambientLight.intensity = 0.15; // Dark stealth lighting
    } else {
        if (vignette) vignette.classList.remove('active');
        if (ambientLight) ambientLight.intensity = 0.4;  // Normal action lighting
    }

    // Sync neon strobes / wireframes
    if (groundMat && !effectFloorFlash) {
        groundMat.color.setHex(0xffffff);
    }
    
    if (buildings) {
        buildings.forEach(b => {
            b.mesh.visible = !effectTronMode;
            if (!effectTronMode && b.line) {
                b.line.material.color.setHex(0x2a3233);
            }
        });
    }

    updateEffectsHUD();
}

function update() {
    updateGamepad();
    evaluateAutoEffects();

    if (gameState === 'playing') {
        player.update();
        bigDog.update();

        if (player.health <= 0) {
            gameState = 'gameover';
            gameOverTitle.textContent = "MECH DESTROYED";
            gameOverTitle.style.color = "#ef4444";
            gameOverMessage.textContent = "The AI swarm was too much.";
            uiGameOver.classList.remove('hidden');
        }

        if (empActive) {
            empEffectRadius += 30;
            empMesh.scale.set(empEffectRadius, empEffectRadius, empEffectRadius);
            empMesh.material.opacity = Math.max(0, 1 - empEffectRadius/2000);

            if (empEffectRadius > 2000) {
                empActive = false;
                empMesh.visible = false;
                // No more Game Over here!
            }
            
            for(let i=enemies.length-1; i>=0; i--) {
                let e = enemies[i];
                let dx = e.x - player.x;
                let dy = e.y - player.y;
                if (Math.sqrt(dx*dx + dy*dy) < empEffectRadius) {
                    for(let j=0; j<15; j++) particles.push(new Particle(e.x, e.y, 0xf43f5e, 75));
                    e.destroy();
                    enemies.splice(i, 1);
                }
            }
            
            let dx = bigDog.x - player.x;
            let dy = bigDog.y - player.y;
            if (Math.sqrt(dx*dx + dy*dy) < empEffectRadius && bigDog.active && !bigDog.isParachuting) {
                bigDog.active = false;
                for(let j=0; j<20; j++) particles.push(new Particle(bigDog.x, bigDog.y, 0xfbbf24, 84));
            }
        }
        
        // EMP Cooldown Logic
        if (!player.empReady && !empActive) {
            let elapsed = Date.now() - player.lastEmpTime;
            if (elapsed > 10000) {
                player.empReady = true;
                if (!bigDog.active) {
                    // Respawn Big Dog with Parachute
                    bigDog.active = true;
                    bigDog.dogScale = 1.0;
                    bigDog.altitude = 600;
                    bigDog.isParachuting = true;
                    bigDog.x = player.x + 30;
                    bigDog.y = player.y + 30;
                }
                updateHUD();
            } else {
                let timeLeft = 10 - Math.floor(elapsed / 1000);
                uiEMP.textContent = `RECHARGING... (${timeLeft}s)`;
            }
        }
        
        // Spawn Collectables
        if (Date.now() - lastCollectableSpawn > 5000) {
            let cx, cy;
            let attempts = 0;
            do {
                cx = Math.random() * WORLD_W;
                cy = Math.random() * WORLD_H;
                attempts++;
            } while (attempts < 100 && checkBuildingCollision(cx, cy, 20));
            collectables.push(new Collectable(cx, cy));
            lastCollectableSpawn = Date.now();
        }
        
        // Update Collectables & Player Collision
        for (let i = collectables.length - 1; i >= 0; i--) {
            let c = collectables[i];
            c.update();
            let checkX = player.controlDog && bigDog && bigDog.active ? bigDog.x : player.x;
            let checkY = player.controlDog && bigDog && bigDog.active ? bigDog.y : player.y;
            let dx = checkX - c.x;
            let dy = checkY - c.y;
            let radius = player.controlDog ? 10 : player.radius;
            if (Math.sqrt(dx*dx + dy*dy) < radius + c.size) {
                bigDog.dogScale += 0.1; // Big dog grows!
                for(let k=0; k<15; k++) particles.push(new Particle(c.x, c.y, 0x10b981, 15));
                c.destroy();
                collectables.splice(i, 1);
                
                // Progression logic
                currentProgress++;
                if (currentProgress >= progressTarget) {
                    levelUp();
                } else {
                    updateHUD();
                }
            }
        }

        // Spawn Health Packs
        if (Date.now() - lastHealthPackSpawn > 15000) {
            let hx, hy;
            let attempts = 0;
            do {
                hx = Math.random() * WORLD_W;
                hy = Math.random() * WORLD_H;
                attempts++;
            } while (attempts < 100 && checkBuildingCollision(hx, hy, 20));
            healthPacks.push(new HealthPack(hx, hy));
            lastHealthPackSpawn = Date.now();
        }

        // Update Health Packs & Player Collision
        for (let i = healthPacks.length - 1; i >= 0; i--) {
            let h = healthPacks[i];
            h.update();
            let checkX = player.controlDog && bigDog && bigDog.active ? bigDog.x : player.x;
            let checkY = player.controlDog && bigDog && bigDog.active ? bigDog.y : player.y;
            let dx = checkX - h.x;
            let dy = checkY - h.y;
            let radius = player.controlDog ? 10 : player.radius;
            if (Math.sqrt(dx*dx + dy*dy) < radius + h.size) {
                // Restore 50% health (50 points)
                player.health = Math.min(player.maxHealth, player.health + 50);
                
                // Spawn glowing red/white particles on pickup
                for(let k=0; k<15; k++) {
                    let pColor = k % 2 === 0 ? 0xffffff : 0xef4444;
                    particles.push(new Particle(h.x, h.y, pColor, 10));
                }
                
                h.destroy();
                healthPacks.splice(i, 1);
                updateHUD();
            }
        }

        enemies.forEach(e => e.update());
        buildings.forEach(b => b.update());
        
        if (boundaryLightningMesh) {
            let instanceIdx = 0;
            let time = Date.now() * 0.003;
            
            // Pulse boundary opacity smoothly
            boundaryLightningMesh.material.opacity = 0.7 + 0.3 * Math.sin(time * 1.5);
            
            lightningBolts.forEach((bolt, boltIdx) => {
                const points = [];
                points.push(bolt.start);
                
                for (let i = 1; i < bolt.numSegments; i++) {
                    const t = i / bolt.numSegments;
                    const p = new THREE.Vector3().copy(bolt.start).addScaledVector(bolt.dir, t * bolt.length);
                    
                    // Smooth waves with minimal random noise jitter
                    const waveX = Math.sin(time * 2.5 + i * 0.5 + boltIdx) * 8;
                    const waveY = Math.cos(time * 3.5 + i * 0.3 + boltIdx) * 5;
                    
                    const noiseX = (Math.random() - 0.5) * 2;
                    const noiseY = (Math.random() - 0.5) * 1;
                    
                    p.addScaledVector(bolt.perp, waveX + noiseX);
                    p.y += waveY + noiseY;
                    points.push(p);
                }
                points.push(bolt.end);
                
                // Determine Tron Color overlay
                let boltColor = bolt.color;
                if (effectTronMode) {
                    let factor = 0.5 + 0.5 * Math.sin(time + boltIdx);
                    boltColor = new THREE.Color(tronCyan).lerp(tronPink, factor);
                }
                
                for (let i = 0; i < bolt.numSegments; i++) {
                    const pA = points[i];
                    const pB = points[i + 1];
                    
                    _mid.addVectors(pA, pB).multiplyScalar(0.5);
                    _dir.subVectors(pB, pA);
                    const len = _dir.length();
                    _dir.normalize();
                    
                    _quat.setFromUnitVectors(_zAxis, _dir);
                    
                    // Scale thickness: 7.0 to 10.0 unit thick boxes (twice as thick, smoother pulse!)
                    const thickness = 7.0 + 3.0 * Math.sin(time * 2.5 + i + boltIdx);
                    _scale.set(thickness, thickness, len);
                    
                    _matrix.compose(_mid, _quat, _scale);
                    boundaryLightningMesh.setMatrixAt(instanceIdx + i, _matrix);
                    
                    if (effectTronMode) {
                        boundaryLightningMesh.setColorAt(instanceIdx + i, boltColor);
                    } else {
                        boundaryLightningMesh.setColorAt(instanceIdx + i, bolt.color);
                    }
                }
                
                instanceIdx += bolt.numSegments;
            });
            
            boundaryLightningMesh.instanceMatrix.needsUpdate = true;
            boundaryLightningMesh.instanceColor.needsUpdate = true;
        }
        
        for(let i=projectiles.length-1; i>=0; i--) {
            let p = projectiles[i];
            p.update();
            if (p.life <= 0) {
                p.destroy();
                projectiles.splice(i, 1);
                continue;
            }

            if (p.isPlayer) {
                for(let j=enemies.length-1; j>=0; j--) {
                    let e = enemies[j];
                    let dx = e.x - p.x;
                    let dy = e.y - p.y;
                    if (Math.sqrt(dx*dx + dy*dy) < e.size/2) {
                        e.health -= 10;
                        p.destroy();
                        projectiles.splice(i, 1);
                        // Spawn particles at correct bullet hit height
                        for(let k=0; k<5; k++) particles.push(new Particle(p.x, p.y, 0xf59e0b, p.mesh.position.y));
                        if (e.health <= 0) {
                            for(let k=0; k<20; k++) particles.push(new Particle(e.x, e.y, 0xef4444, 75));
                            e.destroy();
                            enemies.splice(j, 1);
                        }
                        break;
                    }
                }
            } else {
                if (player.controlDog && player.health > 0) {
                    let dx = bigDog.x - p.x;
                    let dy = bigDog.y - p.y;
                    if (Math.sqrt(dx*dx + dy*dy) < 15) { // Hitbox size for dog
                        player.health -= 5;
                        updateHUD();
                        p.destroy();
                        projectiles.splice(i, 1);
                        // Spawn particles at correct bullet hit height
                        for(let k=0; k<5; k++) particles.push(new Particle(p.x, p.y, 0x38bdf8, p.mesh.position.y));
                        triggerAutoScreenShake(300); // Shake screen on hit impact
                    }
                }
            }
        }

        for(let i=particles.length-1; i>=0; i--) {
            particles[i].update();
            if (particles[i].life <= 0) {
                particles[i].destroy();
                particles.splice(i, 1);
            }
        }

        // Effect 1: Floor hue cycle
        if (effectFloorFlash && groundMat) {
            let hue = (Date.now() / 800) % 1;
            groundMat.color.setHSL(hue, 1.0, 0.6);
        }

        // Effect 5: Fractal texture update
        if (effectFractals) {
            animateFractalTexture();
        }

        // Effect 6: Hyperspace Floor Scroll
        if (effectFloorScroll && groundMat && groundMat.map) {
            groundMat.map.offset.x += 0.02 * timeScale;
            groundMat.map.offset.y += 0.02 * timeScale;
        }

        // Effect 10: Dizzy Camera Roll
        if (effectCameraRoll) {
            let angle = Math.sin(Date.now() * 0.0025) * 0.35;
            camera.up.set(Math.sin(angle), Math.cos(angle), 0).normalize();
        }

        // Camera follow
        let checkX = player.controlDog && bigDog && bigDog.active ? bigDog.x : player.x;
        let checkY = player.controlDog && bigDog && bigDog.active ? bigDog.y : player.y;

        let targetCamX = checkX;
        let targetCamY = camDistance;
        let targetCamZ = checkY + camDistance;
        let lookTarget = new THREE.Vector3(checkX, 20, checkY);

        if (!effectCamZoom) {
            if (player.controlDog && bigDog && bigDog.active) {
                // Cinematic Rail Camera (locks tracking line while panning horizontally)
                if (dogRailX === null) {
                    dogRailX = bigDog.x;
                }
                // Rail X coordinate tracks the player very slowly (lagging/smooth)
                dogRailX += (bigDog.x - dogRailX) * 0.015 * timeScale;
                
                // Base distance scales with dog size
                const baseDist = 220 * bigDog.dogScale;
                
                // Position camera on the rail (to the side/behind, locked in X offset but tracks Z directly)
                targetCamX = dogRailX - baseDist * 0.8;
                targetCamZ = bigDog.y - baseDist * 0.5;
                targetCamY = 110 * bigDog.dogScale;
                
                // Look target is centered exactly on the Robo Dog
                lookTarget.set(bigDog.x, 35 * bigDog.dogScale, bigDog.y);
            } else {
                // Reset dogRailX when not playing as the dog
                dogRailX = null;
                
                // Over-the-shoulder orbiting camera (Started main camera)
                // Make base camera 2x further (260 vs 130) and scale further as the dog grows
                let baseDist = 260;
                if (isMobile && window.innerHeight > window.innerWidth) {
                    baseDist = 360; // Zoom out for mobile portrait mode
                }
                let targetDist = baseDist * (bigDog ? bigDog.dogScale : 1.0);
                if (camDistance < targetDist) {
                    camDistance = Math.min(targetDist, camDistance + 5.0);
                } else {
                    camDistance = Math.max(targetDist, camDistance - 5.0);
                }
                
                const targetDirX = Math.sin(cameraYaw);
                const targetDirZ = Math.cos(cameraYaw);
                
                // Lerp the direction vector for ultra-smooth orbiting (prevents angular snapping)
                smoothCamDirX += (targetDirX - smoothCamDirX) * 0.08;
                smoothCamDirZ += (targetDirZ - smoothCamDirZ) * 0.08;
                
                const len = Math.sqrt(smoothCamDirX * smoothCamDirX + smoothCamDirZ * smoothCamDirZ);
                const forwardX = len > 0 ? smoothCamDirX / len : 0;
                const forwardZ = len > 0 ? smoothCamDirZ / len : 1;
                
                const rightX = forwardZ;
                const rightZ = -forwardX;
                
                const pitchCos = Math.cos(cameraPitch);
                const pitchSin = Math.sin(cameraPitch);
                
                // Position behind and slightly to the right (over the shoulder)
                targetCamX = checkX - forwardX * (camDistance * pitchCos) + rightX * 18;
                targetCamZ = checkY - forwardZ * (camDistance * pitchCos) + rightZ * 18;
                targetCamY = 50 + camDistance * pitchSin; // Adjust height based on pitch
                
                // Look ahead of the player at height
                lookTarget.set(
                    checkX + forwardX * 60,
                    70,
                    checkY + forwardZ * 60
                );
            }
        } else {
            // Isometric / Overhead view (Zoom effect)
            // Make base camera 2x further (800 vs 400) and scale further as the dog grows
            let baseDist = 800;
            if (isMobile && window.innerHeight > window.innerWidth) {
                baseDist = 1100; // Zoom out for mobile portrait mode
            }
            let targetDist = baseDist * (bigDog ? bigDog.dogScale : 1.0);
            if (camDistance < targetDist) {
                camDistance = Math.min(targetDist, camDistance + 6.0);
            } else {
                camDistance = Math.max(targetDist, camDistance - 6.0);
            }
            targetCamX = checkX;
            targetCamY = camDistance;
            targetCamZ = checkY + camDistance;
            lookTarget.set(checkX, 20, checkY);
        }

        camera.position.x += (targetCamX - camera.position.x) * 0.1;
        camera.position.y += (targetCamY - camera.position.y) * 0.1;
        camera.position.z += (targetCamZ - camera.position.z) * 0.1;

        if (effectScreenShake) {
            let shakeIntensity = 12.0;
            camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            camera.position.z += (Math.random() - 0.5) * shakeIntensity;
            camera.lookAt(
                lookTarget.x + (Math.random() - 0.5) * shakeIntensity * 0.5,
                lookTarget.y + (Math.random() - 0.5) * shakeIntensity * 0.5,
                lookTarget.z + (Math.random() - 0.5) * shakeIntensity * 0.5
            );
        } else {
            camera.lookAt(lookTarget);
        }
        
        // Follow light
        dirLight.position.set(camera.position.x + 100, 500, camera.position.z - 200);

    } else {
        if (gameState === 'gameover') {
            // Climb high into the sky
            const targetCamX = player.x;
            const targetCamY = 1200; // high above
            const targetCamZ = player.y + 200; // slightly offset in Z to keep looking at player from angle
            
            camera.position.x += (targetCamX - camera.position.x) * 0.03;
            camera.position.y += (targetCamY - camera.position.y) * 0.03;
            camera.position.z += (targetCamZ - camera.position.z) * 0.03;
            
            camera.lookAt(player.x, 0, player.y);
            
            // Keep updating directional light so shadows adjust
            dirLight.position.set(camera.position.x + 100, 500, camera.position.z - 200);

            // Also continue updating particles during gameover for a nice explosion decay
            for(let i=particles.length-1; i>=0; i--) {
                particles[i].update();
                if (particles[i].life <= 0) {
                    particles[i].destroy();
                    particles.splice(i, 1);
                }
            }
        }

        if (keys['KeyR'] || justPressed(9) || justPressed(0)) {
            init();
        }
    }
}

let lastTime = performance.now();
let accumulator = 0;
const dt = 1000 / 60; // 16.67 ms (60 FPS target update rate)

function draw(timestamp) {
    renderer.render(scene, camera);
    requestAnimationFrame((nextTimestamp) => {
        const currentTS = nextTimestamp || performance.now();
        let elapsed = currentTS - lastTime;
        
        // Prevent spiral of death on tab switch or lag spikes
        if (elapsed > 250) elapsed = 250;
        
        lastTime = currentTS;
        accumulator += elapsed;
        
        while (accumulator >= dt) {
            update();
            accumulator -= dt;
        }
        
        draw(currentTS);
    });
}

function setupMobileControls() {
    const mobileContainer = document.getElementById('mobile-controls-container');
    if (!isMobile) {
        if (mobileContainer) mobileContainer.style.display = 'none';
        return;
    }
    if (mobileContainer) mobileContainer.classList.remove('hidden');

    const leftBase = document.getElementById('left-stick-base');
    const leftHandle = document.getElementById('left-stick-handle');
    const rightBase = document.getElementById('right-stick-base');
    const rightHandle = document.getElementById('right-stick-handle');

    const maxRadius = 45; // Max displacement in pixels

    function initJoystick(baseEl, handleEl, stickState) {
        if (!baseEl || !handleEl) return;

        baseEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            stickState.touchId = touch.identifier;
            const rect = baseEl.getBoundingClientRect();
            stickState.active = true;
            stickState.centerX = rect.left + rect.width / 2;
            stickState.centerY = rect.top + rect.height / 2;
            updateHandle(touch);
        }, { passive: false });

        baseEl.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!stickState.active) return;
            
            // Find touch with stored identifier
            let touch = null;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === stickState.touchId) {
                    touch = e.touches[i];
                    break;
                }
            }
            if (touch) updateHandle(touch);
        }, { passive: false });

        function updateHandle(touch) {
            if (!touch) return;
            const tx = touch.clientX - stickState.centerX;
            const ty = touch.clientY - stickState.centerY;
            const dist = Math.sqrt(tx * tx + ty * ty);
            
            let finalX = tx;
            let finalY = ty;
            
            if (dist > maxRadius) {
                finalX = (tx / dist) * maxRadius;
                finalY = (ty / dist) * maxRadius;
            }
            
            handleEl.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;
            
            // Normalize values (-1 to 1)
            stickState.dx = finalX / maxRadius;
            stickState.dy = finalY / maxRadius;
        }

        const handleTouchEnd = (e) => {
            let touchEnded = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === stickState.touchId) {
                    touchEnded = true;
                    break;
                }
            }
            if (touchEnded) {
                stickState.active = false;
                stickState.dx = 0;
                stickState.dy = 0;
                handleEl.style.transform = 'translate(-50%, -50%)';
            }
        };

        baseEl.addEventListener('touchend', handleTouchEnd);
        baseEl.addEventListener('touchcancel', handleTouchEnd);
    }

    initJoystick(leftBase, leftHandle, mobileInput.leftStick);
    initJoystick(rightBase, rightHandle, mobileInput.rightStick);

    // Setup action buttons
    const btnSwitch = document.getElementById('mobile-btn-switch');
    const btnEmp = document.getElementById('mobile-btn-emp');
    const btnEffect = document.getElementById('mobile-btn-effect');

    if (btnSwitch) {
        btnSwitch.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'playing' && player && Date.now() - player.lastToggle > 500) {
                player.controlDog = !player.controlDog;
                player.lastToggle = Date.now();
                updateHUD();
            } else if (gameState === 'gameover') {
                init();
            }
        }, { passive: false });
    }

    if (btnEmp) {
        btnEmp.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'playing' && player && player.empReady && player.controlDog) {
                fireEMP();
            }
        }, { passive: false });
    }

    if (btnEffect) {
        btnEffect.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'playing') {
                // Cycle to a random effect (from 1 to 10)
                const effectId = Math.floor(Math.random() * 10) + 1;
                toggleEffect(effectId);
            }
        }, { passive: false });
    }
}

btnRestart.addEventListener('click', init);

setupMobileControls();
init();
update();
draw();
