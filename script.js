const BACKEND_URL = 'wss://lyria-servicodetranscricao.onrender.com/ws';
const micButton = document.getElementById("mic-button");
const transcriptionDiv = document.getElementById("transcription");

let isRecording = false;
let ws = null;
let mediaRecorder = null;
let audioChunks = [];

micButton.addEventListener("click", () => {
    isRecording ? stopRecording() : startRecording();
});

async function startRecording() {
    try {
        isRecording = true;
        micButton.style.backgroundColor = "red";
        transcriptionDiv.textContent = "🎤 Gravando...";
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        ws = new WebSocket(BACKEND_URL);
        
        ws.onopen = () => console.log("✅ Conectado");
        
        ws.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                transcriptionDiv.textContent = "🔊 Reproduzindo resposta...";
                const audio = new Audio(URL.createObjectURL(event.data));
                await audio.play();
                audio.onended = () => {
                    if (isRecording) transcriptionDiv.textContent = "🎤 Gravando...";
                };
            }
        };
        
        ws.onerror = () => {
            transcriptionDiv.textContent = "❌ Erro de conexão";
            stopRecording();
        };
        
        ws.onclose = () => {
            if (isRecording) {
                transcriptionDiv.textContent = "🔌 Desconectado";
                stopRecording();
            }
        };
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.start();
        
    } catch (error) {
        console.error(error);
        transcriptionDiv.textContent = "❌ Erro ao acessar microfone";
        isRecording = false;
        micButton.style.backgroundColor = "#007bff";
    }
}

function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    micButton.style.backgroundColor = "#007bff";
    transcriptionDiv.textContent = "⏳ Processando...";
    
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        mediaRecorder.onstop = () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                ws.send(audioBlob);
            }
        };
    }
}

window.addEventListener("beforeunload", stopRecording);