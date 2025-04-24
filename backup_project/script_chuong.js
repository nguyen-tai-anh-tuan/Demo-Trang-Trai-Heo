// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyARQQIPQYVNv5vL3bwJIXQKcfNflPw3MsU",
    authDomain: "cage-pigs.firebaseapp.com",
    databaseURL: "https://cage-pigs-default-rtdb.firebaseio.com",
    projectId: "cage-pigs",
    storageBucket: "cage-pigs.firebasestorage.app",
    messagingSenderId: "434331398009",
    appId: "1:434331398009:web:f219e826cdd4c76aa549a8",
    measurementId: "G-052DGDTBXJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Elements
const elements = {
    temp: document.getElementById('temp-value'),
    humi: document.getElementById('humi-value'),
    co2: document.getElementById('co2-value'),
    tempHigh: document.getElementById('temp-high'),
    tempLow: document.getElementById('temp-low'),
    tempHighTime: document.getElementById('temp-high-time'),
    tempLowTime: document.getElementById('temp-low-time'),
    humiHigh: document.getElementById('humi-high'),
    humiLow: document.getElementById('humi-low'),
    humiHighTime: document.getElementById('humi-high-time'),
    humiLowTime: document.getElementById('humi-low-time'),
    co2High: document.getElementById('co2-high'),
    co2Low: document.getElementById('co2-low'),
    co2HighTime: document.getElementById('co2-high-time'),
    co2LowTime: document.getElementById('co2-low-time'),
    pumpImg: document.querySelector('#pump-img'),
    pumpStatus: document.querySelector('#pump-status'),
    pumpTime: document.querySelector('#pump-time'),
    pumpTotal: document.querySelector('#pump-total'),
    fanImg: document.querySelector('#fan-img'),
    fanStatus: document.querySelector('#fan-status'),
    fanTime: document.querySelector('#fan-time'),
    fanTotal: document.querySelector('#fan-total'),
    heaterImg: document.querySelector('#heater-img'),
    heaterStatus: document.querySelector('#heater-status'),
    heaterTime: document.querySelector('#heater-time'),
    heaterTotal: document.querySelector('#heater-total'),
    alertMessage: document.getElementById('alert-message'),
    logList: document.getElementById('log-list')
};

const buttons = {
    pumpOn: document.querySelector('#btn-pump-on'),
    pumpOff: document.querySelector('#btn-pump-off'),
    fanOn: document.querySelector('#btn-fan-on'),
    fanOff: document.querySelector('#btn-fan-off'),
    heaterOn: document.querySelector('#btn-heater-on'),
    heaterOff: document.querySelector('#btn-heater-off')
};

// Variables
let pumpStartTime = null;
let fanStartTime = null;
let heaterStartTime = null;
let pumpTotalTime = 0;
let fanTotalTime = 0;
let heaterTotalTime = 0;
let lastResetDate = new Date().toDateString();

// Check Firebase connection
database.ref('.info/connected').on('value', snap => {
    if (snap.val() === true) {
        console.log('Đã kết nối với Firebase');
        elements.alertMessage.innerText = '';
    } else {
        console.log('Mất kết nối với Firebase');
        elements.alertMessage.innerText = 'Lỗi: Mất kết nối với Firebase!';
    }
});

// Load total time
function loadTotalTime() {
    const today = new Date().toDateString();
    const totalRef = database.ref(chuongName + '/totalTime');

    totalRef.on('value', snap => {
        const data = snap.val() || {};
        if (data.lastResetDate !== today) {
            pumpTotalTime = 0;
            fanTotalTime = 0;
            heaterTotalTime = 0;
            totalRef.set({
                pump: 0,
                fan: 0,
                heater: 0,
                lastResetDate: today
            }).catch(error => console.error('Lỗi lưu tổng thời gian:', error));
        } else {
            pumpTotalTime = data.pump || 0;
            fanTotalTime = data.fan || 0;
            heaterTotalTime = data.heater || 0;
        }
        elements.pumpTotal.innerText = `Tổng thời gian hôm nay: ${pumpTotalTime} phút`;
        elements.fanTotal.innerText = `Tổng thời gian hôm nay: ${fanTotalTime} phút`;
        elements.heaterTotal.innerText = `Tổng thời gian hôm nay: ${heaterTotalTime} phút`;
    }, error => console.error('Lỗi đọc tổng thời gian:', error));
}

// Add log entry
function addLogEntry(message) {
    const timestamp = new Date().toLocaleString();
    const logEntry = `${timestamp}: ${message}`;
    const li = document.createElement('li');
    li.textContent = logEntry;
    elements.logList.prepend(li);

    database.ref(chuongName + '/logs').push({
        timestamp: timestamp,
        message: message
    }).catch(error => console.error('Lỗi lưu nhật ký:', error));

    while (elements.logList.children.length > 50) {
        elements.logList.removeChild(elements.logList.lastChild);
    }
}

// Load logs
function loadLogs() {
    database.ref(chuongName + '/logs').limitToLast(50).on('child_added', snap => {
        const log = snap.val();
        const li = document.createElement('li');
        li.textContent = `${log.timestamp}: ${log.message}`;
        elements.logList.prepend(li);
    }, error => console.error('Lỗi đọc nhật ký:', error));
}

// Update high/low history
function updateHighLow(ref, param, value, elementsHigh, elementsLow, elementsHighTime, elementsLowTime) {
    const today = new Date().toDateString();
    const historyRef = ref.child(`${param}_history/${today}`);

    historyRef.once('value', snap => {
        let history = snap.val() || [];
        const timestamp = new Date();
        history.push({ value, timestamp: timestamp.toISOString() });

        const values = history.map(entry => entry.value).filter(v => v !== null);
        const max = values.length ? Math.max(...values) : 'N/A';
        const min = values.length ? Math.min(...values) : 'N/A';
        const maxEntry = history.find(entry => entry.value === max);
        const minEntry = history.find(entry => entry.value === min);

        elementsHigh.innerText = max !== 'N/A' ? `${max} ${param === 'temp' ? '°C' : param === 'humi' ? '%' : 'ppm'}` : 'N/A';
        elementsLow.innerText = min !== 'N/A' ? `${min} ${param === 'temp' ? '°C' : param === 'humi' ? '%' : 'ppm'}` : 'N/A';
        elementsHighTime.innerText = maxEntry ? `Lúc ${new Date(maxEntry.timestamp).toLocaleTimeString()}` : '';
        elementsLowTime.innerText = minEntry ? `Lúc ${new Date(minEntry.timestamp).toLocaleTimeString()}` : '';

        historyRef.set(history).catch(error => console.error(`Lỗi lưu lịch sử ${param}:`, error));
    });
}

// Display chuong data
function displayChuong() {
    const ref = database.ref(chuongName);
    ref.off();

    ref.child('temp').on('value', snap => {
        const temp = snap.val();
        if (temp !== null && !isNaN(temp)) {
            elements.temp.innerText = `${temp} °C`;
            updateHighLow(ref, 'temp', temp, elements.tempHigh, elements.tempLow, elements.tempHighTime, elements.tempLowTime);
            if (temp > 35) {
                elements.alertMessage.innerText = 'Cảnh báo: Nhiệt độ quá cao!';
                addLogEntry(`Nhiệt độ quá cao: ${temp}°C`);
            } else if (temp < 20) {
                elements.alertMessage.innerText = 'Cảnh báo: Nhiệt độ quá thấp!';
                addLogEntry(`Nhiệt độ quá thấp: ${temp}°C`);
            } else {
                elements.alertMessage.innerText = '';
            }
        } else {
            elements.temp.innerText = 'N/A';
            elements.alertMessage.innerText = 'Lỗi: Dữ liệu nhiệt độ không hợp lệ!';
        }
    }, error => console.error('Lỗi đọc nhiệt độ:', error));

    ref.child('humi').on('value', snap => {
        const humi = snap.val();
        if (humi !== null && !isNaN(humi)) {
            elements.humi.innerText = `${humi} %`;
            updateHighLow(ref, 'humi', humi, elements.humiHigh, elements.humiLow, elements.humiHighTime, elements.humiLowTime);
            if (humi > 80) {
                elements.alertMessage.innerText = 'Cảnh báo: Độ ẩm quá cao!';
                addLogEntry(`Độ ẩm quá cao: ${humi}%`);
            } else if (humi < 40) {
                elements.alertMessage.innerText = 'Cảnh báo: Độ ẩm quá thấp!';
                addLogEntry(`Độ ẩm quá thấp: ${humi}%`);
            }
        } else {
            elements.humi.innerText = 'N/A';
            elements.alertMessage.innerText = 'Lỗi: Dữ liệu độ ẩm không hợp lệ!';
        }
    }, error => console.error('Lỗi đọc độ ẩm:', error));

    ref.child('co2').on('value', snap => {
        const co2 = snap.val();
        if (co2 !== null && !isNaN(co2)) {
            elements.co2.innerText = `${co2} ppm`;
            updateHighLow(ref, 'co2', co2, elements.co2High, elements.co2Low, elements.co2HighTime, elements.co2LowTime);
            if (co2 > 2000) {
                elements.alertMessage.innerText = 'Cảnh báo: Nồng độ CO2 quá cao!';
                addLogEntry(`Nồng độ CO2 quá cao: ${co2} ppm`);
            }
        } else {
            elements.co2.innerText = 'N/A';
            elements.alertMessage.innerText = 'Lỗi: Dữ liệu CO2 không hợp lệ!';
        }
    }, error => console.error('Lỗi đọc CO2:', error));

    ref.child('pump').on('value', snap => {
        const state = snap.val();
        if (state === 1) {
            elements.pumpImg.src = 'img/pump-on.png';
            elements.pumpStatus.innerText = 'Trạng thái: BẬT';
            if (!pumpStartTime) {
                pumpStartTime = new Date().getTime();
                addLogEntry('Bơm nước được bật');
            }
        } else {
            elements.pumpImg.src = 'img/pump-off.png';
            elements.pumpStatus.innerText = 'Trạng thái: TẮT';
            if (pumpStartTime) {
                const elapsed = Math.floor((new Date().getTime() - pumpStartTime) / 1000 / 60);
                pumpTotalTime += elapsed;
                database.ref(chuongName + '/totalTime/pump').set(pumpTotalTime)
                    .catch(error => console.error('Lỗi lưu thời gian bơm:', error));
                pumpStartTime = null;
                addLogEntry('Bơm nước được tắt');
            }
        }
    }, error => console.error('Lỗi đồng bộ bơm:', error));

    ref.child('fan').on('value', snap => {
        const state = snap.val();
        if (state === 1) {
            elements.fanImg.src = 'img/fan-on.gif';
            elements.fanStatus.innerText = 'Trạng thái: BẬT';
            if (!fanStartTime) {
                fanStartTime = new Date().getTime();
                addLogEntry('Quạt thông gió được bật');
            }
        } else {
            elements.fanImg.src = 'img/fan-off1.png';
            elements.fanStatus.innerText = 'Trạng thái: TẮT';
            if (fanStartTime) {
                const elapsed = Math.floor((new Date().getTime() - fanStartTime) / 1000 / 60);
                fanTotalTime += elapsed;
                database.ref(chuongName + '/totalTime/fan').set(fanTotalTime)
                    .catch(error => console.error('Lỗi lưu thời gian quạt:', error));
                fanStartTime = null;
                addLogEntry('Quạt thông gió được tắt');
            }
        }
    }, error => console.error('Lỗi đồng bộ quạt:', error));

    ref.child('heater').on('value', snap => {
        const state = snap.val();
        if (state === 1) {
            elements.heaterImg.src = 'img/heater-on.png';
            elements.heaterStatus.innerText = 'Trạng thái: BẬT';
            if (!heaterStartTime) {
                heaterStartTime = new Date().getTime();
                addLogEntry('Máy sưởi được bật');
            }
        } else {
            elements.heaterImg.src = 'img/heater-off.png';
            elements.heaterStatus.innerText = 'Trạng thái: TẮT';
            if (heaterStartTime) {
                const elapsed = Math.floor((new Date().getTime() - heaterStartTime) / 1000 / 60);
                heaterTotalTime += elapsed;
                database.ref(chuongName + '/totalTime/heater').set(heaterTotalTime)
                    .catch(error => console.error('Lỗi lưu thời gian máy sưởi:', error));
                heaterStartTime = null;
                addLogEntry('Máy sưởi được tắt');
            }
        }
    }, error => console.error('Lỗi đồng bộ máy sưởi:', error));
}

// Toggle device
function toggleDevice(device, state) {
    const ref = database.ref(chuongName).child(device);
    ref.set(state).then(() => {
        if (device === 'pump') {
            elements.pumpImg.src = state ? 'img/pump-on.png' : 'img/pump-off.png';
            elements.pumpStatus.innerText = `Trạng thái: ${state ? 'BẬT' : 'TẮT'}`;
        } else if (device === 'fan') {
            elements.fanImg.src = state ? 'img/fan-on.gif' : 'img/fan-off1.png';
            elements.fanStatus.innerText = `Trạng thái: ${state ? 'BẬT' : 'TẮT'}`;
        } else if (device === 'heater') {
            elements.heaterImg.src = state ? 'img/heater-on.png' : 'img/heater-off.png';
            elements.heaterStatus.innerText = `Trạng thái: ${state ? 'BẬT' : 'TẮT'}`;
        }
    }).catch(error => {
        console.error(`Lỗi điều khiển ${device}:`, error);
        elements.alertMessage.innerText = `Lỗi: Không thể điều khiển ${device}!`;
    });
}

// Event listeners
buttons.pumpOn.addEventListener('click', () => toggleDevice('pump', 1));
buttons.pumpOff.addEventListener('click', () => toggleDevice('pump', 0));
buttons.fanOn.addEventListener('click', () => toggleDevice('fan', 1));
buttons.fanOff.addEventListener('click', () => toggleDevice('fan', 0));
buttons.heaterOn.addEventListener('click', () => toggleDevice('heater', 1));
buttons.heaterOff.addEventListener('click', () => toggleDevice('heater', 0));

// Update device on time
setInterval(() => {
    if (pumpStartTime) {
        const elapsed = Math.floor((new Date().getTime() - pumpStartTime) / 1000 / 60);
        elements.pumpTime.innerText = `Thời gian bật: ${elapsed} phút`;
    } else {
        elements.pumpTime.innerText = `Thời gian bật: 0 phút`;
    }

    if (fanStartTime) {
        const elapsed = Math.floor((new Date().getTime() - fanStartTime) / 1000 / 60);
        elements.fanTime.innerText = `Thời gian bật: ${elapsed} phút`;
    } else {
        elements.fanTime.innerText = `Thời gian bật: 0 phút`;
    }

    if (heaterStartTime) {
        const elapsed = Math.floor((new Date().getTime() - heaterStartTime) / 1000 / 60);
        elements.heaterTime.innerText = `Thời gian bật: ${elapsed} phút`;
    } else {
        elements.heaterTime.innerText = `Thời gian bật: 0 phút`;
    }
}, 1000);

// Charts
const ctxTemp = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(ctxTemp, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{ label: chuongName, data: [], borderColor: 'red' }]
    },
    options: {
        plugins: { title: { display: true, text: 'Temperature' } }
    }
});

const ctxHumi = document.getElementById('humiChart').getContext('2d');
const humiChart = new Chart(ctxHumi, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{ label: chuongName, data: [], borderColor: 'red' }]
    },
    options: {
        plugins: { title: { display: true, text: 'Humidity' } }
    }
});

const ctxCo2 = document.getElementById('co2Chart').getContext('2d');
const co2Chart = new Chart(ctxCo2, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{ label: chuongName, data: [], borderColor: 'red' }]
    },
    options: {
        plugins: { title: { display: true, text: 'CO2' } }
    }
});

function updateChart() {
    const time = new Date().toLocaleTimeString();
    database.ref(chuongName).once('value', snap => {
        const data = snap.val() || {};
        tempChart.data.datasets[0].data.push(data.temp || null);
        humiChart.data.datasets[0].data.push(data.humi || null);
        co2Chart.data.datasets[0].data.push(data.co2 || null);

        tempChart.data.labels.push(time);
        humiChart.data.labels.push(time);
        co2Chart.data.labels.push(time);

        if (tempChart.data.labels.length > 10) {
            tempChart.data.labels.shift();
            humiChart.data.labels.shift();
            co2Chart.data.labels.shift();
            tempChart.data.datasets[0].data.shift();
            humiChart.data.datasets[0].data.shift();
            co2Chart.data.datasets[0].data.shift();
        }

        tempChart.update();
        humiChart.update();
        co2Chart.update();
    }).catch(error => {
        console.error('Lỗi cập nhật biểu đồ:', error);
        elements.alertMessage.innerText = 'Lỗi: Không thể cập nhật biểu đồ!';
    });
}

setInterval(updateChart, 10000);
updateChart();

// Clock
function updateClock() {
    let now = new Date();
    let hours = now.getHours().toString().padStart(2, '0');
    let minutes = now.getMinutes().toString().padStart(2, '0');
    let seconds = now.getSeconds().toString().padStart(2, '0');
    let timeString = `${hours}:${minutes}:${seconds}`;
    document.getElementById('clock').textContent = timeString;
}

setInterval(updateClock, 1000);
updateClock();

// Initialize
window.onload = () => {
    loadTotalTime();
    loadLogs();
    displayChuong();
};