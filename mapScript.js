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
                sliced: {
                    color: 'white',
                    weight: 1,
                    fill: true,
                    fillColor: 'blue',
                    fillOpacity: 0.5,
                },
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

        chooseRandomFeature();
    });
// Функция выбора случайного элемента
function chooseRandomFeature() {
    if (!vectorGridLayer) return;
    reset();
    // Список всех доступных объектов
    const allFeatures = geoJsonData.features;

    const randomIndex = Math.floor(Math.random() * allFeatures.length);
    randomFeature = allFeatures[randomIndex];

    const allOptions = allFeatures.map(f => f.properties.district);
    const correctDistrict = randomFeature.properties.district;

    highlightFeature();

    // Плавное приближение карты к границам выбранного элемента
    const bounds = L.latLngBounds(randomFeature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]));
    map.flyToBounds(bounds, {
        maxZoom: 6,
        duration: 0.9
    });

    // Генерация кнопок с ответами
    generateAnswers(correctDistrict, allOptions);
}

function highlightFeature() {
    var featureId = randomFeature.properties.id;
    // Применяем стиль и выводим объект на передний план
    vectorGridLayer.setFeatureStyle(featureId, {
        fill: true,
        weight: 2,
        color: 'red',
        fillColor: 'yellow',
        fillOpacity: 0.7
    });

    // После установки стиля, перемещаем объект на передний план
    const tileLayer = vectorGridLayer._vectorTiles || {};
    for (var key in tileLayer) {
        var tile = tileLayer[key];
        var features = tile._features;
        var data = features[featureId];
        if (data) {
            var feature = data.feature;
            if (feature.bringToFront) {
                feature.bringToFront();
            }
        }
    }
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

// Проверка ответа
function checkAnswer(button) {
    stopTimer();
    const isCorrect = button.dataset.correct === 'true';

    if (isCorrect) {
        button.classList.add('correct');
        flashBackground(true);
    } else {
        button.classList.add('incorrect');
        flashBackground(false);
    }

    updateScore(isCorrect);

    setTimeout(() => {
        document.querySelectorAll('.answer-button').forEach(btn => {
            btn.classList.remove('correct', 'incorrect');
        });
        chooseRandomFeature();
    }, 500);
}

// Функция обновления счётчиков
let correctScore = 0;
let incorrectScore = 0;

function updateScore(isCorrect) {
    if (isCorrect) {
        correctScore++;
        document.getElementById('correct-score').innerText = correctScore;
    } else {
        incorrectScore++;
        document.getElementById('incorrect-score').innerText = incorrectScore;
    }
}


let timerDuration = 8; // Время на ответ в секундах
let warningThreshold = 2; // Сколько секунд до конца таймера, чтобы сменить цвет
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
            stopTimer();
            //alert('Время вышло!');
            flashBackground(false)
            updateScore(false);
            //убираем подстветку
            //geoJsonLayer.resetStyle(randomFeature);
            // Очищаем состояние кнопок и выбираем новый вопрос
            document.querySelectorAll('.answer-button').forEach(btn => {
                 btn.classList.remove('correct', 'incorrect');
            });
            chooseRandomFeature();
        }
    }, updateInterval); // Обновление каждые 100 миллисекунд
}

function stopTimer() {
    clearInterval(timerInterval); // Останавливаем таймер
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
    }, 2000);
}