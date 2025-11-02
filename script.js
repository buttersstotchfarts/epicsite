document.addEventListener('DOMContentLoaded', () => {
    const attackContainer = document.getElementById('attack-container');
    const faceWrapper = document.getElementById('face-wrapper');
    const face = document.getElementById('face');
    const characterSound = document.getElementById('character-sound');
    const slapSound = document.getElementById('slap-sound');
    const florpSound = document.getElementById('florp-sound'); // Get the new sound
    const controlButtons = document.querySelectorAll('#controls button');
    const suggestButton = document.getElementById('suggest-button');

    const characters = [
        { name: "Face", image: "face.png", sound: "fart.mp3" },
        { name: "James", image: "james.png", sound: "james.mp3" },
        { name: "Alex", image: "alex.png", sound: ['jump.mp3', 'rump.mp3', 'pump.mp3', 'stump.mp3'] },
        { name: "Jim", image: "jim.png", sound: "jim.mp3" }
    ];
    let currentCharacterIndex = 0;
    
    let returnToCenterTimer;
    let bounds = {};
    let physics = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0, friction: 0.96, impactMultiplier: 24, bounceEnergyLoss: 0.8, spring: 0.03, damping: 0.92, isRunning: false };
    
    // --- NEW: Particle Physics System ---
    let activeParticles = [];
    const gravity = 0.5;

    function initialize() {
        updateBounds();
        window.addEventListener('resize', updateBounds);
        controlButtons.forEach(button => { button.addEventListener('click', (event) => { event.stopPropagation(); switchCharacter(parseInt(button.dataset.character)); }); });
        suggestButton.addEventListener('click', (event) => event.stopPropagation());
        face.addEventListener('click', (event) => { event.stopPropagation(); triggerSlap(); });
        document.body.addEventListener('click', triggerSlap);
        switchCharacter(0);
        requestAnimationFrame(updateParticles); // Start the particle physics loop
    }

    function switchCharacter(index) { /* ... unchanged ... */ }
    function triggerSlap() {
        clearTimeout(returnToCenterTimer);
        faceWrapper.classList.remove('returning');

        const guide = document.createElement('div'); guide.className = 'attacker-guide';
        const attacker = document.createElement('img'); attacker.className = 'attacker'; attacker.src = 'hand.png';

        const targetX = (bounds.wWidth / 2) + physics.x;
        const targetY = (bounds.wHeight / 2) + physics.y;
        
        const isLeft = Math.random() < 0.5;
        let impactVector; let guideTransform = 'translate(-50%, -50%)';
        guide.style.left = `${targetX}px`; guide.style.top = `${targetY}px`;
        if (isLeft) { guideTransform += ' scaleX(-1)'; impactVector = { x: 1, y: 0 }; } 
        else { impactVector = { x: -1, y: 0 }; }
        guide.style.transform = guideTransform;
        
        guide.appendChild(attacker);
        attackContainer.appendChild(guide);
        
        setTimeout(() => {
            slapSound.cloneNode(true).play();
            const currentChar = characters[currentCharacterIndex];
            if (Array.isArray(currentChar.sound)) { new Audio(currentChar.sound[Math.floor(Math.random() * currentChar.sound.length)]).play(); } 
            else { characterSound.cloneNode(true).play(); }
            
            const faceAngleRad = physics.angle * Math.PI / 180;
            const finalImpactVector = { x: Math.cos(faceAngleRad) * impactVector.x - Math.sin(faceAngleRad) * impactVector.y, y: Math.sin(faceAngleRad) * impactVector.x + Math.cos(faceAngleRad) * impactVector.y };
            applyForce(finalImpactVector.x, finalImpactVector.y);

            // MODIFIED: Chance is now 1 in 5 (0.2)
            if (currentCharacterIndex === 3 && Math.random() < 0.2) {
                sprayParticles();
            }

        }, 180);

        returnToCenterTimer = setTimeout(() => { /* ... unchanged ... */ }, 1200);
        attacker.addEventListener('animationend', () => guide.remove());
    }

    // REWRITTEN: Function now uses the physics loop
    function sprayParticles() {
        florpSound.cloneNode(true).play();
        const particleCount = 5;
        const baseAngle = Math.random() * 2 * Math.PI;
        const sprayArc = Math.PI / 3;

        for (let i = 0; i < particleCount; i++) {
            const particleEl = document.createElement('img');
            particleEl.src = 'immediate.png';
            particleEl.className = 'particle';

            const angle = baseAngle + (Math.random() - 0.5) * sprayArc;
            const speed = 15 + Math.random() * 10;

            const particleObj = {
                el: particleEl,
                x: physics.x,
                y: physics.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                rotation: Math.random() * 360,
                rotationVelocity: (Math.random() - 0.5) * 20
            };
            
            activeParticles.push(particleObj);
            attackContainer.appendChild(particleEl);
        }
    }

    // NEW: The main physics loop for sprayed particles
    function updateParticles() {
        for (let i = activeParticles.length - 1; i >= 0; i--) {
            const p = activeParticles[i];

            // Apply gravity
            p.vy += gravity;

            // Update position
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationVelocity;

            // Apply transform to the DOM element
            p.el.style.transform = `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.rotation}deg)`;
            p.el.style.left = `${bounds.wWidth / 2}px`;
            p.el.style.top = `${bounds.wHeight / 2}px`;
            
            // Remove if off-screen
            if (p.y > (bounds.wHeight / 2) + 100) {
                p.el.remove();
                activeParticles.splice(i, 1);
            }
        }
        requestAnimationFrame(updateParticles);
    }
    
    function updateBounds() { bounds = { wWidth: window.innerWidth, wHeight: window.innerHeight, fWidth: faceWrapper.offsetWidth, fHeight: faceWrapper.offsetHeight }; }
    function applyForce(forceX, forceY) { physics.vx += forceX * physics.impactMultiplier; physics.vy += forceY * physics.impactMultiplier; physics.va += (Math.random() - 0.5) * 8; physics.vsx -= 0.3; physics.vsy += 0.3; if (!physics.isRunning) { physics.isRunning = true; updatePhysics(); } }
    function updatePhysics() { if (!physics.isRunning) return; const nextX = physics.x + physics.vx; const nextY = physics.y + physics.vy; const halfW = bounds.fWidth / 2; const halfH = bounds.fHeight / 2; if ((nextX + halfW > bounds.wWidth / 2 && physics.vx > 0) || (nextX - halfW < -bounds.wWidth / 2 && physics.vx < 0)) { physics.vx *= -physics.bounceEnergyLoss; } if ((nextY + halfH > bounds.wHeight / 2 && physics.vy > 0) || (nextY - halfH < -bounds.wHeight / 2 && physics.vy < 0)) { physics.vy *= -physics.bounceEnergyLoss; } physics.vx *= physics.friction; physics.vy *= physics.friction; physics.va *= physics.friction; physics.x += physics.vx; physics.y += physics.vy; physics.angle += physics.va; physics.vsx += (1 - physics.scaleX) * physics.spring; physics.vsy += (1 - physics.scaleY) * physics.spring; physics.vsx *= physics.damping; physics.vsy *= physics.damping; physics.scaleX += physics.vsx; physics.scaleY += physics.vsy; faceWrapper.style.transform = `translate(${physics.x}px, ${physics.y}px) rotate(${physics.angle}deg) scale(${physics.scaleX}, ${physics.scaleY})`; if (Math.abs(physics.vx) < 0.1 && Math.abs(physics.vy) < 0.1 && Math.abs(physics.va) < 0.1 && Math.abs(1 - physics.scaleX) < 0.01 && Math.abs(1 - physics.scaleY) < 0.01) { physics.isRunning = false; } else { requestAnimationFrame(updatePhysics); } }
    function switchCharacter(index) { if (index >= characters.length) return; currentCharacterIndex = index; const char = characters[index]; face.src = char.image; if (!Array.isArray(char.sound)) { characterSound.src = char.sound; } clearTimeout(returnToCenterTimer); faceWrapper.classList.remove('returning'); faceWrapper.style.transform = 'translate(0, 0) rotate(0) scale(1,1)'; Object.assign(physics, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0, isRunning: false }); }

    initialize();
});