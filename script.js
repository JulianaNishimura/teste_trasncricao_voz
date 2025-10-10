const BACKEND_URL = window.API_URL;

const micButton = document.getElementById("mic-button");
const transcriptionDiv = document.getElementById("transcription");

let isRecording = false;
let ws;
let mediaRecorder;

// Função para iniciar a gravação e a conexão WebSocket
async function startRecording() {
    isRecording = true;
    micButton.style.backgroundColor = "red";
    transcriptionDiv.textContent = "Gravando...";

    try {
        // Obter permissão para usar o microfone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Conectar ao WebSocket do seu backend
        ws = new WebSocket(BACKEND_URL);
        
        ws.onopen = () => {
            console.log("Conectado ao servidor WebSocket.");
        };

        ws.onmessage = async (event) => {
            // Receber a resposta em áudio do backend e reproduzir
            if (event.data instanceof Blob) {
                const audioBlob = event.data;
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
                transcriptionDiv.textContent = "Ouvindo resposta...";
            }
        };

        ws.onclose = () => {
            console.log("Desconectado do servidor WebSocket.");
            isRecording = false;
            micButton.style.backgroundColor = "#007bff";
            transcriptionDiv.textContent = "Toque no microfone para falar...";
        };

        ws.onerror = (error) => {
            console.error("Erro no WebSocket:", error);
            transcriptionDiv.textContent = "Erro na conexão. Tente novamente.";
            stopRecording();
        };

        // Configurar o MediaRecorder para capturar áudio
        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        
        mediaRecorder.ondataavailable = (event) => {
            // Enviar os dados de áudio para o backend via WebSocket
            if (event.data.size > 0) {
                ws.send(event.data);
            }
        };

        // Iniciar a gravação
        mediaRecorder.start(250); // Enviar chunks a cada 250ms

    } catch (error) {
        console.error("Erro ao acessar o microfone:", error);
        transcriptionDiv.textContent = "Permissão do microfone negada ou erro.";
    }
}

// Função para parar a gravação
function stopRecording() {
    if (isRecording) {
        isRecording = false;
        micButton.style.backgroundColor = "#007bff";
        transcriptionDiv.textContent = "Processando...";
        mediaRecorder.stop();
        ws.close();
    }
}

// Adicionar evento de clique ao botão
micButton.addEventListener("click", () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});