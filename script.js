const BACKEND_URL = window.API_URL;
const micButton = document.getElementById("mic-button");
const transcriptionDiv = document.getElementById("transcription");

let isRecording = false;
let ws = null;
let mediaRecorder = null;
let audioQueue = []; // ✅ Fila para armazenar áudio enquanto WS conecta

// ✅ Função para iniciar a gravação e a conexão WebSocket
async function startRecording() {
    isRecording = true;
    micButton.style.backgroundColor = "red";
    transcriptionDiv.textContent = "Conectando...";
    
    try {
        // Obter permissão para usar o microfone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // ✅ Limpar fila de áudio
        audioQueue = [];
        
        // Conectar ao WebSocket do seu backend
        ws = new WebSocket(BACKEND_URL);
        
        ws.onopen = () => {
            console.log("✅ Conectado ao servidor WebSocket.");
            transcriptionDiv.textContent = "Gravando...";
            
            // ✅ Enviar áudios que estavam na fila
            while (audioQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
                const audioData = audioQueue.shift();
                ws.send(audioData);
            }
        };
        
        ws.onmessage = async (event) => {
            // Receber a resposta em áudio do backend e reproduzir
            if (event.data instanceof Blob) {
                const audioBlob = event.data;
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
                transcriptionDiv.textContent = "🔊 Ouvindo resposta...";
                
                // ✅ Quando terminar de tocar, voltar ao estado de gravação
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
        
        // Configurar o MediaRecorder para capturar áudio
        mediaRecorder = new MediaRecorder(stream, { 
            mimeType: "audio/webm;codecs=opus" // ✅ Codec mais compatível
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                // ✅ Verificar se WebSocket está aberto antes de enviar
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                } else if (ws && ws.readyState === WebSocket.CONNECTING) {
                    // ✅ Se ainda está conectando, adiciona à fila
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
        
        // ✅ Iniciar a gravação
        mediaRecorder.start(250); // Enviar chunks a cada 250ms
        
    } catch (error) {
        console.error("❌ Erro ao acessar o microfone:", error);
        transcriptionDiv.textContent = "Permissão do microfone negada.";
        isRecording = false;
        micButton.style.backgroundColor = "#007bff";
    }
}

// ✅ Função para parar a gravação
function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    micButton.style.backgroundColor = "#007bff";
    transcriptionDiv.textContent = "Processando...";
    
    // ✅ Parar MediaRecorder
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        
        // ✅ Parar todas as tracks do stream
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    // ✅ Fechar WebSocket após um delay para garantir envio dos últimos dados
    setTimeout(() => {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
        }
        transcriptionDiv.textContent = "Toque no microfone para falar...";
    }, 500);
}

// ✅ Adicionar evento de clique ao botão
micButton.addEventListener("click", () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

// ✅ Limpar recursos ao sair da página
window.addEventListener("beforeunload", () => {
    stopRecording();
});
