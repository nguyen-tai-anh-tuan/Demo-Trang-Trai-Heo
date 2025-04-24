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
    pumpImg: document.querySelector('#pump-img'),
    heaterImg: document.querySelector('#heater-img'),
    fanImg: document.querySelector('#fan-img'),
    alertMessage: document.getElementById('alert-message') // Thêm để hiển thị lỗi
};

const buttons = {
    pumpOn: document.querySelector('#btn-pump-on'),
    pumpOff: document.querySelector('#btn-pump-off'),
    heaterOn: document.querySelector('#btn-heater-on'),
    heaterOff: document.querySelector('#btn-heater-off'),
    fanOn: document.querySelector('#btn-fan-on'),
    fanOff: document.querySelector('#btn-fan-off')
};

let selectedChuong = 'chuong1';
const chuongButtons = document.querySelectorAll('.nav-item button');

// Check Firebase connection
database.ref('.info/connected').on('value', snap => {
    if (snap.val() === true) {
        console.log('Đã kết nối với Firebase');
        elements.alertMessage && (elements.alertMessage.innerText = '');
    } else {
        console.log('Mất kết nối với Firebase');
        elements.alertMessage && (elements.alertMessage.innerText = 'Lỗi: Mất kết nối với Firebase!');
    }
});

// Display data for a chuong
function displayChuong(chuongName) {
    selectedChuong = chuongName;
    const ref = database.ref(chuongName);
    ref.off(); // Remove previous listeners

    ref.child('temp').on('value', snap => {
        const temp = snap.val();
        elements.temp.innerText = temp !== null ? `${temp} °C` : 'N/A';
    }, error => {
        console.error('Lỗi đọc nhiệt độ:', error);
        elements.alertMessage.innerText = 'Lỗi: Không thể đọc nhiệt độ!';
    });

    ref.child('humi').on('value', snap => {
        const humi = snap.val();
        elements.humi.innerText = humi !== null ? `${humi} %` : 'N/A';
    }, error => {
        console.error('Lỗi đọc độ ẩm:', error);
        elements.alertMessage.innerText = 'Lỗi: Không thể đọc độ ẩm!';
    });

    ref.child('co2').on('value', snap => {
        const co2 = snap.val();
        elements.co2.innerText = co2 !== null ? `${co2} ppm` : 'N/A';
    }, error => {
        console.error('Lỗi đọc CO2:', error);
        elements.alertMessage.innerText = 'Lỗi: Không thể đọc CO2!';
    });

    syncDeviceState(chuongName);

    chuongButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.chuong === chuongName) {
            btn.classList.add('active');
        }
    });
}

// Sync device state
function syncDeviceState(chuongName) {
    const ref = database.ref(chuongName);
    ref.off(); // Remove previous listeners

    ref.child('pump').on('value', snap => {
        const state = snap.val();
        elements.pumpImg.src = state ? 'img/pump-on.png' : 'img/pump-off.png';
    }, error => console.error('Lỗi đồng bộ bơm:', error));

    ref.child('heater').on('value', snap => {
        const state = snap.val();
        elements.heaterImg.src = state ? 'img/heater-on.png' : 'img/heater-off.png';
    }, error => console.error('Lỗi đồng bộ máy sưởi:', error));

    ref.child('fan').on('value', snap => {
        const state = snap.val();
        elements.fanImg.src = state ? 'img/fan-on.gif' : 'img/fan-off1.png';
    }, error => console.error('Lỗi đồng bộ quạt:', error));
}

// Toggle device
function toggleDevice(device, state) {
    const ref = database.ref(selectedChuong).child(device);
    ref.set(state).then(() => {
        if (device === 'pump') {
            elements.pumpImg.src = state ? 'img/pump-on.png' : 'img/pump-off.png';
        } else if (device === 'heater') {
            elements.heaterImg.src = state ? 'img/heater-on.png' : 'img/heater-off.png';
        } else if (device === 'fan') {
            elements.fanImg.src = state ? 'img/fan-on.gif' : 'img/fan-off1.png';
        }
    }).catch(error => {
        console.error(`Lỗi điều khiển ${device}:`, error);
        elements.alertMessage.innerText = `Lỗi: Không thể điều khiển ${device}!`;
    });
}

// Event listeners for buttons
buttons.pumpOn.addEventListener('click', () => toggleDevice('pump', 1));
buttons.pumpOff.addEventListener('click', () => toggleDevice('pump', 0));
buttons.heaterOn.addEventListener('click', () => toggleDevice('heater', 1));
buttons.heaterOff.addEventListener('click', () => toggleDevice('heater', 0));
buttons.fanOn.addEventListener('click', () => toggleDevice('fan', 1));
buttons.fanOff.addEventListener('click', () => toggleDevice('fan', 0));

// Chuong selection
const func_c1 = () => displayChuong('chuong1');
const func_c2 = () => displayChuong('chuong2');
const func_c3 = () => displayChuong('chuong3');
const func_c4 = () => displayChuong('chuong4');

// Charts
const ctxTemp = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(ctxTemp, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'C1', data: [], borderColor: 'red' },
            { label: 'C2', data: [], borderColor: 'blue' },
            { label: 'C3', data: [], borderColor: 'green' },
            { label: 'C4', data: [], borderColor: 'orange' }
        ]
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
        datasets: [
            { label: 'C1', data: [], borderColor: 'red' },
            { label: 'C2', data: [], borderColor: 'blue' },
            { label: 'C3', data: [], borderColor: 'green' },
            { label: 'C4', data: [], borderColor: 'orange' }
        ]
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
        datasets: [
            { label: 'C1', data: [], borderColor: 'red' },
            { label: 'C2', data: [], borderColor: 'blue' },
            { label: 'C3', data: [], borderColor: 'green' },
            { label: 'C4', data: [], borderColor: 'orange' }
        ]
    },
    options: {
        plugins: { title: { display: true, text: 'CO2' } }
    }
});

// Update charts
function updateChart() {
    const time = new Date().toLocaleTimeString();
    const chuongs = ['chuong1', 'chuong2', 'chuong3', 'chuong4'];

    chuongs.forEach((chuong, index) => {
        database.ref(chuong).once('value', snap => {
            const data = snap.val() || {};
            tempChart.data.datasets[index].data.push(data.temp || null);
            humiChart.data.datasets[index].data.push(data.humi || null);
            co2Chart.data.datasets[index].data.push(data.co2 || null);

            if (index === 3) {
                tempChart.data.labels.push(time);
                humiChart.data.labels.push(time);
                co2Chart.data.labels.push(time);

                if (tempChart.data.labels.length > 10) {
                    tempChart.data.labels.shift();
                    humiChart.data.labels.shift();
                    co2Chart.data.labels.shift();
                    tempChart.data.datasets.forEach(ds => ds.data.shift());
                    humiChart.data.datasets.forEach(ds => ds.data.shift());
                    co2Chart.data.datasets.forEach(ds => ds.data.shift());
                }

                tempChart.update();
                humiChart.update();
                co2Chart.update();
            }
        }).catch(error => {
            console.error(`Lỗi cập nhật biểu đồ cho ${chuong}:`, error);
            elements.alertMessage.innerText = 'Lỗi: Không thể cập nhật biểu đồ!';
        });
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
    document.getElementById("clock").textContent = timeString;
}

setInterval(updateClock, 1000);
updateClock();

// Initialize
window.onload = () => func_c1();