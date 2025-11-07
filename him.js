document.addEventListener('DOMContentLoaded', () => {
    const dialogueTextElement = document.getElementById('dialogue-text');
    const speakerNameElement = document.getElementById('speaker-name');
    const choicesArea = document.getElementById('choices-area');
    const characterSprite = document.getElementById('character-sprite');
    const continuePrompt = document.getElementById('continue-prompt');
    const dialogueContainer = document.getElementById('dialogue-container');
    const nameplate = document.getElementById('nameplate');
    const inputArea = document.getElementById('input-area');
    const nameInput = document.getElementById('name-input');
    const nameSubmitButton = document.getElementById('name-submit-button');
    const selectSound = document.getElementById('select-sound');
    const buttonSelectSound = document.getElementById('button-select-sound');
    const bgMusic = document.getElementById('bg-music');

    let currentNodeId = 'start';
    let isTyping = false;
    let typingTimeout;
    let playerName = "";
    let musicStarted = false;

    // MODIFIED: All placeholder URLs have been updated
    const dialogueTree = {
        'start': { speaker: "Pawny", text: "H-hello? Is.. Anyone there?", nextId: 'choice_1' },
        'choice_1': { choices: [ { text: "It's me, I'm here, Pawny.", nextId: 'path_A_1' }, { text: "We musn't speak of you.", nextId: 'path_B_1' }, ] },
        'path_A_1': { speaker: "Pawny", text: "And... you are? Please don't tell me you're one of THEM...", nextId: 'name_input' },
        'path_B_1': { speaker: "Pawny", text: "Don't tell me you're... gulp", nextId: 'name_input' },
        'name_input': { isInput: true, prompt: "What's your name?", conditions: [ { names: ["alex", "jim", "jamie", "james", "ihe", "beltman"], nextId: 'cond_gloat' }, { names: ["pawny"], nextId: 'cond_liar' }, { names: ["queen"], nextId: 'cond_queen' } ], defaultNextId: 'cond_else' },
        'cond_gloat': { speaker: "Pawny", text: "Y-you?! C-come back to gloat, have you?!", nextId: 'choice_gloat' },
        'cond_liar': { speaker: "Pawny", text: "Liar. [The dialogue goes back to the text prompt asking what your name is]", nextId: 'name_input' },
        'cond_queen': { speaker: "Pawny", text: "My queen! You're alive?!", nextId: 'choice_queen' },
        'cond_else': { speaker: "Pawny", text: "I miss being in the limelight. I miss it so much.", nextId: 'choice_else' },
        'choice_gloat': { choices: [{ text: "No, Pawny.", nextId: 'gloat_no' }, { text: "Yes, Pawny.", nextId: 'gloat_yes' }] },
        'gloat_no': { speaker: "Pawny", text: "It's so cold, <NAME>. I feel so alone.", nextId: 'choice_gloat_no' },
        'choice_gloat_no': { choices: [{ text: "You'll be back one day, my friend. Even if it takes another 6 years.", nextId: 'gloat_no_A' }] },
        'gloat_no_A': { speaker: "Pawny", text: "You think so?", nextId: 'choice_gloat_no_A' },
        'choice_gloat_no_A': { choices: [{ text: "I know so.", nextId: 'gloat_no_B' }] },
        'gloat_no_B': { speaker: "Pawny", text: "Thank you. I feel like I can finally move on", nextId: 'end_redirect_only' },
        'gloat_yes': { speaker: "Pawny", text: "Why? My time in the spotlight was finite. Why come back?", nextId: 'choice_gloat_yes' },
        'choice_gloat_yes': { choices: [{ text: "I HATE PAWNY.", nextId: 'gloat_yes_A' }, { text: "Don't know.", nextId: 'gloat_yes_B' }] },
        'gloat_yes_A': { speaker: "Pawny", text: "What??", nextId: 'choice_gloat_yes_A' },
        'choice_gloat_yes_A': { choices: [{ text: "I HATE PAWNY.", nextId: 'end_cruel' }] },
        'gloat_yes_B': { speaker: "Pawny", text: "You are a lost man, Beltman.", nextId: 'choice_gloat_yes_B' },
        'choice_gloat_yes_B': { choices: [{ text: "So freaking what?", nextId: 'end_cruel' }] },
        'choice_queen': { choices: [{ text: "No, I lied.", nextId: 'queen_no' }, { text: "Yes, Pawny! Your queen has returned!", nextId: 'queen_yes' }] },
        'queen_no': { speaker: "Pawny", text: "To do something so cruel... I'm... I'm gonna go.", nextId: 'choice_queen_no' },
        'choice_queen_no': { choices: [{ text: "Wait! Don't leave!", nextId: 'end_cruel' }] },
        'queen_yes': { speaker: "Pawny", text: "YES! THIS IS AMAZING! OH, I'M SO GLAD YOU'RE BACK, MY QUEEN! I WAS SO WORRIED ABOUT YOU!", nextId: 'choice_queen_yes' },
        'choice_queen_yes': { choices: [{ text: "Yes!", nextId: 'queen_yes_A' }] },
        'queen_yes_A': { speaker: "Pawny", text: "Hey, wait... you're not Tessa Thompson... Are you trying to trick me?", nextId: 'choice_queen_yes_A' },
        'choice_queen_yes_A': { choices: [{ text: "N-no...", nextId: 'end_cruel' }] },
        'choice_else': { choices: [{ text: "You'll have your day again, Pawny.", nextId: 'else_A' }, { text: "Fuck you, Pawny.", nextId: 'else_B' }] },
        'else_A': { speaker: "Pawny", text: "I know. I know it'll happen. I know it will. But... but I just...", nextId: 'choice_else_A' },
        'choice_else_A': { choices: [{ text: "Just what?", nextId: 'else_A_2' }] },
        'else_A_2': { speaker: "Pawny", text: "Just nothing... Look. I have to go. Tell the boys I said hi, okay? I miss them already.", nextId: 'choice_else_A_2' },
        'choice_else_A_2': { choices: [{ text: "Okay Pawny. I'll tell them.", nextId: 'end_redirect_only' }] },
        'else_B': { speaker: "Pawny", text: "Wh-what? Why are you.. being so mean?", nextId: 'choice_else_B' },
        'choice_else_B': { choices: [{ text: "End yourself Pawny.", nextId: 'else_B_2' }, { text: "I'm kidding. I love you, Pawny.", nextId: 'else_B_3' }] },
        'else_B_2': { speaker: "Pawny", text: "STOP STOP!!", nextId: 'choice_else_B_2' },
        'choice_else_B_2': { choices: [{ text: "NO. WE HATE YOU FOREVER PAWNY. FUCK YOU.", nextId: 'else_B_2_A' }] },
        'else_B_2_A': { speaker: "Pawny", text: "WAAAAAAA", nextId: 'end_redirect_only' },
        'else_B_3': { speaker: "Pawny", text: "You do? For real?", nextId: 'choice_else_B_3' },
        'choice_else_B_3': { choices: [{ text: "When god made you, he said... 'Perfectly done'", nextId: 'redirect_good' }, { text: "Yes.", nextId: 'redirect_good' }] },
        'end_cruel': { speaker: "Pawny", text: "Cruel, cruel person. Goodbye. Forever.", isLeaving: true, redirect: { url: 'https://youtu.be/WZN4K6EvPiU', delay: 2000 } },
        'end_redirect_only': { isLeaving: true, redirect: { url: 'https://youtu.be/WZN4K6EvPiU', delay: 1500 } },
        'redirect_good': { speaker: "Pawny", text: "Thank you, <NAME>. I have something for you.", redirect: { url: 'https://youtu.be/WZN4K6EvPiU', delay: 2000 } }
    };

    // NEW: Function to start music on first user interaction
    function startMusic() {
        if (musicStarted) return;
        musicStarted = true;
        bgMusic.muted = false;
        bgMusic.play().catch(e => console.error("Audio play failed:", e));
    }
    // Add a one-time listener to the whole document
    document.body.addEventListener('click', startMusic, { once: true });


    function startTypewriter(text, onFinished) {
        let i = 0;
        dialogueTextElement.textContent = "";
        dialogueTextElement.classList.add('typing');
        isTyping = true;
        continuePrompt.style.display = 'none';
        function type() {
            if (i < text.length) {
                dialogueTextElement.textContent += text.charAt(i); i++;
                typingTimeout = setTimeout(type, 35);
            } else { isTyping = false; dialogueTextElement.classList.remove('typing'); if (onFinished) onFinished(); }
        }
        type();
    }

    function showFullText(text, onFinished) {
        clearTimeout(typingTimeout);
        dialogueTextElement.textContent = text.replace(/<NAME>/g, playerName);
        dialogueTextElement.classList.remove('typing');
        isTyping = false;
        if (onFinished) onFinished();
    }
    
    function showNode(id) {
        const node = dialogueTree[id];
        if (!node) return;

        currentNodeId = id;
        choicesArea.classList.add('hidden');
        inputArea.classList.add('hidden');
        dialogueTextElement.classList.remove('hidden');
        continuePrompt.style.display = 'none';
        dialogueContainer.onclick = null;

        if (node.speaker) {
            nameplate.classList.remove('hidden');
            speakerNameElement.textContent = node.speaker;
            characterSprite.classList.add('active');
        } else {
            nameplate.classList.add('hidden');
        }

        const onTextFinished = () => {
            if (node.isEnd || node.redirect) {
                dialogueContainer.onclick = null;
                if(node.isLeaving) characterSprite.classList.add('leaving');
                if(node.redirect) setTimeout(() => { window.location.href = node.redirect.url; }, node.redirect.delay);
            } else if (node.choices) {
                displayChoices(node.choices);
            } else if (node.isInput) {
                displayInput(node);
            } else if (node.nextId) {
                continuePrompt.style.display = 'block';
                dialogueContainer.onclick = () => {
                    selectSound.currentTime = 0; selectSound.play();
                    showNode(node.nextId);
                };
            }
        };

        if (node.text) {
            const processedText = node.text.replace(/<NAME>/g, playerName);
            startTypewriter(processedText, onTextFinished);
            dialogueContainer.onclick = () => {
                selectSound.currentTime = 0; selectSound.play();
                if (isTyping) showFullText(processedText, onTextFinished);
                else if (node.nextId && !node.choices) showNode(node.nextId);
            };
        } else {
            onTextFinished();
        }
    }
    
    function displayChoices(choices) {
        dialogueTextElement.classList.add('hidden');
        choicesArea.classList.remove('hidden');
        choicesArea.innerHTML = '';
        
        choices.forEach(choice => {
            const button = document.createElement('div');
            button.className = 'choice-button';
            button.textContent = choice.text;
            button.onclick = (e) => {
                e.stopPropagation();
                buttonSelectSound.currentTime = 0; buttonSelectSound.play();
                showNode(choice.nextId);
            };
            choicesArea.appendChild(button);
        });
    }

    function displayInput(node) {
        dialogueTextElement.classList.add('hidden');
        inputArea.classList.remove('hidden');
        nameInput.placeholder = node.prompt;
        nameInput.value = "";
        nameInput.focus();

        const submitAction = () => {
            buttonSelectSound.currentTime = 0; buttonSelectSound.play();
            const inputText = nameInput.value.trim().toLowerCase();
            playerName = nameInput.value.trim();
            let nextNodeId = node.defaultNextId;

            if (inputText) {
                for (const condition of node.conditions) {
                    if (condition.names.includes(inputText)) {
                        nextNodeId = condition.nextId;
                        break;
                    }
                }
            }
            showNode(nextNodeId);
        };
        
        nameSubmitButton.onclick = submitAction;
        nameInput.onkeydown = (e) => { if (e.key === 'Enter') submitAction(); };
    }

    showNode('start');
});