const startBtn = document.getElementById('start-btn');
const timerBar = document.getElementById('timer-bar');
const grid = document.getElementById('quiz-grid');

let currentRound = 1;
let currentQuestion = 1;
let timeLeft = 10;
let gameInterval;

// Dummy data structure based on your blueprint
const gameData = {
    1: { count: 5, same: 'assets/images/r1_same.png', odd: 'assets/images/r1_odd.png' },
    2: { count: 10, same: 'assets/images/r2_same.png', odd: 'assets/images/r2_odd.png' },
    // Add 3, 4, 5...
};

startBtn.addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-hud').classList.remove('hidden');
    loadQuestion();
});

function loadQuestion() {
    const data = gameData[currentRound];
    grid.innerHTML = '';
    grid.className = `grid-${data.count}`;

    let items = [];
    for(let i=0; i < data.count - 1; i++) items.push({isOdd: false, src: data.same});
    items.push({isOdd: true, src: data.odd});
    
    // Shuffle
    items.sort(() => Math.random() - 0.5);

    items.forEach(item => {
        const img = document.createElement('img');
        img.src = item.src;
        img.onclick = () => { if(item.isOdd) nextQuestion(); };
        grid.appendChild(img);
    });

    startTimer();
}

function startTimer() {
    timeLeft = 10;
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        timeLeft -= 0.1;
        let percentage = (timeLeft / 10) * 100;
        timerBar.style.width = percentage + "%";

        if (timeLeft <= 1) timerBar.classList.add('timer-pulse');
        else timerBar.classList.remove('timer-pulse');

        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            alert("Time's Up!");
            nextQuestion();
        }
    }, 100); // 60fps-ish updates
}

function nextQuestion() {
    if (currentQuestion < 6) {
        currentQuestion++;
    } else {
        currentRound++;
        currentQuestion = 1;
    }
    
    if (currentRound > 5) {
        alert("Quiz Complete!");
    } else {
        loadQuestion();
    }
}