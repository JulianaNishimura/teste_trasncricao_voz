const BACKEND_URL = 'wss://lyria-servicodetranscricao.onrender.com';
const micButton = document.getElementById("mic-button");
const transcriptionDiv = document.getElementById("transcription");

let isRecording = false;
let ws = null;
let mediaRecorder = null;
let audioQueue = []; 

async function startRecording() {
    isRecording = true;
    micButton.style.backgroundColor = "red";
    transcriptionDiv.textContent = "Conectando...";
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioQueue = [];
        
        ws = new WebSocket(BACKEND_URL);
        
        ws.onopen = () => {
            console.log("✅ Conectado ao servidor WebSocket.");
            transcriptionDiv.textContent = "Gravando...";
            
            while (audioQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
                const audioData = audioQueue.shift();
                ws.send(audioData);
            }
        };
        
        ws.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                const audioBlob = event.data;
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
                transcriptionDiv.textContent = "🔊 Ouvindo resposta...";
                
                audio.onended = () => {
                    if (isRecording) {
                        transcriptionDiv.textContent = "Gravando...";
                    }
                };
            }
        };
        
        ws.onclose = () => {
            console.log("🔌 Desconectado do servidor WebSocket.");
            if (isRecording) {
                isRecording = false;
                micButton.style.backgroundColor = "#007bff";
                transcriptionDiv.textContent = "Conexão encerrada. Toque para reconectar.";
            }
        };
        
        ws.onerror = (error) => {
            console.error("❌ Erro no WebSocket:", error);
            transcriptionDiv.textContent = "Erro na conexão. Tente novamente.";
            stopRecording();
        };
        
        mediaRecorder = new MediaRecorder(stream, { 
            mimeType: "audio/webm;codecs=opus" 
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                } else if (ws && ws.readyState === WebSocket.CONNECTING) {
                    console.log("⏳ WebSocket conectando... adicionando áudio à fila");
                    audioQueue.push(event.data);
                } else {
                    console.warn("⚠️ WebSocket não está conectado. Áudio descartado.");
                }
            }
        };
        
        mediaRecorder.onerror = (error) => {
            console.error("❌ Erro no MediaRecorder:", error);
            transcriptionDiv.textContent = "Erro na gravação. Tente novamente.";
            stopRecording();
        };
        
        mediaRecorder.start(250); 
        
    } catch (error) {
        console.error("❌ Erro ao acessar o microfone:", error);
        transcriptionDiv.textContent = "Permissão do microfone negada.";
        isRecording = false;
        micButton.style.backgroundColor = "#007bff";
    }
}

function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    micButton.style.backgroundColor = "#007bff";
    transcriptionDiv.textContent = "Processando...";
    
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    setTimeout(() => {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
        }
        transcriptionDiv.textContent = "Toque no microfone para falar...";
    }, 500);
}

micButton.addEventListener("click", () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

window.addEventListener("beforeunload", () => {
    stopRecording();
});
