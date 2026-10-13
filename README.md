# Guía Completa: Proyecto Teachable Machine Local en Google Colab

Este documento detalla el procedimiento paso a paso para crear, exportar y desplegar un modelo de clasificación de imágenes entrenado en **Teachable Machine** dentro de un entorno de **Google Colab**, incluyendo la ejecución de una interfaz web responsive local en JavaScript.

---

## Índice
1. [Paso 1: Entrenamiento y Exportación en Teachable Machine](#paso-1-entrenamiento-y-exportación-en-teachable-machine)
2. [Paso 2: Configuración del Entorno en Google Colab](#paso-2-configuración-del-entorno-en-google-colab)
3. [Paso 3: Carga de Archivos del Modelo](#paso-3-carga-de-archivos-del-modelo)
4. [Paso 4: Creación de la Aplicación Web (`index.html`)](#paso-4-creación-de-la-aplicación-web-indexhtml)
5. [Paso 5: Despliegue del Servidor Web Local](#paso-5-despliegue-del-servidor-web-local)
6. [Funcionalidades de la Aplicación](#funcionalidades-de-la-aplicación)

---

## Paso 1: Entrenamiento y Exportación en Teachable Machine

1. Accede a la plataforma web [Teachable Machine](https://teachablemachine.withgoogle.com/).
2. Haz clic en **Get Started** y selecciona **Image Project** -> **Standard image model**.
3. Define las clases para clasificar (por ejemplo: `Clase 1: Mascarilla`, `Clase 2: Sin Mascarilla`).
4. Añade muestras de imagen a cada clase utilizando la webcam o subiendo archivos desde tu equipo.
5. Haz clic en **Train Model** y espera a que el proceso de aprendizaje termine.
6. Haz clic en **Export Model**:
   * Selecciona la pestaña **TensorFlow.js**.
   * Elige la opción **Download** (Descargar modelo).
   * Descargarás un archivo comprimido `.zip` que contiene 3 archivos esenciales:
     * `model.json` (Estructura de la red neuronal).
     * `metadata.json` (Nombres de las clases y parámetros).
     * `weights.bin` (Pesos del modelo entrenado).

---

## Paso 2: Configuración del Entorno en Google Colab

Abre un cuaderno en [Google Colab](https://colab.research.google.com/) y crea la estructura de directorios necesaria para almacenar los archivos del modelo.

Ejecuta la siguiente celda en Colab:

```python
import os

# Crear el directorio donde se alojará el modelo
os.makedirs("my_model", exist_ok=True)
print("✅ Carpeta 'my_model' creada con éxito.")
```

---

## Paso 3: Carga de Archivos del Modelo

1. En el menú lateral izquierdo de Google Colab, haz clic en el icono de la carpeta (**Archivos**).
2. Abre la carpeta llamada `my_model`.
3. Sube los 3 archivos descomprimidos previamente:
   * `model.json`
   * `metadata.json`
   * `weights.bin`

La estructura final en el panel de archivos debe ser la siguiente:

```text
/content/
├── my_model/
│   ├── metadata.json
│   ├── model.json
│   └── weights.bin
└── index.html (se generará en el siguiente paso)
```

---

## Paso 4: Creación de la Aplicación Web (`index.html`)

Para evitar problemas de permisos de archivos cruzados (CORS), integraremos la interfaz del clasificador en un archivo `index.html`. Ejecuta la celda con la instrucción `%%writefile index.html` para generar el documento en el entorno de Colab:

```python
%%writefile index.html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clasificador Teachable Machine</title>
  
  <!-- Librerías requeridas de TensorFlow.js y Teachable Machine -->
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js"></script>

  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --primary: #3b82f6;
      --primary-hover: #1d4ed8;
      --danger: #ef4444;
      --danger-hover: #b91c1c;
      --success: #10b981;
      --text: #0f172a;
      --border: #e2e8f0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 20px; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 900px; display: flex; flex-direction: column; gap: 20px; }
    header { text-align: center; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
    @media(min-width: 768px) { .grid { grid-template-columns: 1fr 1fr; } }
    
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .controls { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
    button { padding: 10px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; color: white; }
    .btn-primary { background: var(--primary); }
    .btn-danger { background: var(--danger); }
    .btn-success { background: var(--success); }
    button:disabled { background: #cbd5e1; cursor: not-allowed; }
    
    #webcam-container, #preview-container { width: 100%; height: 260px; border: 2px dashed var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 15px; }
    #webcam-container canvas, #preview-img { width: 100%; height: 100%; object-fit: cover; }
    
    .output { padding: 12px; background: #eff6ff; border-left: 4px solid var(--primary); border-radius: 4px; text-align: center; font-weight: 600; margin-bottom: 15px; }
    .history-list { list-style: none; max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
    .history-item { padding: 8px 12px; background: var(--bg); border-radius: 6px; font-size: 0.875rem; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Clasificador de Imágenes Local</h1>
      <p>Entorno Teachable Machine + TensorFlow.js</p>
    </header>

    <div class="grid">
      <!-- Panel Cámara en Tiempo Real -->
      <section class="card">
        <h2>Transmisión en Vivo</h2>
        <div style="margin: 10px 0;">
          <label>Umbral Mínimo: <span id="thresh-val">75</span>%</label>
          <input type="range" id="threshold" min="50" max="100" value="75" style="width: 100%;">
        </div>
        <div class="controls">
          <button id="btn-start" class="btn-primary" onclick="init()">Iniciar Cámara</button>
          <button id="btn-stop" class="btn-danger" onclick="stop()" disabled>Detener</button>
        </div>
        <div id="webcam-container"><span>Cámara inactiva</span></div>
        <div id="output" class="output">Estado: Esperando acción...</div>
        <div id="labels"></div>
      </section>

      <!-- Panel Carga Manual y Registro -->
      <section class="card">
        <h2>Clasificar Imagen Externa</h2>
        <div class="controls">
          <input type="file" id="file-input" accept="image/*" onchange="handleUpload(event)">
        </div>
        <div id="preview-container">
          <img id="preview-img" style="display:none;" alt="Vista previa">
          <span id="preview-placeholder">Ninguna imagen seleccionada</span>
        </div>
        <h3>Histórico de Clasificaciones</h3>
        <ul id="history" class="history-list">
          <li class="history-item">Sin registros recientes.</li>
        </ul>
        <button class="btn-success" style="width:100%" onclick="exportCSV()">Descargar Historial (CSV)</button>
      </section>
    </div>
  </div>

  <script>
    const MODEL_PATH = "./my_model/";
    let model, webcam, maxPredictions, isRunning = false, animId = null;
    let historyData = [];

    async function loadModel() {
      try {
        model = await tmImage.load(MODEL_PATH + "model.json", MODEL_PATH + "metadata.json");
        maxPredictions = model.getTotalClasses();
      } catch(e) {
        document.getElementById("output").innerText = "Error cargando modelo desde ./my_model/";
      }
    }

    async function init() {
      if(!model) await loadModel();
      webcam = new tmImage.Webcam(200, 200, true);
      await webcam.setup();
      await webcam.play();
      isRunning = true;
      document.getElementById("btn-start").disabled = true;
      document.getElementById("btn-stop").disabled = false;
      const container = document.getElementById("webcam-container");
      container.innerHTML = "";
      container.appendChild(webcam.canvas);
      animId = window.requestAnimationFrame(loop);
    }

    async function loop() {
      if(isRunning) {
        webcam.update();
        await predict(webcam.canvas);
        animId = window.requestAnimationFrame(loop);
      }
    }

    function stop() {
      if(webcam) webcam.stop();
      isRunning = false;
      if(animId) window.cancelAnimationFrame(animId);
      document.getElementById("btn-start").disabled = false;
      document.getElementById("btn-stop").disabled = true;
      document.getElementById("webcam-container").innerHTML = "<span>Cámara inactiva</span>";
      document.getElementById("output").innerText = "Cámara detenida.";
    }

    async function predict(element) {
      const predictions = await model.predict(element);
      const threshold = parseFloat(document.getElementById("threshold").value) / 100;
      let topClass = null, topProb = 0;

      for(let i = 0; i < maxPredictions; i++) {
        if(predictions[i].probability > topProb) {
          topProb = predictions[i].probability;
          topClass = predictions[i].className;
        }
      }

      const out = document.getElementById("output");
      if(topProb >= threshold && topClass) {
        out.innerText = `Resultado: ${topClass} (${(topProb*100).toFixed(1)}%)`;
        addHistory(topClass, topProb);
      } else {
        out.innerText = `Baja coincidencia (< ${(threshold*100).toFixed(0)}%)`;
      }
    }

    async function handleUpload(e) {
      const file = e.target.files[0];
      if(!file) return;
      if(isRunning) stop();
      if(!model) await loadModel();

      const img = document.getElementById("preview-img");
      const reader = new FileReader();
      reader.onload = (evt) => {
        img.src = evt.target.result;
        img.style.display = "block";
        document.getElementById("preview-placeholder").style.display = "none";
        img.onload = () => predict(img);
      };
      reader.readAsDataURL(file);
    }

    let lastClass = "", lastTime = 0;
    function addHistory(cls, prob) {
      const now = Date.now();
      if(cls === lastClass && (now - lastTime) < 3000) return;
      lastClass = cls; lastTime = now;

      const time = new Date().toLocaleTimeString();
      historyData.push({ clase: cls, prob: (prob*100).toFixed(1) + "%", hora: time });

      const list = document.getElementById("history");
      if(list.children[0]?.innerText.includes("Sin registros")) list.innerHTML = "";
      
      const li = document.createElement("li");
      li.className = "history-item";
      li.innerHTML = `<span><strong>${cls}</strong> (${(prob*100).toFixed(1)}%)</span><span style="color:#64748b">${time}</span>`;
      list.insertBefore(li, list.firstChild);
    }

    function exportCSV() {
      if(!historyData.length) return alert("No hay datos en el historial.");
      let csv = "data:text/csv;charset=utf-8,Clase,Probabilidad,Hora\n";
      historyData.forEach(r => csv += `${r.clase},${r.prob},${r.hora}\n`);
      const a = document.createElement("a");
      a.href = encodeURI(csv);
      a.download = "historico_clasificacion.csv";
      a.click();
    }

    document.getElementById("threshold").addEventListener("input", (e) => {
      document.getElementById("thresh-val").innerText = e.target.value;
    });

    window.onload = loadModel;
  </script>
</body>
</html>
```

---

## Paso 5: Despliegue del Servidor Web Local

Para visualizar e interactuar con la aplicación directamente en la interfaz de Google Colab sin bloquear la ejecución, creamos un servidor HTTP local en Python corriendo en un hilo secundario (`thread`) y mapeamos el puerto mediante `google.colab.output`.

Ejecuta la siguiente celda:

```python
import http.server
import socketserver
import threading
from google.colab import output

PORT = 8000

# Función para iniciar el servidor HTTP en segundo plano
def run_server():
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        httpd.serve_forever()

# Iniciar el hilo del servidor
thread = threading.Thread(target=run_server, daemon=True)
thread.start()

print(f"🚀 Servidor ejecutándose en el puerto {PORT}")

# Exponer el puerto para previsualizar en Colab
output.serve_kernel_port(PORT)
```

---

## Funcionalidades de la Aplicación

1. **Diseño Responsive y CSS Grid**: Se adapta automáticamente a pantallas móviles y de escritorio.
2. **Control de Cámara**: Botones dedicados para iniciar y detener el flujo de vídeo de la webcam.
3. **Umbral Mínimo Ajustable**: Barra deslizable (*slider*) que establece el porcentaje mínimo de certeza para confirmar una coincidencia.
4. **Mensajes Dinámicos**: Muestra advertencias o nombres de clase detectados de manera personalizada.
5. **Calificación por Archivo**: Permite seleccionar una imagen del almacenamiento local y pasarla por el modelo sin usar la cámara.
6. **Historial Exportable**: Registra las clasificaciones válidas con hora y porcentaje, e incluye un botón para exportar todo el histórico a un archivo `.CSV`.