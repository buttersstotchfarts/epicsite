document.addEventListener('DOMContentLoaded', () => {
    const attackContainer = document.getElementById('attack-container');
    const faceWrapper = document.getElementById('face-wrapper');
    const face = document.getElementById('face');
    const characterSound = document.getElementById('character-sound');
    const slapSound = document.getElementById('slap-sound');
    const smack2Sound = document.getElementById('smack2-sound');
    const florpSound = document.getElementById('florp-sound');
    const gunnSound = document.getElementById('gunn-sound');
    const controlButtons = document.querySelectorAll('#controls button');
    const suggestButton = document.getElementById('suggest-button');
    const counterBox = document.getElementById('counter-box');
    const counterValue = document.getElementById('counter-value');
    const buttonBar = document.getElementById('button-bar');
    const goodbyeButton = document.getElementById('goodbye-button');
    const updateText = document.getElementById('update-text');
    const amplifyButton = document.getElementById('amplify-button');
    
    // New Elements
    const abuseContainer = document.getElementById('abuse-container');
    const abuseButton = document.getElementById('abuse-button');
    const gunnAbuseSounds = ['gunn1.mp3', 'gunn2.mp3', 'gunn3.mp3'];

    const db = firebase.database();
    const smackCountRef = db.ref('/smackCount');

    const characters = [
        { name: "Butt", image: "face.png", sound: "fart.mp3" },
        { name: "James", image: "james.png", sound: "james.mp3" },
        { name: "Alex", image: "alex.png", sound: ['jump.mp3', 'rump.mp3', 'pump.mp3', 'stump.mp3'] },
        { name: "Jim", image: "jim.png", sound: "jim.mp3" },
        { name: "James Gunn", image: "jamesgunn.png", sound: "justone.mp3" },
        { name: "Billy", image: "billy.png", sound: "slap.mp3" }
    ];
    let currentCharacterIndex = 0;
    
    let localSlapCount = 0;
    let billySlapCount = 0;
    let abuseGestureCount = 0;
    let currentGlobalCount = 0;
    let goodbyeButtonShown = false;
    let activeSpeechBubble = null;
    let counterMessageTimer = null; 

    const impactImages = ['impact1.png', 'impact2.png', 'impact3.png', 'impact4.png'];
    let returnToCenterTimer;
    let bounds = {};
    let physics = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0, friction: 0.96, impactMultiplier: 24, bounceEnergyLoss: 0.8, spring: 0.03, damping: 0.92, isRunning: false };
    let activeParticles = [];
    const gravity = 0.5;
    let isSlapLocked = false;

    // Amplified Slap Logic
    let isAmplified = false;

    // Letter Explosion Physics
    let explodedLetters = [];
    let explosionLoopId = null;
    let isTextReturning = false;
    let textRestorationTimeout = null;

    function initialize() {
        updateBounds();
        window.addEventListener('resize', updateBounds);
        controlButtons.forEach(button => { button.addEventListener('click', (event) => { event.stopPropagation(); switchCharacter(parseInt(button.dataset.character)); }); });
        suggestButton.addEventListener('click', (event) => event.stopPropagation());
        face.addEventListener('click', (event) => { event.stopPropagation(); triggerSlap(); });
        document.body.addEventListener('click', triggerSlap);
        
        counterBox.addEventListener('click', (event) => {
            event.stopPropagation();
            checkGlobalSlaps();
        });

        updateText.addEventListener('click', (event) => {
            event.stopPropagation();
            explodeText(event);
        });
        
        amplifyButton.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleAmplify();
        });

        abuseButton.addEventListener('click', (event) => {
            event.stopPropagation();
            triggerGunnAbuse();
        });

        switchCharacter(0);
        requestAnimationFrame(updateParticles);
        
        smackCountRef.on('value', (snapshot) => {
            const count = snapshot.val() || 0;
            currentGlobalCount = count;
            if (counterValue && !counterMessageTimer) { 
                counterValue.textContent = count.toLocaleString();
            }
        });
    }

    function toggleAmplify() {
        isAmplified = !isAmplified;
        if (isAmplified) {
            amplifyButton.classList.add('active');
            // Increase Bounciness
            physics.bounceEnergyLoss = 0.99; // Almost perfect bounce
            physics.friction = 0.99; // Reduced air friction
        } else {
            amplifyButton.classList.remove('active');
            // Reset Bounciness
            physics.bounceEnergyLoss = 0.8;
            physics.friction = 0.96;
        }
    }

    function checkGlobalSlaps() {
        if (counterMessageTimer) clearTimeout(counterMessageTimer);

        const target = 1000000;
        let message = "";

        if (currentGlobalCount < target) {
            const remaining = target - currentGlobalCount;
            message = `${remaining.toLocaleString()} slaps remaining until 1,000,000`;
        } else {
            message = "The slap counter is sufficient, prepare...";
        }

        counterValue.textContent = message;
        counterValue.style.fontSize = "12px"; 

        counterMessageTimer = setTimeout(() => {
            counterValue.textContent = currentGlobalCount.toLocaleString();
            counterValue.style.fontSize = ""; 
            counterMessageTimer = null;
        }, 4000);
    }

    function explodeText() {
        if (updateText.style.opacity === '0' && !isTextReturning) {
            return;
        }

        if (textRestorationTimeout) clearTimeout(textRestorationTimeout);
        isTextReturning = false;

        const text = updateText.textContent;
        const rect = updateText.getBoundingClientRect();
        
        updateText.style.opacity = '0';
        updateText.style.pointerEvents = 'none';
        amplifyButton.classList.remove('hidden');

        explodedLetters.forEach(p => p.el.remove());
        explodedLetters = [];

        for (let i = 0; i < text.length; i++) {
            const letter = text[i];
            if (letter === " ") continue; 

            const span = document.createElement('span');
            span.textContent = letter;
            span.className = 'exploded-letter';
            const xOffset = i * 7; 
            
            const startX = rect.left + xOffset;
            const startY = rect.top;

            span.style.left = `${startX}px`;
            span.style.top = `${startY}px`;
            
            document.body.appendChild(span);

            explodedLetters.push({
                el: span,
                startX: startX,
                startY: startY,
                x: startX,
                y: startY,
                vx: (Math.random() - 0.5) * 15, 
                vy: (Math.random() - 1.0) * 15, 
                rot: 0,
                vRot: (Math.random() - 0.5) * 20
            });
        }

        if (!explosionLoopId) {
            updateExplosion();
        }

        textRestorationTimeout = setTimeout(() => {
            isTextReturning = true;
        }, 5000);
    }

    function updateExplosion() {
        if (explodedLetters.length === 0) {
            explosionLoopId = null;
            return;
        }

        let allHome = true;

        for (let i = explodedLetters.length - 1; i >= 0; i--) {
            let p = explodedLetters[i];
            
            if (isTextReturning) {
                const dx = p.startX - p.x;
                const dy = p.startY - p.y;
                
                p.x += dx * 0.1;
                p.y += dy * 0.1;
                p.rot *= 0.8; 
                
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 1 || Math.abs(p.rot) > 1) {
                    allHome = false;
                }
            } else {
                allHome = false; 
                p.vy += 0.8; 
                p.vx *= 0.99; 
                
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vRot;

                const bWidth = window.innerWidth;
                const bHeight = window.innerHeight;

                if (p.x < 0) { p.x = 0; p.vx *= -0.8; }
                if (p.x > bWidth - 10) { p.x = bWidth - 10; p.vx *= -0.8; }
                
                if (p.y > bHeight - 20) {
                    p.y = bHeight - 20;
                    p.vy *= -0.6; 
                    p.vx *= 0.8; 
                    if (Math.abs(p.vy) < 1) p.vy = 0;
                }
            }

            p.el.style.transform = `translate(${p.x - parseFloat(p.el.style.left)}px, ${p.y - parseFloat(p.el.style.top)}px) rotate(${p.rot}deg)`;
        }

        if (isTextReturning && allHome) {
            explodedLetters.forEach(p => p.el.remove());
            explodedLetters = [];
            
            updateText.style.opacity = '1';
            updateText.style.pointerEvents = 'all';
            amplifyButton.classList.add('hidden');
            
            explosionLoopId = null;
        } else {
            explosionLoopId = requestAnimationFrame(updateExplosion);
        }
    }
    
    function triggerGunnAbuse() {
        abuseGestureCount++;
        face.src = 'jamesgunnsad.png';
        const soundFile = gunnAbuseSounds[Math.floor(Math.random() * gunnAbuseSounds.length)];
        new Audio(soundFile).play();

        const finger = document.createElement('img');
        finger.src = 'middlefinger.png';
        finger.className = 'finger-effect';
        const randomOffset = (Math.random() - 0.5) * 50; 
        finger.style.left = `calc(50% + ${randomOffset}px)`;
        document.body.appendChild(finger); 
        
        finger.addEventListener('animationend', () => {
            finger.remove();
            abuseGestureCount--;
            if (abuseGestureCount <= 0 && currentCharacterIndex === 4) {
                abuseGestureCount = 0;
                face.src = 'jamesgunn.png';
            }
        });
    }

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

    function showGoodbyeButton() {
        buttonBar.classList.add('hidden');
        goodbyeButton.classList.remove('hidden');
        goodbyeButtonShown = true;
    }

    function executeSlap() {
        if (currentCharacterIndex === 5) {
            performBillyDeflection();
            return;
        }

        smackCountRef.transaction((currentCount) => (currentCount || 0) + 1);
        
        localSlapCount++;
        if (!goodbyeButtonShown && localSlapCount >= 100) {
            showGoodbyeButton();
        }

        if (currentCharacterIndex === 2 && localSlapCount === 1) {
            showSpeechBubble("Please! Don't slap me 100 times! He might hear!", 10000);
        }

        const guide = document.createElement('div'); guide.className = 'attacker-guide';
        const attacker = document.createElement('img'); attacker.className = 'attacker'; 
        attacker.src = 'hand.png';

        if (isAmplified) {
            attacker.classList.add('amplified');
        }

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
            
            let forceX = finalImpactVector.x;
            let forceY = finalImpactVector.y;
            
            if (isAmplified) {
                forceX *= 4;
                forceY *= 4;
            }

            applyForce(forceX, forceY);

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

    function performBillyDeflection() {
        smackCountRef.transaction((currentCount) => (currentCount || 0) - 1);
        billySlapCount++;

        if (billySlapCount === 20) {
            window.location.href = "https://youtube.com/watch?v=2x15uu4YBMc";
            return;
        }
        
        if (billySlapCount === 10) {
            showSpeechBubble("LAST CHANCE.", 3000);
        } else if (billySlapCount === 5) {
            showSpeechBubble("I'M WARNING YOU.", 3000);
        } else if (billySlapCount === 1) {
            showSpeechBubble("DO NOT HIT BILLY.", 3000);
        }

        const guide = document.createElement('div'); guide.className = 'attacker-guide';
        const attacker = document.createElement('img'); 
        
        attacker.className = 'attacker-deflected';
        attacker.src = 'hand.png';

        const targetX = (bounds.wWidth / 2) + physics.x;
        const targetY = (bounds.wHeight / 2) + physics.y;

        const isLeft = Math.random() < 0.5;
        let guideTransform = 'translate(-50%, -50%)';
        guide.style.left = `${targetX}px`; guide.style.top = `${targetY}px`;
        
        if (isLeft) { guideTransform += ' scaleX(-1)'; } 
        guide.style.transform = guideTransform;

        guide.appendChild(attacker);
        attackContainer.appendChild(guide);

        setTimeout(() => {
            slapSound.cloneNode(true).play();
            faceWrapper.classList.remove('rumble-effect');
            void faceWrapper.offsetWidth;
            faceWrapper.classList.add('rumble-effect');

            const minusOne = document.createElement('div');
            minusOne.className = 'damage-text';
            minusOne.textContent = "-1";
            minusOne.style.left = `${targetX}px`;
            minusOne.style.top = `${targetY - 50}px`;
            attackContainer.appendChild(minusOne);
            minusOne.addEventListener('animationend', () => minusOne.remove());

        }, 180);

        attacker.addEventListener('animationend', () => guide.remove());
    }

    function showSpeechBubble(text, duration) {
        if (activeSpeechBubble) {
            activeSpeechBubble.remove();
        }
        activeSpeechBubble = document.createElement('div');
        activeSpeechBubble.className = 'speech-bubble';
        activeSpeechBubble.textContent = text;
        faceWrapper.appendChild(activeSpeechBubble);
        
        setTimeout(() => {
            if (activeSpeechBubble && activeSpeechBubble.parentElement) {
                activeSpeechBubble.remove();
                activeSpeechBubble = null;
            }
        }, duration || 4000);
    }

    function switchCharacter(index) {
        if (index >= characters.length) return;
        currentCharacterIndex = index;
        const char = characters[index];
        face.src = char.image;
        if (!Array.isArray(char.sound)) { characterSound.src = char.sound; }
        
        localSlapCount = 0;
        billySlapCount = 0;
        abuseGestureCount = 0; 
        goodbyeButtonShown = false;
        buttonBar.classList.remove('hidden');
        goodbyeButton.classList.add('hidden');
        
        if (index === 4) {
            abuseContainer.classList.remove('hidden');
        } else {
            abuseContainer.classList.add('hidden');
        }

        if (activeSpeechBubble) {
            activeSpeechBubble.remove();
            activeSpeechBubble = null;
        }

        hardResetFaceState();
    }

    function hardResetFaceState() {
        isSlapLocked = false;
        gunnSound.pause();
        if (activeSpeechBubble) {
            activeSpeechBubble.remove();
            activeSpeechBubble = null;
        }
        physics.isRunning = false;
        faceWrapper.classList.remove('returning');
        faceWrapper.classList.remove('rumble-effect');
        clearTimeout(returnToCenterTimer);
        Object.assign(physics, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0 });
        
        // Ensure amplified settings stick after a reset
        if (isAmplified) {
            physics.bounceEnergyLoss = 0.99;
            physics.friction = 0.99;
        } else {
            physics.bounceEnergyLoss = 0.8;
            physics.friction = 0.96;
        }

        faceWrapper.style.transform = 'translate(0, 0) rotate(0) scale(1,1)';
    }

    function createGasEffect(x, y) { const gasCount = 3; const interval = 50; const styleSheet = document.createElement('style'); document.head.appendChild(styleSheet); for (let i = 0; i < gasCount; i++) { setTimeout(() => { const gas = document.createElement('img'); gas.src = 'fart.png'; gas.className = 'gas-effect'; const offsetX = (Math.random() - 0.5) * (bounds.fWidth * 0.3); const offsetY = (Math.random() - 0.5) * (bounds.fHeight * 0.3); gas.style.left = `${x + offsetX}px`; gas.style.top = `${y + offsetY}px`; const startRotation = Math.random() * 360; const endRotation = startRotation + (Math.random() - 0.5) * 180; const endX = (Math.random() - 0.5) * 50; const endY = (Math.random() - 0.5) * 50; const duration = 0.8 + Math.random() * 0.4; const finalScale = 2.0 + (Math.random() * 1.4); const animName = `gas_${Date.now()}_${i}`; const keyframes = ` @keyframes ${animName} { 0% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.5) rotate(${startRotation}deg); } 100% { opacity: 0; transform: translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(${finalScale}) rotate(${endRotation}deg); } } `; styleSheet.sheet.insertRule(keyframes, styleSheet.sheet.cssRules.length); gas.style.animation = `${animName} ${duration}s ease-out forwards`; attackContainer.appendChild(gas); gas.addEventListener('animationend', () => gas.remove()); }, i * interval); } setTimeout(() => styleSheet.remove(), 1200 + (gasCount * interval)); }
    function createImpactEffect(x, y) { const impact = document.createElement('img'); impact.src = impactImages[Math.floor(Math.random() * impactImages.length)]; impact.className = 'impact-effect'; impact.style.left = `${x}px`; impact.style.top = `${y}px`; attackContainer.appendChild(impact); impact.addEventListener('animationend', () => impact.remove()); }
    function sprayParticles() { florpSound.cloneNode(true).play(); const particleCount = 5; const baseAngle = Math.random() * 2 * Math.PI; const sprayArc = Math.PI / 3; for (let i = 0; i < particleCount; i++) { const particleEl = document.createElement('img'); particleEl.src = 'immediate.png'; particleEl.className = 'particle'; const angle = baseAngle + (Math.random() - 0.5) * sprayArc; const speed = 15 + Math.random() * 10; const particleObj = { el: particleEl, x: physics.x, y: physics.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, rotation: Math.random() * 360, rotationVelocity: (Math.random() - 0.5) * 20 }; activeParticles.push(particleObj); attackContainer.appendChild(particleEl); } }
    function updateParticles() { for (let i = activeParticles.length - 1; i >= 0; i--) { const p = activeParticles[i]; p.vy += gravity; p.x += p.vx; p.y += p.vy; p.rotation += p.rotationVelocity; p.el.style.transform = `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.rotation}deg)`; p.el.style.left = `${bounds.wWidth / 2}px`; p.el.style.top = `${bounds.wHeight / 2}px`; if (p.y > (bounds.wHeight / 2) + 200) { p.el.remove(); activeParticles.splice(i, 1); } } requestAnimationFrame(updateParticles); }
    function updateBounds() { bounds = { wWidth: window.innerWidth, wHeight: window.innerHeight, fWidth: faceWrapper.offsetWidth, fHeight: faceWrapper.offsetHeight }; }
    function smoothReturnToCenter() { physics.isRunning = false; faceWrapper.classList.add('returning'); faceWrapper.style.transform = 'translate(0, 0) rotate(0) scale(1,1)'; setTimeout(() => { faceWrapper.classList.remove('returning'); Object.assign(physics, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, scaleX: 1, scaleY: 1, vsx: 0, vsy: 0 }); }, 500); }
    function applyForce(forceX, forceY) { physics.vx += forceX * physics.impactMultiplier; physics.vy += forceY * physics.impactMultiplier; physics.va += (Math.random() - 0.5) * 8; physics.vsx -= 0.3; physics.vsy += 0.3; if (!physics.isRunning) { physics.isRunning = true; updatePhysics(); } }
    function updatePhysics() { if (!physics.isRunning) return; const outOfBoundsX = Math.abs(physics.x) > (bounds.wWidth / 2 + bounds.fWidth); const outOfBoundsY = Math.abs(physics.y) > (bounds.wHeight / 2 + bounds.fHeight); if (outOfBoundsX || outOfBoundsY) { hardResetFaceState(); return; } const nextX = physics.x + physics.vx; const nextY = physics.y + physics.vy; const halfW = bounds.fWidth / 2; const halfH = bounds.fHeight / 2; if ((nextX + halfW > bounds.wWidth / 2 && physics.vx > 0) || (nextX - halfW < -bounds.wWidth / 2 && physics.vx < 0)) { physics.vx *= -physics.bounceEnergyLoss; } if ((nextY + halfH > bounds.wHeight / 2 && physics.vy > 0) || (nextY - halfH < -bounds.wHeight / 2 && physics.vy < 0)) { physics.vy *= -physics.bounceEnergyLoss; } physics.vx *= physics.friction; physics.vy *= physics.friction; physics.va *= physics.friction; physics.x += physics.vx; physics.y += physics.vy; physics.angle += physics.va; physics.vsx += (1 - physics.scaleX) * physics.spring; physics.vsy += (1 - physics.scaleY) * physics.spring; physics.vsx *= physics.damping; physics.vsy *= physics.damping; physics.scaleX += physics.vsx; physics.scaleY += physics.vsy; faceWrapper.style.transform = `translate(${physics.x}px, ${physics.y}px) rotate(${physics.angle}deg) scale(${physics.scaleX}, ${physics.scaleY})`; if (Math.abs(physics.vx) < 0.1 && Math.abs(physics.vy) < 0.1 && Math.abs(physics.va) < 0.1 && Math.abs(1 - physics.scaleX) < 0.01 && Math.abs(1 - physics.scaleY) < 0.01) { physics.isRunning = false; } else { requestAnimationFrame(updatePhysics); } }

    initialize();
});