document.addEventListener('DOMContentLoaded', () => {
    const attackContainer = document.getElementById('attack-container');
    const faceWrapper = document.getElementById('face-wrapper');
    const face = document.getElementById('face');
    const characterSound = document.getElementById('character-sound');
    const slapSound = document.getElementById('slap-sound');
    const smack2Sound = document.getElementById('smack2-sound'); // Get new sound
    const florpSound = document.getElementById('florp-sound');
    const gunnSound = document.getElementById('gunn-sound');
    const controlButtons = document.querySelectorAll('#controls button');
    const suggestButton = document.getElementById('suggest-button');

    const characters = [
        { name: "Butt", image: "face.png", sound: "fart.mp3" },
        { name: "James", image: "james.png", sound: "james.mp3" },
        { name: "Alex", image: "alex.png", sound: ['jump.mp3', 'rump.mp3', 'pump.mp3', 'stump.mp3'] },
        { name: "Jim", image: "jim.png", sound: "jim.mp3" },
        { name: "James Gunn", image: "jamesgunn.png", sound: "justone.mp3" }
    ];
    let currentCharacterIndex = 0;
    
    const impactImages = ['impact1.png', 'impact2.png', 'impact3.png', 'impact4.png'];
    let returnToCenterTimer;
    let bounds = {};
    let physics = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0, friction: 0.96, impactMultiplier: 24, bounceEnergyLoss: 0.8, spring: 0.03, damping: 0.92, isRunning: false };
    let activeParticles = [];
    const gravity = 0.5;
    let isSlapLocked = false;

    function initialize() { /* ... unchanged ... */ }
    
    function triggerSlap() {
        if (isSlapLocked) return;

        updateBounds(); 
        clearTimeout(returnToCenterTimer);
        faceWrapper.classList.remove('returning');

        if (currentCharacterIndex === 4) {
            isSlapLocked = true;
            gunnSound.currentTime = 0;
            gunnSound.play();
            gunnSound.addEventListener('ended', () => {
                executeSlap();
                isSlapLocked = false;
            }, { once: true });
        } else {
            executeSlap();
        }
    }

    function executeSlap() {
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
            // NEW: If it's James Gunn, play the second smack sound too
            if (currentCharacterIndex === 4) {
                smack2Sound.cloneNode(true).play();
            }
            
            const currentChar = characters[currentCharacterIndex];
            if (currentCharacterIndex !== 4) {
                if (Array.isArray(currentChar.sound)) { new Audio(currentChar.sound[Math.floor(Math.random() * currentChar.sound.length)]).play(); } 
                else { characterSound.cloneNode(true).play(); }
            }
            
            createImpactEffect(targetX, targetY);
            const faceAngleRad = physics.angle * Math.PI / 180;
            const finalImpactVector = { x: Math.cos(faceAngleRad) * impactVector.x - Math.sin(faceAngleRad) * impactVector.y, y: Math.sin(faceAngleRad) * impactVector.x + Math.cos(faceAngleRad) * impactVector.y };
            applyForce(finalImpactVector.x, finalImpactVector.y);

            if ((currentCharacterIndex === 0 && Math.random() < 0.1) || (currentCharacterIndex === 3 && Math.random() < 0.2)) {
                sprayParticles();
            }
            if (currentCharacterIndex === 0 && Math.random() < 0.5) {
                createGasEffect(targetX, targetY);
            }

        }, 180);

        returnToCenterTimer = setTimeout(smoothReturnToCenter, 1200);
        attacker.addEventListener('animationend', () => guide.remove());
    }

    function createGasEffect(x, y) { /* ... unchanged ... */ }
    function createImpactEffect(x, y) { /* ... unchanged ... */ }
    function sprayParticles() { /* ... unchanged ... */ }
    function updateParticles() { /* ... unchanged ... */ }
    function updateBounds() { bounds = { wWidth: window.innerWidth, wHeight: window.innerHeight, fWidth: faceWrapper.offsetWidth, fHeight: faceWrapper.offsetHeight }; }
    function applyForce(forceX, forceY) { physics.vx += forceX * physics.impactMultiplier; physics.vy += forceY * physics.impactMultiplier; physics.va += (Math.random() - 0.5) * 8; physics.vsx -= 0.3; physics.vsy += 0.3; if (!physics.isRunning) { physics.isRunning = true; updatePhysics(); } }
    function hardResetFaceState() { isSlapLocked = false; gunnSound.pause(); physics.isRunning = false; faceWrapper.classList.remove('returning'); clearTimeout(returnToCenterTimer); Object.assign(physics, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0 }); faceWrapper.style.transform = 'translate(0, 0) rotate(0) scale(1,1)'; }
    function smoothReturnToCenter() { physics.isRunning = false; faceWrapper.classList.add('returning'); faceWrapper.style.transform = 'translate(0, 0) rotate(0) scale(1,1)'; setTimeout(() => { faceWrapper.classList.remove('returning'); Object.assign(physics, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0 }); }, 500); }

    function updatePhysics() {
        if (!physics.isRunning) return;
        const outOfBoundsX = Math.abs(physics.x) > (bounds.wWidth / 2 + bounds.fWidth);
        const outOfBoundsY = Math.abs(physics.y) > (bounds.wHeight / 2 + bounds.fHeight);
        if (outOfBoundsX || outOfBoundsY) {
            hardResetFaceState();
            return;
        }
        const nextX = physics.x + physics.vx; const nextY = physics.y + physics.vy;
        const halfW = bounds.fWidth / 2; const halfH = bounds.fHeight / 2;
        if ((nextX + halfW > bounds.wWidth / 2 && physics.vx > 0) || (nextX - halfW < -bounds.wWidth / 2 && physics.vx < 0)) { physics.vx *= -physics.bounceEnergyLoss; }
        if ((nextY + halfH > bounds.wHeight / 2 && physics.vy > 0) || (nextY - halfH < -bounds.wHeight / 2 && physics.vy < 0)) { physics.vy *= -physics.bounceEnergyLoss; }
        physics.vx *= physics.friction; physics.vy *= physics.friction; physics.va *= physics.friction;
        physics.x += physics.vx; physics.y += physics.vy; physics.angle += physics.va;
        physics.vsx += (1 - physics.scaleX) * physics.spring;
        physics.vsy += (1 - physics.scaleY) * physics.spring;
        physics.vsx *= physics.damping;
        physics.vsy *= physics.damping;
        physics.scaleX += physics.vsx;
        physics.scaleY += physics.vsy;
        faceWrapper.style.transform = `translate(${physics.x}px, ${physics.y}px) rotate(${physics.angle}deg) scale(${physics.scaleX}, ${physics.scaleY})`;
        if (Math.abs(physics.vx) < 0.1 && Math.abs(physics.vy) < 0.1 && Math.abs(physics.va) < 0.1 && Math.abs(1 - physics.scaleX) < 0.01 && Math.abs(1 - physics.scaleY) < 0.01) {
            physics.isRunning = false;
        } else { requestAnimationFrame(updatePhysics); }
    }

    function initialize() { updateBounds(); window.addEventListener('resize', updateBounds); controlButtons.forEach(button => { button.addEventListener('click', (event) => { event.stopPropagation(); switchCharacter(parseInt(button.dataset.character)); }); }); suggestButton.addEventListener('click', (event) => event.stopPropagation()); face.addEventListener('click', (event) => { event.stopPropagation(); triggerSlap(); }); document.body.addEventListener('click', triggerSlap); switchCharacter(0); requestAnimationFrame(updateParticles); }
    function switchCharacter(index) { if (index >= characters.length) return; currentCharacterIndex = index; const char = characters[index]; face.src = char.image; if (!Array.isArray(char.sound)) { characterSound.src = char.sound; } hardResetFaceState(); }
    function createImpactEffect(x, y) { const impact = document.createElement('img'); impact.src = impactImages[Math.floor(Math.random() * impactImages.length)]; impact.className = 'impact-effect'; impact.style.left = `${x}px`; impact.style.top = `${y}px`; attackContainer.appendChild(impact); impact.addEventListener('animationend', () => impact.remove()); }
    function createGasEffect(x, y) { const gasCount = 3; const interval = 50; const styleSheet = document.createElement('style'); document.head.appendChild(styleSheet); for (let i = 0; i < gasCount; i++) { setTimeout(() => { const gas = document.createElement('img'); gas.src = 'fart.png'; gas.className = 'gas-effect'; const offsetX = (Math.random() - 0.5) * (bounds.fWidth * 0.3); const offsetY = (Math.random() - 0.5) * (bounds.fHeight * 0.3); gas.style.left = `${x + offsetX}px`; gas.style.top = `${y + offsetY}px`; const startRotation = Math.random() * 360; const endRotation = startRotation + (Math.random() - 0.5) * 180; const endX = (Math.random() - 0.5) * 50; const endY = (Math.random() - 0.5) * 50; const duration = 0.8 + Math.random() * 0.4; const finalScale = 2.0 + (Math.random() * 1.4); const animName = `gas_${Date.now()}_${i}`; const keyframes = ` @keyframes ${animName} { 0% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.5) rotate(${startRotation}deg); } 100% { opacity: 0; transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(${finalScale}) rotate(${endRotation}deg); } } `; styleSheet.sheet.insertRule(keyframes, styleSheet.sheet.cssRules.length); gas.style.animation = `${animName} ${duration}s ease-out forwards`; attackContainer.appendChild(gas); gas.addEventListener('animationend', () => gas.remove()); }, i * interval); } setTimeout(() => styleSheet.remove(), 1200 + (gasCount * interval)); }
    function sprayParticles() { florpSound.cloneNode(true).play(); const particleCount = 5; const baseAngle = Math.random() * 2 * Math.PI; const sprayArc = Math.PI / 3; for (let i = 0; i < particleCount; i++) { const particleEl = document.createElement('img'); particleEl.src = 'immediate.png'; particleEl.className = 'particle'; const angle = baseAngle + (Math.random() - 0.5) * sprayArc; const speed = 15 + Math.random() * 10; const particleObj = { el: particleEl, x: physics.x, y: physics.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, rotation: Math.random() * 360, rotationVelocity: (Math.random() - 0.5) * 20 }; activeParticles.push(particleObj); attackContainer.appendChild(particleEl); } }
    function updateParticles() { for (let i = activeParticles.length - 1; i >= 0; i--) { const p = activeParticles[i]; p.vy += gravity; p.x += p.vx; p.y += p.vy; p.rotation += p.rotationVelocity; p.el.style.transform = `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.rotation}deg)`; p.el.style.left = `${bounds.wWidth / 2}px`; p.el.style.top = `${bounds.wHeight / 2}px`; if (p.y > (bounds.wHeight / 2) + 200) { p.el.remove(); activeParticles.splice(i, 1); } } requestAnimationFrame(updateParticles); }

    initialize();
});