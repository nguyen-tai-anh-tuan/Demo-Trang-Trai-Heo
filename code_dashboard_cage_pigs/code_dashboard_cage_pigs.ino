// WiFi
#include <WiFi.h>
// WiFi Credentials
#define WIFI_SSID "IoT Lab"
#define WIFI_PASSWORD "IoT@123456"

// Firebase
#include <FirebaseESP32.h>
#define FIREBASE_HOST "https://cage-pigs-default-rtdb.firebaseio.com/"
#define FIREBASE_AUTH "NeadCLhxOiYMqMoT2aE0hNrgRPpY3huf5Vwuw307" // Lấy từ Firebase Console > Project Settings > Service Accounts > Database Secrets

// DHT11
#include <DHT.h>
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Cảm biến khí (MQ-2) mô phỏng CO2
#define GAS_SENSOR_PIN 36
#define CO2_THRESHOLD 2000 // Ngưỡng CO2 (ppm)

// LED mô phỏng thiết bị
#define LED_PUMP_1 26   // Chuồng 1: LED cho máy bơm
#define LED_FAN_1 25    // Chuồng 1: LED cho quạt
#define LED_HEATER_1 15 // Chuồng 1: LED cho máy sưởi
#define LED_PUMP_2 14   // Chuồng 2: LED cho máy bơm
#define LED_FAN_2 27    // Chuồng 2: LED cho quạt
#define LED_HEATER_2 33 // Chuồng 2: LED cho máy sưởi
#define LED_PUMP_3 32   // Chuồng 3: LED cho máy bơm
#define LED_FAN_3 23    // Chuồng 3: LED cho quạt
#define LED_HEATER_3 22 // Chuồng 3: LED cho máy sưởi
#define LED_PUMP_4 21   // Chuồng 4: LED cho máy bơm
#define LED_FAN_4 19    // Chuồng 4: LED cho quạt
#define LED_HEATER_4 5  // Chuồng 4: LED cho máy sưởi

// Firebase Objects
FirebaseData fbdo;
FirebaseConfig firebaseConfig;
FirebaseAuth firebaseAuth;
FirebaseJson json; // Thêm FirebaseJson để xử lý dữ liệu JSON

// Thời gian xử lý không chặn
unsigned long previousMillis = 0;
const long interval = 2000; // Gửi dữ liệu mỗi 2 giây

// Danh sách chuồng
const char* chuongs[] = {"chuong1", "chuong2", "chuong3", "chuong4"};
const int numChuongs = 4;

void setup() {
    Serial.begin(9600);
    Serial.println(F("Khởi động DHT11, MQ-2 và Firebase cho 4 chuồng (1 bộ cảm biến, LED mô phỏng thiết bị)!"));

    // Thiết lập chân LED
    int ledPins[] = {LED_PUMP_1, LED_FAN_1, LED_HEATER_1, LED_PUMP_2, LED_FAN_2, LED_HEATER_2,
                     LED_PUMP_3, LED_FAN_3, LED_HEATER_3, LED_PUMP_4, LED_FAN_4, LED_HEATER_4};
    for (int i = 0; i < 12; i++) {
        pinMode(ledPins[i], OUTPUT);
        digitalWrite(ledPins[i], LOW);
    }

    // Kết nối WiFi
    connectWiFi();

    // Khởi động DHT11
    dht.begin();

    // Khởi tạo MQ-2
    pinMode(GAS_SENSOR_PIN, INPUT);

    // Cấu hình Firebase
    firebaseConfig.host = FIREBASE_HOST;
    firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
    Firebase.begin(&firebaseConfig, &firebaseAuth);
    Firebase.reconnectWiFi(true);

    if (Firebase.ready()) {
        Serial.println("Đã kết nối Firebase!");
        for (int i = 0; i < numChuongs; i++) {
            Firebase.setInt(fbdo, String("/") + chuongs[i] + "/status/connection", 1);
        }
    } else {
        Serial.println("Không thể kết nối Firebase!");
    }

    // Khởi tạo trạng thái
    initializeFirebaseStates();
}

void loop() {
    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;

        // Kiểm tra WiFi
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("WiFi ngắt kết nối, thử lại...");
            connectWiFi();
            for (int i = 0; i < numChuongs; i++) {
                Firebase.setInt(fbdo, String("/") + chuongs[i] + "/status/connection", WiFi.status() == WL_CONNECTED ? 1 : 0);
            }
        }

        if (Firebase.ready()) {
            for (int i = 0; i < numChuongs; i++) {
                Firebase.setInt(fbdo, String("/") + chuongs[i] + "/status/connection", 1);
            }

            // Gửi dữ liệu cảm biến
            sendSensorData();

            // Điều khiển LED
            controlLEDs();
        } else {
            for (int i = 0; i < numChuongs; i++) {
                Firebase.setInt(fbdo, String("/") + chuongs[i] + "/status/connection", 0);
            }
        }
    }
}

void connectWiFi() {
    Serial.print("Đang kết nối WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int retryCount = 0, maxRetries = 20;
    while (WiFi.status() != WL_CONNECTED && retryCount < maxRetries) {
        Serial.print(".");
        delay(500);
        retryCount++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nĐã kết nối WiFi! IP: " + WiFi.localIP().toString());
    } else {
        Serial.println("\nKhông thể kết nối WiFi!");
    }
}

void initializeFirebaseStates() {
    for (int i = 0; i < numChuongs; i++) {
        String basePath = "/" + String(chuongs[i]);
        Firebase.setFloat(fbdo, basePath + "/temp", 0.0);
        Firebase.setFloat(fbdo, basePath + "/humi", 0.0);
        Firebase.setFloat(fbdo, basePath + "/co2", 0.0);
        Firebase.setInt(fbdo, basePath + "/pump", 0);
        Firebase.setInt(fbdo, basePath + "/fan", 0);
        Firebase.setInt(fbdo, basePath + "/heater", 0);
        Firebase.setInt(fbdo, basePath + "/status/connection", 0);

        // Sử dụng FirebaseJson để gửi totalTime (bỏ lastResetTimestamp)
        json.clear();
        json.set("pump", 0);
        json.set("fan", 0);
        json.set("heater", 0);
        Firebase.setJSON(fbdo, basePath + "/totalTime", json);

        Serial.println("Khởi tạo trạng thái Firebase cho " + String(chuongs[i]) + " hoàn tất!");
    }
}

void sendSensorData() {
    // Đọc cảm biến DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    // Đọc cảm biến MQ-2
    int mq2Value = analogRead(GAS_SENSOR_PIN);
    float co2PPM = map(mq2Value, 0, 4095, 0, 3000); // Mô phỏng CO2

    // Gửi dữ liệu chung cho tất cả chuồng
    for (int i = 0; i < numChuongs; i++) {
        String basePath = "/" + String(chuongs[i]);
        if (!isnan(humidity) && !isnan(temperature)) {
            Firebase.setFloat(fbdo, basePath + "/temp", temperature);
            Firebase.setFloat(fbdo, basePath + "/humi", humidity);
            Serial.println(String(chuongs[i]) + " - Nhiệt độ: " + String(temperature) + "°C, Độ ẩm: " + String(humidity) + "%");
        } else {
            Firebase.setString(fbdo, basePath + "/sensor_status", "DHT11 Error");
            Serial.println(String(chuongs[i]) + " - Lỗi đọc DHT11!");
        }
        Firebase.setFloat(fbdo, basePath + "/co2", co2PPM);
        if (co2PPM > CO2_THRESHOLD) {
            // Sử dụng FirebaseJson để gửi log (bỏ timestamp)
            json.clear();
            json.set("message", "Nồng độ CO2 quá cao: " + String(co2PPM) + " ppm");
            Firebase.setJSON(fbdo, basePath + "/logs/" + String(millis()), json);
        }
        Serial.println(String(chuongs[i]) + " - CO2: " + String(co2PPM) + " ppm");
    }
}

void controlLEDs() {
    // Chuồng 1
    String basePath = "/" + String(chuongs[0]);
    if (Firebase.getInt(fbdo, basePath + "/pump")) {
        int state = fbdo.intData();
        digitalWrite(LED_PUMP_1, state ? HIGH : LOW);
        Serial.println(String(chuongs[0]) + " - LED máy bơm: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[0]) + " - Lỗi đọc trạng thái LED máy bơm!");
    }
    if (Firebase.getInt(fbdo, basePath + "/fan")) {
        int state = fbdo.intData();
        digitalWrite(LED_FAN_1, state ? HIGH : LOW);
        Serial.println(String(chuongs[0]) + " - LED quạt: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[0]) + " - Lỗi đọc trạng thái LED quạt!");
    }
    if (Firebase.getInt(fbdo, basePath + "/heater")) {
        int state = fbdo.intData();
        digitalWrite(LED_HEATER_1, state ? HIGH : LOW);
        Serial.println(String(chuongs[0]) + " - LED máy sưởi: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[0]) + " - Lỗi đọc trạng thái LED máy sưởi!");
    }

    // Chuồng 2
    basePath = "/" + String(chuongs[1]);
    if (Firebase.getInt(fbdo, basePath + "/pump")) {
        int state = fbdo.intData();
        digitalWrite(LED_PUMP_2, state ? HIGH : LOW);
        Serial.println(String(chuongs[1]) + " - LED máy bơm: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[1]) + " - Lỗi đọc trạng thái LED máy bơm!");
    }
    if (Firebase.getInt(fbdo, basePath + "/fan")) {
        int state = fbdo.intData();
        digitalWrite(LED_FAN_2, state ? HIGH : LOW);
        Serial.println(String(chuongs[1]) + " - LED quạt: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[1]) + " - Lỗi đọc trạng thái LED quạt!");
    }
    if (Firebase.getInt(fbdo, basePath + "/heater")) {
        int state = fbdo.intData();
        digitalWrite(LED_HEATER_2, state ? HIGH : LOW);
        Serial.println(String(chuongs[1]) + " - LED máy sưởi: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[1]) + " - Lỗi đọc trạng thái LED máy sưởi!");
    }

    // Chuồng 3
    basePath = "/" + String(chuongs[2]);
    if (Firebase.getInt(fbdo, basePath + "/pump")) {
        int state = fbdo.intData();
        digitalWrite(LED_PUMP_3, state ? HIGH : LOW);
        Serial.println(String(chuongs[2]) + " - LED máy bơm: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[2]) + " - Lỗi đọc trạng thái LED máy bơm!");
    }
    if (Firebase.getInt(fbdo, basePath + "/fan")) {
        int state = fbdo.intData();
        digitalWrite(LED_FAN_3, state ? HIGH : LOW);
        Serial.println(String(chuongs[2]) + " - LED quạt: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[2]) + " - Lỗi đọc trạng thái LED quạt!");
    }
    if (Firebase.getInt(fbdo, basePath + "/heater")) {
        int state = fbdo.intData();
        digitalWrite(LED_HEATER_3, state ? HIGH : LOW);
        Serial.println(String(chuongs[2]) + " - LED máy sưởi: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[2]) + " - Lỗi đọc trạng thái LED máy sưởi!");
    }

    // Chuồng 4
    basePath = "/" + String(chuongs[3]);
    if (Firebase.getInt(fbdo, basePath + "/pump")) {
        int state = fbdo.intData();
        digitalWrite(LED_PUMP_4, state ? HIGH : LOW);
        Serial.println(String(chuongs[3]) + " - LED máy bơm: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[3]) + " - Lỗi đọc trạng thái LED máy bơm!");
    }
    if (Firebase.getInt(fbdo, basePath + "/fan")) {
        int state = fbdo.intData();
        digitalWrite(LED_FAN_4, state ? HIGH : LOW);
        Serial.println(String(chuongs[3]) + " - LED quạt: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[3]) + " - Lỗi đọc trạng thái LED quạt!");
    }
    if (Firebase.getInt(fbdo, basePath + "/heater")) {
        int state = fbdo.intData();
        digitalWrite(LED_HEATER_4, state ? HIGH : LOW);
        Serial.println(String(chuongs[3]) + " - LED máy sưởi: " + String(state ? "Bật" : "Tắt"));
    } else {
        Serial.println(String(chuongs[3]) + " - Lỗi đọc trạng thái LED máy sưởi!");
    }
}