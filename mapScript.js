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
            /*onEachFeature: function(feature, layer) {
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
            }*/
        }).addTo(map);

        // Получаем объединённые границы всех объектов GeoJSON
        const allBounds = geoJsonLayer.getBounds();

        // Увеличиваем границы для добавления отступа
        //const bounds = allBounds.pad(0.7); // Увеличение на 50%

        // Устанавливаем новые границы карты
        const bounds = [
            [40, 70], // Юго-западная точка
            [70, 150] // Северо-восточная точка
        ];

        map.setMaxBounds(bounds);
        //map.fitBounds(bounds);


        map.setMinZoom(5); // Минимальный зум
        map.setMaxZoom(7); // Максимальный зум


        // Запускаем цикл выбора случайного элемента
        chooseRandomFeature();
    });

function reset(){
    if (!randomFeature)
        return;

    stopTimer();
    document.querySelectorAll('.answer-button').forEach(btn => {
        btn.classList.remove('correct', 'incorrect');
    });
    geoJsonLayer.resetStyle(randomFeature);
}

// Функция выбора случайного элемента
function chooseRandomFeature() {
    if (!geoJsonLayer) return;
    reset();
    const features = geoJsonLayer.getLayers();
    randomFeature = features[Math.floor(Math.random() * features.length)];
    const allOptions = features.map(feature => feature.feature.properties.district);
    const correctDistrict = randomFeature.feature.properties.district;



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

    // Генерация кнопок с ответами
    generateAnswers(correctDistrict, allOptions);
}

let correctAnswer = ''; // Хранит правильный ответ

function generateAnswers(correct, allOptions) {
    // Запускаем таймер для нового вопроса
    startTimer();

    // Убираем правильный ответ из общего списка, чтобы не дублировать
    const incorrectOptions = allOptions.filter(option => option !== correct);
    // Перемешиваем неправильные варианты и выбираем три из них
    const shuffledIncorrectOptions = incorrectOptions.sort(() => Math.random() - 0.5).slice(0, 3);
    // Включаем правильный ответ в список вариантов
    const answerOptions = [...shuffledIncorrectOptions, correct].sort(() => Math.random() - 0.5);

    // Обновляем текст кнопок и отмечаем правильный ответ
    const buttons = document.querySelectorAll('.answer-button');

    // Распределяем варианты по кнопкам
    answerOptions.forEach((option, index) => {
        buttons[index].innerText = option;
        if (option === correct) {
            buttons[index].dataset.correct = 'true'; // Помечаем правильный вариант
        } else {
            buttons[index].dataset.correct = 'false'; // Остальные неправильные
        }
    });

    // Устанавливаем правильный ответ
    correctAnswer = correct;
}



// Проверка ответа пользователя
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
    // Обновляем счётчики
    updateScore(isCorrect);
    //убираем подстветку
    geoJsonLayer.resetStyle(randomFeature);

    // Очищаем состояние кнопок и выбираем новый вопрос
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
            geoJsonLayer.resetStyle(randomFeature);
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