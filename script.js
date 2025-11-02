document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT REFERENCES ---
    const attackContainer = document.getElementById('attack-container');
    const faceWrapper = document.getElementById('face-wrapper');
    const face = document.getElementById('face');
    const characterSound = document.getElementById('character-sound');
    const slapSound = document.getElementById('slap-sound');
    const controlButtons = document.querySelectorAll('#controls button');
    const suggestButton = document.getElementById('suggest-button');

    // --- CHARACTER DATA ---
    const characters = [
        { name: "Face", image: "face.png", sound: "fart.mp3" },
        { name: "James", image: "james.png", sound: "james.mp3" },
        { name: "Alex", image: "alex.png", sound: ['jump.mp3', 'rump.mp3', 'pump.mp3', 'stump.mp3'] },
        { name: "Jim", image: "jim.png", sound: "jim.mp3" }
    ];
    let currentCharacterIndex = 0;
    
    // --- STATE & PHYSICS VARIABLES ---
    let returnToCenterTimer;
    let bounds = {};
    // NEW: Physics object now includes scale, spring, and damping
    let physics = { 
        x: 0, y: 0, vx: 0, vy: 0, 
        angle: 0, va: 0,
        scaleX: 1, scaleY: 1, vsx: 0, vsy: 0, // Scale and scale velocity
        friction: 0.96, impactMultiplier: 24, bounceEnergyLoss: 0.8, 
        spring: 0.03, damping: 0.92, // Jiggle physics
        isRunning: false 
    };
    
    function initialize() {
        updateBounds();
        window.addEventListener('resize', updateBounds);
        controlButtons.forEach(button => {
            button.addEventListener('click', (event) => { event.stopPropagation(); switchCharacter(parseInt(button.dataset.character)); });
        });
        suggestButton.addEventListener('click', (event) => event.stopPropagation());
        face.addEventListener('click', (event) => { event.stopPropagation(); triggerSlap(); });
        document.body.addEventListener('click', triggerSlap);
        switchCharacter(0);
    }

    function switchCharacter(index) {
        if (index >= characters.length) return;
        currentCharacterIndex = index;
        const char = characters[index];
        face.src = char.image;
        if (!Array.isArray(char.sound)) { characterSound.src = char.sound; }
        clearTimeout(returnToCenterTimer);
        faceWrapper.classList.remove('returning');
        faceWrapper.style.transform = 'translate(0, 0) rotate(0) scale(1,1)';
        // Reset ALL physics properties
        Object.assign(physics, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0, isRunning: false });
    }

    // --- Core Slap Logic ---
    function triggerSlap() {
        clearTimeout(returnToCenterTimer);
        faceWrapper.classList.remove('returning');

        const guide = document.createElement('div'); guide.className = 'attacker-guide';
        const attacker = document.createElement('img'); attacker.className = 'attacker'; attacker.src = 'hand.png';

        const targetX = (bounds.wWidth / 2) + physics.x;
        const targetY = (bounds.wHeight / 2) + physics.y;
        
        const isLeft = Math.random() < 0.5;
        let impactVector;
        let guideTransform = 'translate(-50%, -50%)';

        guide.style.left = `${targetX}px`; guide.style.top = `${targetY}px`;

        if (isLeft) { guideTransform += ' scaleX(-1)'; impactVector = { x: 1, y: 0 }; } 
        else { impactVector = { x: -1, y: 0 }; }
        guide.style.transform = guideTransform;
        
        guide.appendChild(attacker);
        attackContainer.appendChild(guide);
        
        setTimeout(() => {
            slapSound.cloneNode(true).play();
            
            const currentChar = characters[currentCharacterIndex];
            if (Array.isArray(currentChar.sound)) {
                const soundFile = currentChar.sound[Math.floor(Math.random() * currentChar.sound.length)];
                new Audio(soundFile).play();
            } else { characterSound.cloneNode(true).play(); }
            
            const faceAngleRad = physics.angle * Math.PI / 180;
            const finalImpactVector = {
                x: Math.cos(faceAngleRad) * impactVector.x - Math.sin(faceAngleRad) * impactVector.y,
                y: Math.sin(faceAngleRad) * impactVector.x + Math.cos(faceAngleRad) * impactVector.y
            };
            
            applyForce(finalImpactVector.x, finalImpactVector.y);
        }, 180);

        returnToCenterTimer = setTimeout(() => {
            physics.isRunning = false;
            faceWrapper.classList.add('returning');
            faceWrapper.style.transform = 'translate(0, 0) rotate(0) scale(1,1)';
            setTimeout(() => {
                faceWrapper.classList.remove('returning');
                Object.assign(physics, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0 });
            }, 500);
        }, 1200);

        attacker.addEventListener('animationend', () => guide.remove());
    }

    function updateBounds() { bounds = { wWidth: window.innerWidth, wHeight: window.innerHeight, fWidth: faceWrapper.offsetWidth, fHeight: faceWrapper.offsetHeight }; }
    
    function applyForce(forceX, forceY) {
        // Apply recoil force
        physics.vx += forceX * physics.impactMultiplier;
        physics.vy += forceY * physics.impactMultiplier;
        physics.va += (Math.random() - 0.5) * 8;
        // Apply jiggle force (squash & stretch)
        physics.vsx -= 0.3; // Squash horizontally
        physics.vsy += 0.3; // Stretch vertically

        if (!physics.isRunning) {
            physics.isRunning = true;
            updatePhysics();
        }
    }

    function updatePhysics() {
        if (!physics.isRunning) return;

        // --- Recoil and Bounce Physics ---
        const nextX = physics.x + physics.vx; const nextY = physics.y + physics.vy;
        const halfW = bounds.fWidth / 2; const halfH = bounds.fHeight / 2;
        if ((nextX + halfW > bounds.wWidth / 2 && physics.vx > 0) || (nextX - halfW < -bounds.wWidth / 2 && physics.vx < 0)) { physics.vx *= -physics.bounceEnergyLoss; }
        if ((nextY + halfH > bounds.wHeight / 2 && physics.vy > 0) || (nextY - halfH < -bounds.wHeight / 2 && physics.vy < 0)) { physics.vy *= -physics.bounceEnergyLoss; }
        physics.vx *= physics.friction; physics.vy *= physics.friction; physics.va *= physics.friction;
        physics.x += physics.vx; physics.y += physics.vy; physics.angle += physics.va;

        // --- Jiggle Physics (Spring & Damping) ---
        physics.vsx += (1 - physics.scaleX) * physics.spring;
        physics.vsy += (1 - physics.scaleY) * physics.spring;
        physics.vsx *= physics.damping;
        physics.vsy *= physics.damping;
        physics.scaleX += physics.vsx;
        physics.scaleY += physics.vsy;

        // Apply all transforms
        faceWrapper.style.transform = `translate(${physics.x}px, ${physics.y}px) rotate(${physics.angle}deg) scale(${physics.scaleX}, ${physics.scaleY})`;
        
        // Check if movement and jiggle have mostly stopped
        if (Math.abs(physics.vx) < 0.1 && Math.abs(physics.vy) < 0.1 && Math.abs(physics.va) < 0.1 && Math.abs(1 - physics.scaleX) < 0.01 && Math.abs(1 - physics.scaleY) < 0.01) {
            physics.isRunning = false;
        } else {
            requestAnimationFrame(updatePhysics);
        }
    }

    initialize();
});