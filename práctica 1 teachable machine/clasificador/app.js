// Ruta local relativa al modelo exportado
const URL_MODELO = "./modelo/";

let model, webcam, labelContainer, maxPredictions;
let isWebcamRunning = false;
let minThreshold = 0.75; // Umbral por defecto (75%)
let lastDetectedClass = "";
let lastDetectionTime = 0;

// Inicialización de la aplicación
window.addEventListener("DOMContentLoaded", async () => {
  await loadModel();
});

// Actualiza el umbral en base al slider
function updateThresholdLabel(val) {
  minThreshold = val / 100;
  document.getElementById("threshold-value").innerText = `${val}%`;
}

// Carga del modelo en local desde la carpeta ./modelo/
async function loadModel() {
  const modelURL = URL_MODELO + "model.json";
  const metadataURL = URL_MODELO + "metadata.json";

  updateCustomMessage("Cargando modelo local...", "info");

  try {
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Preparar contenedor de etiquetas
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";

    for (let i = 0; i < maxPredictions; i++) {
      const predDiv = document.createElement("div");
      predDiv.className = "prediction-item";
      predDiv.innerHTML = `
        <div class="prediction-label">
          <span id="class-name-${i}">--</span>
          <span id="class-prob-${i}">0%</span>
        </div>
        <div class="progress-bar-bg">
          <div id="bar-fill-${i}" class="progress-bar-fill"></div>
        </div>
      `;
      labelContainer.appendChild(predDiv);
    }

    updateCustomMessage("Modelo cargado correctamente. Listo para usar.", "success");
  } catch (error) {
    console.error("Error al cargar el modelo:", error);
    updateCustomMessage("Error al cargar el modelo. Verifica la carpeta ./modelo/", "warning");
  }
}

// Iniciar Webcam
async function initWebcam() {
  if (!model) return;

  const flip = true; 
  webcam = new tmImage.Webcam(250, 250, flip);
  
  try {
    await webcam.setup();
    await webcam.play();
    isWebcamRunning = true;

    // Ajustar UI
    document.getElementById("placeholder-text").classList.add("hidden");
    document.getElementById("image-preview").classList.add("hidden");
    const container = document.getElementById("webcam-container");
    
    // Evitar añadir múltiples canvas
    if (!container.querySelector("canvas")) {
      container.appendChild(webcam.canvas);
    } else {
      container.querySelector("canvas").style.display = "block";
    }

    document.getElementById("btn-start").disabled = true;
    document.getElementById("btn-stop").disabled = false;

    updateCustomMessage("Cámara iniciada. Analizando en vivo...", "info");
    window.requestAnimationFrame(loopWebcam);
  } catch (err) {
    updateCustomMessage("No se pudo acceder a la cámara.", "warning");
  }
}

// Bucle de lectura de webcam
async function loopWebcam() {
  if (isWebcamRunning) {
    webcam.update();
    await predict(webcam.canvas);
    window.requestAnimationFrame(loopWebcam);
  }
}

// Detener Webcam
async function stopWebcam() {
  if (webcam && isWebcamRunning) {
    isWebcamRunning = false;
    await webcam.stop();

    if (webcam.canvas) {
      webcam.canvas.style.display = "none";
    }

    document.getElementById("placeholder-text").classList.remove("hidden");
    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-stop").disabled = true;

    updateCustomMessage("Cámara detenida.", "info");
  }
}

// Predicción centralizada
async function predict(imageElement) {
  const prediction = await model.predict(imageElement);
  let highestMatch = { className: "", probability: 0 };

  for (let i = 0; i < maxPredictions; i++) {
    const className = prediction[i].className;
    const probability = prediction[i].probability;
    const percentage = (probability * 100).toFixed(1);

    document.getElementById(`class-name-${i}`).innerText = className;
    document.getElementById(`class-prob-${i}`).innerText = `${percentage}%`;
    document.getElementById(`bar-fill-${i}`).style.width = `${percentage}%`;

    if (probability > highestMatch.probability) {
      highestMatch = { className, probability };
    }
  }

  // Comprobar umbral para mensajes e historial
  if (highestMatch.probability >= minThreshold) {
    updateCustomMessage(
      `Coincidencia detectada: ${highestMatch.className} (${(highestMatch.probability * 100).toFixed(1)}%)`,
      "success"
    );
    
    // Registrar en historial si es una coincidencia estable (evita spam cada frame)
    const now = Date.now();
    if (highestMatch.className !== lastDetectedClass || now - lastDetectionTime > 3000) {
      addToHistory(highestMatch.className, highestMatch.probability);
      lastDetectedClass = highestMatch.className;
      lastDetectionTime = now;
    }
  } else {
    updateCustomMessage("Sin coincidencias con la confianza mínima exigida.", "warning");
  }
}

// Clasificar imagen subida mediante input file
async function classifyUploadedImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Si la cámara está encendida, se detiene primero
  if (isWebcamRunning) {
    await stopWebcam();
  }

  const imgElement = document.getElementById("image-preview");
  const reader = new FileReader();

  reader.onload = function (e) {
    imgElement.src = e.target.result;
    imgElement.classList.remove("hidden");
    document.getElementById("placeholder-text").classList.add("hidden");

    imgElement.onload = async () => {
      await predict(imgElement);
    };
  };

  reader.readAsDataURL(file);
}

// Actualizar mensaje de interfaz
function updateCustomMessage(msg, type) {
  const box = document.getElementById("custom-message");
  box.innerText = msg;
  box.className = `custom-message ${type}`;
}

// Agregar al historial de resultados
function addToHistory(className, probability) {
  const historyList = document.getElementById("history-list");
  const timeString = new Date().toLocaleTimeString();

  const li = document.createElement("li");
  li.className = "history-item";
  li.innerHTML = `
    <span><strong>${className}</strong> (${(probability * 100).toFixed(1)}%)</span>
    <span style="color: #64748b;">${timeString}</span>
  `;

  historyList.prepend(li);
}

// Limpiar historial
function clearHistory() {
  document.getElementById("history-list").innerHTML = "";
}