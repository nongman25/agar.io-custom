
(function() {
    // Game Canvas and Context
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const scoreEl = document.getElementById('score');
    const startScreen = document.getElementById('startScreen');
    const playButton = document.getElementById('playButton');
    const playerNameInput = document.getElementById('playerNameInput');

    // Game State
    let gameActive = false;
    let cells = [];
    let foods = [];
    let viruses = [];

    // Game Constants
    const MAP_SIZE = { width: 3000, height: 3000 };
    const FOOD_COUNT = 200;
    const VIRUS_COUNT = 15;
    const PLAYER_START_MASS = 20;
    const MERGE_COOLDOWN_FRAMES = 1800; // 30 seconds at 60fps
    const MIN_MASS_TO_SPLIT = 32;
    const MAX_CELLS = 16;
    const VIRUS_MIN_MASS_TO_POP = 128;
    const VIRUS_MASS_BOOST = 100;

    // Mouse Tracking
    const mouse = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    };

    // --- UTILITY FUNCTIONS ---
    const getRandomColor = () => `hsl(${Math.random() * 360}, 70%, 60%)`;
    const getRandomPosition = (radius) => ({
        x: Math.random() * (MAP_SIZE.width - radius * 2) + radius,
        y: Math.random() * (MAP_SIZE.height - radius * 2) + radius
    });

    // --- CLASSES ---

    class Entity {
        constructor(x, y, mass, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.velocity = { x: 0, y: 0 };
            this.setMass(mass);
        }

        setMass(mass) {
            this.mass = mass;
            this.radius = Math.sqrt(this.mass) * 4;
        }

        draw(camera) {
            const screenPos = camera.worldToScreen(this.x, this.y);
            const screenRadius = this.radius * camera.zoom;

            ctx.save();
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }
    }

    class PlayerCell extends Entity {
        constructor(x, y, mass, color, name = '') {
            super(x, y, mass, color);
            this.name = name;
            this.mergeCooldown = 0;
        }

        draw(camera) {
            const screenPos = camera.worldToScreen(this.x, this.y);
            const screenRadius = this.radius * camera.zoom;
            
            ctx.save();
            ctx.globalAlpha = this.mergeCooldown > 0 ? 0.75 : 1;
            
            // Cell Body
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.lineWidth = Math.max(1, screenRadius * 0.05);
            ctx.stroke();
            ctx.closePath();
            
            ctx.globalAlpha = 1;

            // Text
            const fontSize = Math.max(screenRadius / 3, 12);
            ctx.fillStyle = 'white';
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.name, screenPos.x, screenPos.y - fontSize * 0.2);
            ctx.font = `bold ${fontSize * 0.8}px Arial`;
            ctx.fillText(Math.floor(this.mass), screenPos.x, screenPos.y + fontSize * 0.8);
            
            ctx.restore();
        }

        update(worldMouse) {
            if (this.mergeCooldown > 0) {
                this.mergeCooldown--;
            }

            const speed = 30 / this.radius;
            const dx = worldMouse.x - this.x;
            const dy = worldMouse.y - this.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.hypot(dx, dy);

            if (dist > 1) {
                this.x += Math.cos(angle) * speed;
                this.y += Math.sin(angle) * speed;
            }
            
            this.x += this.velocity.x;
            this.y += this.velocity.y;

            // Friction
            this.velocity.x *= 0.98;
            this.velocity.y *= 0.98;

            // Boundary collision
            this.x = Math.max(this.radius, Math.min(this.x, MAP_SIZE.width - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, MAP_SIZE.height - this.radius));
        }
        
        eat(food) {
            this.setMass(this.mass + food.mass);
        }
    }

    class Food extends Entity {
        constructor(x, y) {
            super(x, y, 1, `hsl(${Math.random() * 360}, 70%, 50%)`);
        }
    }

    class Virus extends Entity {
        constructor(x, y) {
            super(x, y, 100, '#33ff33');
        }

        draw(camera) {
            const screenPos = camera.worldToScreen(this.x, this.y);
            const screenRadius = this.radius * camera.zoom;

            ctx.save();
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 15; i++) {
                const angle = (i / 15) * Math.PI * 2;
                const r = screenRadius * (i % 2 === 0 ? 1 : 0.7);
                ctx.lineTo(screenPos.x + r * Math.cos(angle), screenPos.y + r * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    class Camera {
        constructor() {
            this.x = MAP_SIZE.width / 2;
            this.y = MAP_SIZE.height / 2;
            this.zoom = 1;
        }

        update(playerCells) {
            if (playerCells.length === 0) return;

            let totalMass = 0;
            let centerX = 0;
            let centerY = 0;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            playerCells.forEach(cell => {
                totalMass += cell.mass;
                centerX += cell.x * cell.mass;
                centerY += cell.y * cell.mass;
                minX = Math.min(minX, cell.x - cell.radius);
                minY = Math.min(minY, cell.y - cell.radius);
                maxX = Math.max(maxX, cell.x + cell.radius);
                maxY = Math.max(maxY, cell.y + cell.radius);
            });

            this.x = centerX / totalMass;
            this.y = centerY / totalMass;

            const spread = Math.max(maxX - minX, maxY - minY, 250);
            const zoomFactor = Math.min(canvas.width, canvas.height) / spread;
            const targetZoom = Math.pow(zoomFactor, 0.8);
            
            // Smooth zoom
            this.zoom += (targetZoom - this.zoom) * 0.1;
            this.zoom = Math.max(Math.min(this.zoom, 1), 0.2);
        }

        worldToScreen(worldX, worldY) {
            const dx = worldX - this.x;
            const dy = worldY - this.y;
            return {
                x: canvas.width / 2 + dx * this.zoom,
                y: canvas.height / 2 + dy * this.zoom
            };
        }

        screenToWorld(screenX, screenY) {
            return {
                x: (screenX - canvas.width / 2) / this.zoom + this.x,
                y: (screenY - canvas.height / 2) / this.zoom + this.y
            };
        }
    }

    const camera = new Camera();

    // --- GAME LOGIC ---

    function setupGame() {
        const playerName = playerNameInput.value || 'Player';
        const startPos = { x: MAP_SIZE.width / 2, y: MAP_SIZE.height / 2 };
        cells = [new PlayerCell(startPos.x, startPos.y, PLAYER_START_MASS, getRandomColor(), playerName)];

        foods = [];
        for (let i = 0; i < FOOD_COUNT; i++) {
            const { x, y } = getRandomPosition(5);
            foods.push(new Food(x, y));
        }
        
        viruses = [];
        for (let i = 0; i < VIRUS_COUNT; i++) {
            const { x, y } = getRandomPosition(20);
            viruses.push(new Virus(x, y));
        }

        gameActive = true;
        gameLoop();
    }

    function splitPlayerCells() {
        const newCells = [];
        const currentCellCount = cells.length;

        for (let i = 0; i < currentCellCount; i++) {
            const cell = cells[i];
            if (cell.mass >= MIN_MASS_TO_SPLIT && cells.length + newCells.length < MAX_CELLS) {
                const splitMass = cell.mass / 2;
                cell.setMass(splitMass);
                cell.mergeCooldown = MERGE_COOLDOWN_FRAMES;

                const newCell = new PlayerCell(cell.x, cell.y, splitMass, cell.color, cell.name);
                newCell.mergeCooldown = MERGE_COOLDOWN_FRAMES;
                
                const worldMouse = camera.screenToWorld(mouse.x, mouse.y);
                const angle = Math.atan2(worldMouse.y - cell.y, worldMouse.x - cell.x);
                const ejectionSpeed = 25;

                newCell.velocity.x = Math.cos(angle) * ejectionSpeed;
                newCell.velocity.y = Math.sin(angle) * ejectionSpeed;
                cell.velocity.x = -Math.cos(angle) * ejectionSpeed / 5;
                cell.velocity.y = -Math.sin(angle) * ejectionSpeed / 5;

                newCells.push(newCell);
            }
        }
        cells.push(...newCells);
    }

    function handleCollisions() {
        // Player cell interactions (pushing and merging)
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                const cellA = cells[i];
                const cellB = cells[j];
                const dx = cellB.x - cellA.x;
                const dy = cellB.y - cellA.y;
                const dist = Math.hypot(dx, dy);
                const overlap = cellA.radius + cellB.radius - dist;

                if (overlap > 0) {
                    // Push cells apart
                    const angle = Math.atan2(dy, dx);
                    const moveX = (overlap / 2) * Math.cos(angle);
                    const moveY = (overlap / 2) * Math.sin(angle);
                    
                    cellA.x -= moveX;
                    cellA.y -= moveY;
                    cellB.x += moveX;
                    cellB.y += moveY;

                    // Merge check
                    if (cellA.mergeCooldown === 0 && cellB.mergeCooldown === 0) {
                        if (cellA.mass > cellB.mass) {
                            cellA.setMass(cellA.mass + cellB.mass);
                            cells.splice(j, 1);
                            j--;
                        } else {
                            cellB.setMass(cellA.mass + cellB.mass);
                            cells.splice(i, 1);
                            i--;
                            break; 
                        }
                    }
                }
            }
        }

        // Food eating
        for (let i = foods.length - 1; i >= 0; i--) {
            const food = foods[i];
            for (const cell of cells) {
                const dist = Math.hypot(cell.x - food.x, cell.y - food.y);
                if (dist < cell.radius) {
                    cell.eat(food);
                    foods.splice(i, 1);
                    const { x, y } = getRandomPosition(5);
                    foods.push(new Food(x, y));
                    break; 
                }
            }
        }

        // Virus interaction
        for (let i = viruses.length - 1; i >= 0; i--) {
            const virus = viruses[i];
            for (let j = cells.length - 1; j >= 0; j--) {
                const cell = cells[j];
                const dist = Math.hypot(cell.x - virus.x, cell.y - virus.y);

                if (dist < cell.radius && cell.mass >= VIRUS_MIN_MASS_TO_POP) {
                    // Explode cell
                    const newTotalMass = cell.mass + VIRUS_MASS_BOOST;
                    const numSplits = Math.min(MAX_CELLS - cells.length + 1, 8);
                    if (numSplits <= 1) continue;

                    const massPerSplit = newTotalMass / numSplits;
                    
                    for(let k = 0; k < numSplits; k++) {
                        const newCell = new PlayerCell(cell.x, cell.y, massPerSplit, cell.color, cell.name);
                        newCell.mergeCooldown = MERGE_COOLDOWN_FRAMES;
                        const angle = Math.random() * Math.PI * 2;
                        const ejectionSpeed = 20;
                        newCell.velocity.x = Math.cos(angle) * ejectionSpeed;
                        newCell.velocity.y = Math.sin(angle) * ejectionSpeed;
                        cells.push(newCell);
                    }
                    
                    cells.splice(j, 1);
                    viruses.splice(i, 1);
                    const { x, y } = getRandomPosition(20);
                    viruses.push(new Virus(x, y));
                    break;
                }
            }
        }
    }

    function drawGrid() {
        ctx.save();
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        
        const topLeft = camera.screenToWorld(0, 0);
        const bottomRight = camera.screenToWorld(canvas.width, canvas.height);

        const gridSize = 50;

        for (let x = Math.floor(topLeft.x / gridSize) * gridSize; x < bottomRight.x; x += gridSize) {
            const screenX = camera.worldToScreen(x, 0).x;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, canvas.height);
            ctx.stroke();
        }
        for (let y = Math.floor(topLeft.y / gridSize) * gridSize; y < bottomRight.y; y += gridSize) {
            const screenY = camera.worldToScreen(0, y).y;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(canvas.width, screenY);
            ctx.stroke();
        }
        ctx.restore();
    }

    function updateUI() {
        let totalMass = 0;
        cells.forEach(cell => totalMass += cell.mass);
        scoreEl.innerText = `Score: ${Math.floor(totalMass)}`;
    }

    // --- MAIN GAME LOOP ---

    function gameLoop() {
        if (!gameActive) return;

        // Update logic
        const worldMouse = camera.screenToWorld(mouse.x, mouse.y);
        cells.forEach(cell => cell.update(worldMouse));
        handleCollisions();
        camera.update(cells);
        updateUI();

        // Drawing logic
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        foods.forEach(food => food.draw(camera));
        viruses.forEach(virus => virus.draw(camera));
        cells.forEach(cell => cell.draw(camera));

        requestAnimationFrame(gameLoop);
    }

    // --- EVENT LISTENERS ---

    function setupEventListeners() {
        window.addEventListener('mousemove', (event) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        });
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        window.addEventListener('keydown', (event) => {
            if (gameActive && event.code === 'Space') {
                event.preventDefault();
                splitPlayerCells();
            }
        });

        playButton.addEventListener('click', () => {
            startScreen.style.display = 'none';
            setupGame();
        });
    }

    // --- INITIALIZATION ---

    function init() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        setupEventListeners();
    }

    init();

})();
