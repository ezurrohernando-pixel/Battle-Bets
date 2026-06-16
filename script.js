/* --- BASE DE DATOS DE UNIDADES --- */
const UNIT_DB = {
    pollo: { id: 'pollo', name: 'Pollo', hp: 10, dmg: 2, spd: 3, mass: 1, type: 'swarm', emoji: '🐔' },
    gallina: { id: 'gallina', name: 'Gallina', hp: 25, dmg: 4, spd: 2, mass: 2, type: 'swarm', emoji: '🐓' },
    infanteria: { id: 'infanteria', name: 'Infantería', hp: 50, dmg: 10, spd: 2.5, mass: 5, type: 'balanced', emoji: '🤺' },
    trex: { id: 'trex', name: 'T-Rex', hp: 500, dmg: 80, spd: 4, mass: 50, type: 'heavy', emoji: '🦖' },
    socrates: { id: 'socrates', name: 'Sócrates', hp: 30, dmg: 0, spd: 1.5, mass: 4, type: 'special', emoji: '🧔' },
    nobine: { id: 'nobine', name: 'Nobiñe', hp: 1, dmg: 100, spd: 0, mass: 1200000, type: 'meme', emoji: '🗿' }
};

/* --- ESTADO DEL JUEGO --- */
let saveData = {
    coins: 500,
    rubies: 10,
    collection: ['pollo', 'gallina', 'infanteria', 'trex', 'socrates', 'nobine'],
    stats: { battles: 0, wins: 0, socratesKills: 0, nobineCrushes: 0 }
};

/* --- SISTEMA PRINCIPAL --- */
const game = {
    teamA: [], teamB: [], isBattling: false, betTeam: null, betAmount: 0,
    ctx: null, canvas: null, entities: [], particles: [], tickRate: 1000/60, timeElapsed: 0,

    init() {
        this.load();
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d');
        ui.updateTopBar();
        ui.populateDropdowns();
        ui.renderCollection();
        this.updateProbabilities();
        
        // Listeners for probability update
        document.getElementById('unit-qty-a').addEventListener('input', () => this.updateProbabilities());
        document.getElementById('unit-qty-b').addEventListener('input', () => this.updateProbabilities());
        document.getElementById('unit-select-a').addEventListener('change', () => this.updateProbabilities());
        document.getElementById('unit-select-b').addEventListener('change', () => this.updateProbabilities());
    },

    save() { localStorage.setItem('battleBetsSave', JSON.stringify(saveData)); },
    load() { 
        let d = localStorage.getItem('battleBetsSave'); 
        if(d) saveData = JSON.parse(d); 
    },

    calculateArmyPower(unitId, qty) {
        let stats = UNIT_DB[unitId];
        return (stats.hp + (stats.dmg * 5) + (stats.spd * 2) + stats.mass) * qty;
    },

    updateProbabilities() {
        let uA = document.getElementById('unit-select-a').value;
        let qA = parseInt(document.getElementById('unit-qty-a').value) || 0;
        let uB = document.getElementById('unit-select-b').value;
        let qB = parseInt(document.getElementById('unit-qty-b').value) || 0;

        let powerA = this.calculateArmyPower(uA, qA);
        let powerB = this.calculateArmyPower(uB, qB);
        let total = powerA + powerB;
        
        let probA = total === 0 ? 50 : Math.round((powerA / total) * 100);
        let probB = total === 0 ? 50 : 100 - probA;

        document.getElementById('prob-a').innerText = probA + '%';
        document.getElementById('prob-b').innerText = probB + '%';
        return { probA, probB };
    },

    placeBet(team) {
        let amt = parseInt(document.getElementById('bet-amount').value);
        if(!amt || amt < 10) return alert("Apuesta mínima 10 monedas.");
        if(saveData.coins < amt) return alert("No tienes suficientes monedas.");
        
        saveData.coins -= amt;
        this.betAmount = amt;
        this.betTeam = team;
        ui.updateTopBar();
        this.startBattle();
    },

    startBattle() {
        this.isBattling = true;
        this.entities = [];
        this.timeElapsed = 0;
        document.getElementById('canvas-container').classList.remove('hidden');
        document.getElementById('battle-log').innerHTML = '';
        saveData.stats.battles++;

        let uA = document.getElementById('unit-select-a').value;
        let qA = parseInt(document.getElementById('unit-qty-a').value);
        let uB = document.getElementById('unit-select-b').value;
        let qB = parseInt(document.getElementById('unit-qty-b').value);

        // Spawn A (Rojo - Izquierda)
        for(let i=0; i<qA; i++) {
            this.entities.push(new Entity(UNIT_DB[uA], 'A', 50 + Math.random()*200, 50 + Math.random()*300));
        }
        // Spawn B (Azul - Derecha)
        for(let i=0; i<qB; i++) {
            this.entities.push(new Entity(UNIT_DB[uB], 'B', 550 + Math.random()*200, 50 + Math.random()*300));
        }

        ui.log("¡La batalla ha comenzado!");
        this.loop();
    },

    loop() {
        if(!this.isBattling) return;
        this.timeElapsed += this.tickRate;
        
        // Simulación acelerada x2.5: corremos el motor físico varias veces por frame
        for(let step = 0; step < 3; step++) {
            this.updatePhysics();
        }
        
        this.render();

        let aliveA = this.entities.filter(e => e.team === 'A' && e.hp > 0).length;
        let aliveB = this.entities.filter(e => e.team === 'B' && e.hp > 0).length;

        if(aliveA === 0 || aliveB === 0) {
            this.endBattle(aliveA > 0 ? 'A' : 'B', aliveA, aliveB);
        } else {
            requestAnimationFrame(() => this.loop());
        }
    },

    updatePhysics() {
        for(let e of this.entities) e.update(this.entities, this.timeElapsed);
    },

    render() {
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render corpses first
        for(let e of this.entities) { if(e.hp <= 0) e.draw(this.ctx); }
        // Render alive
        for(let e of this.entities) { if(e.hp > 0) e.draw(this.ctx); }
    },

    endBattle(winner, aliveA, aliveB) {
        this.isBattling = false;
        let win = winner === this.betTeam;
        let probs = this.updateProbabilities();
        let myProb = this.betTeam === 'A' ? probs.probA : probs.probB;
        
        let multiplier = 0;
        if(win) {
            saveData.stats.wins++;
            // Cuanto menor la probabilidad, mayor la recompensa
            if(myProb <= 10) multiplier = 5.0;
            else if(myProb <= 25) multiplier = 3.0;
            else if(myProb <= 40) multiplier = 2.0;
            else if(myProb <= 49) multiplier = 1.5;
            else if(myProb <= 60) multiplier = 1.2;
            else multiplier = 1.05;
        }

        let wonCoins = win ? Math.floor(this.betAmount * multiplier) : 0;
        if(win) saveData.coins += wonCoins;
        
        this.save();
        ui.updateTopBar();
        ui.showResult(win, wonCoins, winner, (aliveA + aliveB));
    }
};

/* --- CLASE ENTIDAD (Motor de combate y físicas) --- */
class Entity {
    constructor(base, team, x, y) {
        this.base = base; this.team = team; this.x = x; this.y = y;
        this.hp = base.hp; this.maxHp = base.hp;
        this.radius = 10 + (base.mass * 0.1); 
        if(this.radius > 30) this.radius = 30; // Cap visual radius
        this.vx = 0; this.vy = 0;
        this.color = team === 'A' ? '#e74c3c' : '#3498db';
        this.lastSocratesAbility = 0;
    }

    update(allEntities, timeElapsed) {
        if(this.hp <= 0) {
            // Nobiñe corpse retains mass and crushes
            if(this.base.id === 'nobine' && (this.vx !== 0 || this.vy !== 0)) {
                this.x += this.vx; this.y += this.vy;
                this.vx *= 0.9; this.vy *= 0.9;
            }
            return;
        }

        // Habilidad Especial Sócrates
        if(this.base.id === 'socrates' && timeElapsed - this.lastSocratesAbility > 3000) {
            this.lastSocratesAbility = timeElapsed;
            let enemies = allEntities.filter(e => e.team !== this.team && e.hp > 0);
            if(enemies.length > 0) {
                let target = enemies[Math.floor(Math.random() * enemies.length)];
                if(Math.random() < 0.95) {
                    target.hp = 0;
                    ui.log(`Sócrates cuestionó la existencia de un ${target.base.name}. Y dejó de existir.`);
                    saveData.stats.socratesKills++;
                } else {
                    allEntities.forEach(e => { if(e.base.id === 'socrates') e.hp = 0; });
                    ui.log(`¡Un ${target.base.name} descubrió el sentido de la vida! Todos los Sócrates han muerto.`);
                }
            }
        }

        // Movimiento básico: ir hacia el enemigo más cercano
        let target = null;
        let minDist = Infinity;
        for(let e of allEntities) {
            if(e.team !== this.team && e.hp > 0) {
                let d = Math.hypot(e.x - this.x, e.y - this.y);
                if(d < minDist) { minDist = d; target = e; }
            }
        }

        if(target && this.base.spd > 0) {
            let angle = Math.atan2(target.y - this.y, target.x - this.x);
            this.vx = Math.cos(angle) * this.base.spd;
            this.vy = Math.sin(angle) * this.base.spd;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Físicas de colisión y ataque
        for(let e of allEntities) {
            if(e === this) continue;
            let dx = e.x - this.x; let dy = e.y - this.y;
            let dist = Math.hypot(dx, dy);
            let minDistCol = this.radius + e.radius;

            if(dist < minDistCol) {
                // Combate si son enemigos
                if(e.team !== this.team && e.hp > 0) {
                    e.hp -= this.base.dmg * 0.1; // Daño por frame
                }

                // Físicas de empuje (Basado en Masa)
                let pushFactor = this.base.mass / (this.base.mass + e.base.mass);
                let overlap = minDistCol - dist;
                let nx = dx / dist; let ny = dy / dist;

                // Nobiñe (Masa Infinita) aplasta
                if(this.base.mass > 1000000 && e.base.mass < 1000000 && e.hp > 0) {
                     e.hp -= 100; // Aplastado
                     saveData.stats.nobineCrushes++;
                     if(Math.random() < 0.1) ui.log(`Nobiñe aplastó a un ${e.base.name}.`);
                }

                if(this.base.mass < 1000000) {
                    this.x -= nx * overlap * (1 - pushFactor);
                    this.y -= ny * overlap * (1 - pushFactor);
                }
            }
        }

        // Límites del mapa
        if(this.x < this.radius) this.x = this.radius;
        if(this.x > game.canvas.width - this.radius) this.x = game.canvas.width - this.radius;
        if(this.y < this.radius) this.y = this.radius;
        if(this.y > game.canvas.height - this.radius) this.y = game.canvas.height - this.radius;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.hp > 0 ? this.color : '#555';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
        
        ctx.font = `${this.radius}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.hp > 0 ? '#fff' : '#222';
        ctx.fillText(this.base.emoji, this.x, this.y);
    }
}

/* --- SISTEMA DE COFRES Y GACHA --- */
const chestSystem = {
    pendingRewards: [],
    
    buyChest(cost) {
        if(saveData.coins < cost) return alert("Faltan monedas.");
        saveData.coins -= cost;
        game.save();
        ui.updateTopBar();
        this.generateLoot();
    },

    generateLoot() {
        this.pendingRewards = [];
        let r = Math.random() * 100;
        
        // 60% Monedas, 25% Rubíes, 10% PowerUp (Ignorado en MVP), 4% Dorado, 0.9% Platino, 0.1% Diamante
        this.pendingRewards.push({ text: "+100 🪙", type: 'currency' });
        
        if(r < 25) this.pendingRewards.push({ text: "+5 💎", type: 'currency' });
        
        let unitKeys = Object.keys(UNIT_DB);
        let randomUnit = UNIT_DB[unitKeys[Math.floor(Math.random() * unitKeys.length)]];

        if(r < 0.1) this.pendingRewards.push({ text: `💎 ${randomUnit.name} DIAMANTE 💎`, type: 'unit' });
        else if(r < 1) this.pendingRewards.push({ text: `✨ ${randomUnit.name} PLATINO ✨`, type: 'unit' });
        else if(r < 5) this.pendingRewards.push({ text: `⭐ ${randomUnit.name} DORADO ⭐`, type: 'unit' });

        this.startAnimation();
    },

    startAnimation() {
        document.getElementById('chest-overlay').classList.remove('hidden');
        let sprite = document.getElementById('chest-sprite');
        sprite.className = 'shake';
        document.getElementById('chest-reward').classList.add('hidden');
        document.getElementById('chest-tap-text').classList.add('hidden');
        
        setTimeout(() => {
            sprite.className = '';
            document.getElementById('chest-tap-text').classList.remove('hidden');
            this.nextReward();
        }, 1500);
    },

    nextReward() {
        if(document.getElementById('chest-sprite').className === 'shake') return; // Aún sacudiendo
        
        let rewardDisplay = document.getElementById('chest-reward');
        if(this.pendingRewards.length > 0) {
            let r = this.pendingRewards.shift();
            rewardDisplay.innerText = r.text;
            rewardDisplay.classList.remove('hidden');
            // Re-trigger animation
            rewardDisplay.style.animation = 'none';
            rewardDisplay.offsetHeight; /* trigger reflow */
            rewardDisplay.style.animation = null; 
        } else {
            document.getElementById('chest-overlay').classList.add('hidden');
        }
    }
};

/* --- CONTROLADOR DE INTERFAZ --- */
const ui = {
    changeTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    },

    updateTopBar() {
        document.getElementById('coin-count').innerText = saveData.coins;
        document.getElementById('ruby-count').innerText = saveData.rubies;
    },

    populateDropdowns() {
        let options = saveData.collection.map(id => `<option value="${id}">${UNIT_DB[id].name}</option>`).join('');
        document.getElementById('unit-select-a').innerHTML = options;
        document.getElementById('unit-select-b').innerHTML = options;
    },

    renderCollection() {
        let grid = document.getElementById('collection-grid');
        grid.innerHTML = saveData.collection.map(id => `
            <div class="unit-card">
                <h1>${UNIT_DB[id].emoji}</h1>
                <h3>${UNIT_DB[id].name}</h3>
                <p>HP: ${UNIT_DB[id].hp} | DMG: ${UNIT_DB[id].dmg}</p>
            </div>
        `).join('');
    },

    log(msg) {
        let box = document.getElementById('battle-log');
        let p = document.createElement('div');
        p.innerText = `> ${msg}`;
        box.prepend(p);
    },

    showResult(won, coins, winnerTeam, survivors) {
        let modal = document.getElementById('result-modal');
        document.getElementById('result-title').innerText = won ? "¡GANASTE LA APUESTA!" : "PERDISTE LA APUESTA";
        document.getElementById('result-title').style.color = won ? "var(--gold)" : "var(--accent)";
        document.getElementById('result-winner').innerText = `El Equipo ${winnerTeam === 'A' ? 'Rojo' : 'Azul'} masacró al rival.`;
        document.getElementById('result-coins').innerText = won ? `Has ganado +${coins} 🪙` : `Has perdido tu apuesta.`;
        
        let survTxt = "";
        if(survivors === 1) {
            survTxt = "¡Un único superviviente! Recompensa especial en el cofre... (Próximamente)";
        }
        document.getElementById('result-survivor').innerText = survTxt;
        
        modal.classList.remove('hidden');
    },

    closeResult() {
        document.getElementById('result-modal').classList.add('hidden');
        document.getElementById('canvas-container').classList.add('hidden');
        game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    }
};

// Inicializar juego al cargar la página
window.onload = () => { game.init(); };
