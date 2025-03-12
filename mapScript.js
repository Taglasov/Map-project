// Инициализация карты
const map = L.map('map', {
    zoomControl: false,
    maxZoom: 10,
    attributionControl: false
}).setView([58.2, 107.0], 5);

// Добавление слоя с картой
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Объявление переменных
let vectorGridLayer;
let randomFeature;
let geoJsonData;
let regionQueue = []; // Очередь регионов
let regionStatus = []; // Хранит информацию о правильности ответа для каждого региона
let id_region = 0;
let flagend = true;

// Загрузка GeoJSON
fetch('irk.json') // Укажите путь к вашему GeoJSON-файлу
    .then(response => response.json())
    .then(data => {
        // Генерация уникальных идентификаторов для каждого объекта
        geoJsonData = data;
        geoJsonData.features.forEach((feature, index) => {
            feature.properties.id = index;
        });
        // Подключаем GeoJSON через VectorGrid
        vectorGridLayer = L.vectorGrid.slicer(geoJsonData, {
            rendererFactory: L.canvas.tile, // Используем Canvas для рендеринга
            vectorTileLayerStyles : {
                sliced: (properties, zoom) => ({
                    color: 'white',
                    weight: 2,
                    fill: true,
                    fillColor: '#0594fa',
                    fillOpacity: 0.7,
                }),
            },
            getFeatureId: function(f) {
                return f.properties.id;
            },
            interactive: true, // Включаем интерактивность
            //maxZoom: 14 // Максимальный уровень зума
        }).addTo(map);

        vectorGridLayer.on('tileunload', () => {
            highlightFeature();
        });


        const bounds = [
            [40, 70], // Юго-западная точка
            [70, 150] // Северо-восточная точка
        ];

        map.setMaxBounds(bounds);
        //map.fitBounds(bounds);
        map.setMinZoom(5); // Минимальный зум
        map.setMaxZoom(7); // Максимальный зум
        //endGame();
    });

function startGame(){
    // Создаём очередь регионов
    regionQueue = generateRegionQueue(geoJsonData.features);
    document.getElementById('score-size').innerText = regionQueue.length;
    toggleButtons(true);
    flagend = false;
    score.correct = 0;
    score.count = 0;
    score.time = 0;
    document.getElementById('score-correct').innerText = score.correct;
    document.getElementById('score-count').innerText = score.count;
    document.getElementById('score-time').innerText = score.time;

    // Сбрасываем стили всех регионов
    geoJsonData.features.forEach((feature) => {
        vectorGridLayer.resetFeatureStyle(feature.properties.id);
    });

    // Скрываем кнопку "Начать" и показываем варианты
    toggleStartButton(false);
    toggleAnswerButtons(true);

    chooseNextFeature();
}

// Генерация случайной очереди
function generateRegionQueue(features) {
    const indices = [...Array(features.length).keys()]; // Индексы всех регионов
    id_region = 0;
    regionStatus = [...Array(features.length)];
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]]; // Перемешиваем индексы
    }
    return indices;
}

// Функция выбора случайного элемента
function chooseNextFeature() {
    if (id_region === regionQueue.length) {
        endGame(); // Завершаем игру, если очередь пуста
        return;
    }

    reset(); // Сбрасываем состояние предыдущего выбора
    score.count++;
    document.getElementById('score-count').innerText = score.count;
    // Список всех доступных объектов
    const nextIndex = regionQueue[id_region++]; // берем первый элемент из очереди
    randomFeature = geoJsonData.features[nextIndex]; // Получаем соответствующий регион

    const allOptions = geoJsonData.features.map(f => f.properties.district);
    const correctDistrict = randomFeature.properties.district;

    highlightFeature();

    // Генерация кнопок с ответами
    generateAnswers(correctDistrict, allOptions);
}

function highlightFeature() {
    if(flagend)
        return;
    const featureId = randomFeature.properties.id;
    // Центрируем карту на выбранный объект
    const bounds = L.latLngBounds(
        randomFeature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])
    );
    map.flyToBounds(bounds, {
        maxZoom: 5.6,
        duration: 0.5,
    });
    // Установка стиля для выбранного объекта
    vectorGridLayer.setFeatureStyle(featureId, {
        fill: true,
        weight: 2,
        color: 'red',
        fillColor: 'yellow',
        fillOpacity: 0.7,
    });

}


// Функция сброса состояния
function reset() {
    if (!randomFeature) return;

    stopTimer();

    // Сброс стилей кнопок
    document.querySelectorAll('.answer-button').forEach(btn => {
        btn.classList.remove('correct', 'incorrect');
    });
    vectorGridLayer.resetFeatureStyle(randomFeature.properties.id);
}

// Функция генерации вариантов ответа
function generateAnswers(correct, allOptions) {
    startTimer();

    const incorrectOptions = allOptions.filter(option => option !== correct);
    const shuffledIncorrectOptions = incorrectOptions.sort(() => Math.random() - 0.5).slice(0, 3);
    const answerOptions = [...shuffledIncorrectOptions, correct].sort(() => Math.random() - 0.5);

    const buttons = document.querySelectorAll('.answer-button');
    answerOptions.forEach((option, index) => {
        buttons[index].innerText = option;
        buttons[index].dataset.correct = option === correct ? 'true' : 'false';
    });
}

function toggleButtons(state) {
    const buttons = document.querySelectorAll('.answer-button');
    buttons.forEach((button) => {
        button.disabled = !state; // Блокируем/разблокируем кнопки
    });
}

// Проверка ответа
function checkAnswer(button) {
    stopTimer();

    toggleButtons(false); // Включаем кнопки

    const isCorrect = button && button.dataset.correct === 'true';
    if (button != false) {
        if (isCorrect) {
            button.classList.add('correct');
        } else {
            button.classList.add('incorrect');
        }
    }

    flashBackground(isCorrect);
    regionStatus[randomFeature.properties.id] = isCorrect; // Правильный ответ
    updateScore(isCorrect);

    setTimeout(() => {
        toggleButtons(true); // Включаем кнопки
        document.querySelectorAll('.answer-button').forEach(btn => {
            btn.classList.remove('correct', 'incorrect');
        });
        chooseNextFeature();
    }, 100);
}

// Функция обновления счётчиков
// Пример начального значения очков
let score = {
    correct: 0,
    count: 0,
    time: 0,
};

function updateScore(isCorrect) {
    if (isCorrect) {
        score.correct++;
        document.getElementById('score-correct').innerText = score.correct;
        score.time += remainingTime;
        score.time = Math.round(score.time*100)/100;
        document.getElementById('score-time').innerText = score.time;
    }
}


let timerDuration = 8; // Время на ответ в секундах
let warningThreshold = 2; // Сколько секунд до конца таймера, чтобы сменить цвет
let timerInterval; // Хранит интервал таймера
let remainingTime; //текущее время

function startTimer() {
    // Сбрасываем ширину полоски до 100%
    const timerBar = document.getElementById('timer-bar');
    timerBar.style.backgroundColor = '#4caf50'; // Зелёный цвет
    timerBar.style.width = '100%';

    // Устанавливаем параметры для обновления
    const updateInterval = 5; // Обновление каждые 50 мс (20 раз в секунду)
    const step = 100 / (timerDuration * (1000 / updateInterval)); // Шаг изменения ширины
    let currentWidth = 100; // Начальная ширина в процентах
    remainingTime = timerDuration; // Оставшееся время в секундах

    timerInterval = setInterval(() => {
        currentWidth -= step;
        remainingTime -= updateInterval / 1000; // Уменьшаем время в секундах
        timerBar.style.width = `${currentWidth}%`;

        if (remainingTime <= warningThreshold) {
            timerBar.style.backgroundColor = '#f44336'; // Красный цвет
        }

        // Если время истекло, сбрасываем таймер
        if (currentWidth <= 0) {
            stopTimer();
            flashBackground(false)
            checkAnswer(false);
        }
    }, updateInterval); // Обновление каждые 100 миллисекунд
}

function stopTimer() {
    clearInterval(timerInterval); // Останавливаем таймер
}

function endGame() {
    stopTimer();
    flagend = true;
    toggleButtons(false);
    map.flyTo([58.2, 107.0], 5, {
        duration: 1.5, // Продолжительность анимации в секундах
    });
    // Окрашиваем регионы на основе статуса
    Object.keys(regionStatus).forEach((id) => {
        const isCorrect = regionStatus[regionQueue[id]];
        vectorGridLayer.setFeatureStyle(regionQueue[id], {
            fill: true,
            weight: 2,
            color: 'white',
            fillColor: isCorrect ? 'green' : 'red', // Зелёный для правильного, красный для неправильного
            fillOpacity: 0.7,
        });
    });
    let tooltips = {}; // Хранит tooltip для каждого региона
    vectorGridLayer.on('mouseover', (event) => {
        if(!flagend) return;
        const properties = event.layer.properties;
        if (properties && properties.district) {
            const tooltip = L.tooltip({
                direction: 'top',
                offset: [0, -30],
                permanent: false,
                opacity: 0.7,
            })
                .setLatLng(event.latlng)
                .setContent(`<strong>${properties.district}</strong>`);
            map.openTooltip(tooltip);

            // Сохраняем tooltip в объекте
            tooltips[properties.id] = tooltip;

            vectorGridLayer.setFeatureStyle(properties.id, {
                fill: true,
                weight: 4,
                color: 'white',
                fillColor: regionStatus[properties.id] ? 'green' : 'red', // Зелёный для правильного, красный для неправильного
                fillOpacity: 1,
            });
        }
    });

    vectorGridLayer.on('mouseout', (event) => {
        if(!flagend) return;
        const properties = event.layer.properties;
        if (properties && tooltips[properties.id]) {
            map.closeTooltip(tooltips[properties.id]); // Закрываем tooltip
            delete tooltips[properties.id]; // Удаляем из объекта
        }

        vectorGridLayer.setFeatureStyle(properties.id, {
            fill: true,
            weight: 2,
            color: 'white',
            fillColor: regionStatus[properties.id] ? 'green' : 'red', // Зелёный для правильного, красный для неправильного
            fillOpacity: 0.7,
        });
    });

    map.on('moveend', () => {
        if(!flagend) return;
        Object.keys(tooltips).forEach((id) => {
            map.closeTooltip(tooltips[id]); // Закрываем tooltip
            vectorGridLayer.setFeatureStyle(id, {
                fill: true,
                weight: 2,
                color: 'white',
                fillColor: regionStatus[id] ? 'green' : 'red', // Зелёный для правильного, красный для неправильного
                fillOpacity: 0.7,
            });
        });
        tooltips = {}; // Очищаем объект
    });

    // Зумирование на регион по клику
    vectorGridLayer.on('click', (event) => {
        if (!flagend) return;

        const properties = event.layer.properties;
        if (properties && properties.id) {
            // Определяем границы выбранного региона
            const bounds = L.latLngBounds(
                geoJsonData.features[properties.id].geometry.coordinates[0].map(([lng, lat]) => [lat, lng])
            );

            // Плавное зумирование к выбранному региону
            map.flyToBounds(bounds, {
                maxZoom: 6, // Максимальный зум
                duration: 0.5, // Продолжительность анимации
            });
            vectorGridLayer.setFeatureStyle(properties.id, {
                fill: true,
                weight: 4,
                color: 'white',
                fillColor: regionStatus[properties.id] ? 'green' : 'red', // Зелёный для правильного, красный для неправильного
                fillOpacity: 1,
            });
        }
    });

    // Показываем итоговый результат
    const resultContainer = document.createElement('div');
    resultContainer.classList.add('result-overlay');
    resultContainer.innerHTML = `
        <h1>Игра завершена!</h1>
        <p>Правильные ответы: ${score.correct}</p>
        <p>Очки: ${score.time}</p>
        <button id="close-result">Закрыть</button>
    `;
    document.body.appendChild(resultContainer);
    document.getElementById('close-result').addEventListener('click', () => {
        document.querySelector('.result-overlay').remove(); // Убираем результат
    });

    // Скрываем кнопки с вариантами
    toggleAnswerButtons(false);

    // Показываем кнопку "Начать"
    toggleStartButton(true);

    // Обновляем текст кнопки "Начать" для нового раунда
    const startButton = document.getElementById('start-game');
    startButton.innerText = 'Играть заново';

    // Сбрасываем состояние игры
    startButton.addEventListener('click', startGame);
}


function flashBackground(isCorrect) {
    const mapElement = document.getElementById('map');
    const flashContainer = document.createElement('div');
    flashContainer.classList.add('flash-container');

    // Удаляем все предыдущие классы
    mapElement.classList.remove('correct-gradient', 'incorrect-gradient');

    // Добавляем класс в зависимости от результата
    if (isCorrect) {
        flashContainer.classList.add('correct-gradient');
    } else {
        flashContainer.classList.add('incorrect-gradient');
    }

    // Добавляем контейнер с эффектом
    document.getElementById('map-wrapper').appendChild(flashContainer);

    // Удаляем контейнер после завершения анимации (1 секунда)
    setTimeout(() => {
        flashContainer.remove();
    }, 1000);
}

const API_URL = 'http://localhost:4000';


// Получение топ-10 игроков
async function fetchLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const leaderboard = await response.json();
        const scoreBoard = document.getElementById('score-board');
        scoreBoard.innerHTML = '<h3>Топ-10 игроков:</h3>';
        leaderboard.forEach((player, index) => {
            scoreBoard.innerHTML += `<div>${index + 1}. ${player.name}: ${player.score}</div>`;
        });
    } catch (error) {
        console.error('Ошибка при получении рейтинга:', error);
    }
}

// Функция для сохранения результата
async function saveResult() {
    const username = document.getElementById('username').value;
    if (!username) {
        alert('Введите ваше имя перед сохранением результата!');
        return;
    }

    const totalScore = score.correct - score.incorrect; // Пример расчёта общего результата

    try {
        const response = await fetch(API_URL+'/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: username,
                score: totalScore,
            }),
        });

        if (response.ok) {
            alert('Результат успешно сохранён!');
        } else {
            alert('Ошибка при сохранении результата.');
        }
    } catch (error) {
        console.error('Ошибка сохранения результата:', error);
        alert('Не удалось сохранить результат.');
    }
}

// Привязка обработчика к кнопке "Сохранить результат"
//document.getElementById('save-result').addEventListener('click', saveResult);


function toggleStartButton(show) {
    const startButton = document.getElementById('start-game');
    startButton.style.visibility = show ? 'visible ' : 'hidden';
}

function toggleAnswerButtons(show) {
    const answersContainer = document.getElementById('answer-container');
    answersContainer.style.visibility = show ? 'visible' : 'hidden';
}

document.getElementById('start-game').addEventListener('click', () => {
    toggleStartButton(false); // Скрываем кнопку "Начать"
    toggleAnswerButtons(true); // Показываем кнопки с вариантами
    startGame(); // Начинаем игру
});

// Загрузка рейтинга при старте
fetchLeaderboard();
