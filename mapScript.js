// Инициализация карты
const map = L.map('map', {
    zoomControl: false, // Отключение кнопок управления зумом
    maxZoom: 10,
    attributionControl: false // Отключение ссылки на Leaflet
}).setView([58.2, 107.0], 5);

// Добавление слоя с картой
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let geoJsonLayer, randomFeature;
let correctScore = 0, incorrectScore = 0;

// Загрузка GeoJSON
fetch('irk.geojson') // Укажите путь к вашему GeoJSON-файлу
    .then(response => response.json())
    .then(data => {
        geoJsonLayer = L.geoJSON(data, {
            style: function(feature) {
                return {
                    fillColor: 'blue',
                    weight: 1,
                    color: 'white',
                    fillOpacity: 0.5
                };
            },
            onEachFeature: function(feature, layer) {
                layer.on({
                     mouseover: function (e) {
                         var layer = e.target;
                         // Отображаем название при наведении
                         layer.bindPopup(layer.feature.properties.district).openPopup();
                     },
                     mouseout: function (e) {
                         var layer = e.target;
                         // Закрываем popup при убирании курсора
                         layer.closePopup();
                     }
                });
            }
        }).addTo(map);

        // Получаем объединённые границы всех объектов GeoJSON
        const allBounds = geoJsonLayer.getBounds();

        // Увеличиваем границы для добавления отступа
        const expandedBounds = allBounds.pad(0.45); // Увеличение на 10%

        // Устанавливаем новые границы карты
        map.setMaxBounds(expandedBounds);


        map.setMinZoom(5); // Минимальный зум
        map.setMaxZoom(7); // Максимальный зум


        // Запускаем цикл выбора случайного элемента
        chooseRandomFeature();
    });

// Функция выбора случайного элемента
function chooseRandomFeature() {
    if (!geoJsonLayer) return;

    const features = geoJsonLayer.getLayers();
    const randomIndex = Math.floor(Math.random() * features.length);
    randomFeature = features[randomIndex];

    // Поднимаем индекс региона
    randomFeature.bringToFront();

    // Подсветка выбранного элемента
    randomFeature.setStyle({
        weight: 2,
        color: 'red',
        fillColor: 'yellow',
        dashArray: '',
        fillOpacity: 0.7
    });

    // Получаем границы региона
    let bounds = randomFeature.getBounds();

    // Плавное приближение карты к скорректированным границам региона
    map.flyToBounds(bounds, {
        maxZoom: 6, // Максимальный зум
        duration: 0.9 // Длительность анимации
    });

    // Запускаем таймер для нового вопроса
    startTimer();
}

// Проверка ответа пользователя
function checkAnswer() {
    const userAnswer = document.getElementById('answer').value.trim().toLowerCase();
    const correctAnswer = randomFeature.feature.properties.district;

    const feedback = document.getElementById('feedback');

    if (userAnswer === correctAnswer.toLowerCase()) {
        correctScore++;
        flashBackground(true);
        updateScore();
    } else {
        incorrectScore++;
        flashBackground(false);
        updateScore();
    }
    //убираем подстветку
    geoJsonLayer.resetStyle(randomFeature);

    // Очищаем поле ввода и выбираем новый элемент
    document.getElementById('answer').value = '';
    chooseRandomFeature();
}

// Функция обновления счётчиков
function updateScore() {
    document.getElementById('correct-score').innerHTML = `<span class="score-icon correct-icon"></span> ${correctScore}`;
    document.getElementById('incorrect-score').innerHTML = `<span class="score-icon incorrect-icon"></span> ${incorrectScore}`;
}


let timerDuration = 15; // Время на ответ в секундах
let warningThreshold = 5; // Сколько секунд до конца таймера, чтобы сменить цвет
let timerInterval; // Хранит интервал таймера

function startTimer() {
    // Сбрасываем ширину полоски до 100%
    const timerBar = document.getElementById('timer-bar');
    timerBar.style.backgroundColor = '#4caf50'; // Зелёный цвет
    timerBar.style.width = '100%';

    // Устанавливаем параметры для обновления
    const updateInterval = 5; // Обновление каждые 50 мс (20 раз в секунду)
    const step = 100 / (timerDuration * (1000 / updateInterval)); // Шаг изменения ширины
    let currentWidth = 100; // Начальная ширина в процентах
    let remainingTime = timerDuration; // Оставшееся время в секундах

    timerInterval = setInterval(() => {
        currentWidth -= step;
        remainingTime -= updateInterval / 1000; // Уменьшаем время в секундах
        timerBar.style.width = `${currentWidth}%`;

        if (remainingTime <= warningThreshold) {
            timerBar.style.backgroundColor = '#f44336'; // Красный цвет
        }

        // Если время истекло, сбрасываем таймер
        if (currentWidth <= 0) {
            clearInterval(timerInterval);
            //alert('Время вышло!');
            incorrectScore++;
            flashBackground(false)
            updateScore();
            //убираем подстветку
            geoJsonLayer.resetStyle(randomFeature);

            // Очищаем поле ввода и выбираем новый элемент
            document.getElementById('answer').value = '';
            chooseRandomFeature(); // Переход к следующему вопросу
        }
    }, updateInterval); // Обновление каждые 100 миллисекунд
}

function stopTimer() {
    clearInterval(timerInterval); // Останавливаем таймер
}

document.getElementById('submit').addEventListener('click', () => {
    stopTimer(); // Останавливаем таймер при ответе
    checkAnswer(); // Проверяем ответ
});

// Добавляем проверку ответа по нажатию Enter
document.getElementById('answer').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        stopTimer(); // Останавливаем таймер при нажатии Enter
        checkAnswer(); // Проверяем ответ
    }
});

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
    }, 2000);
}