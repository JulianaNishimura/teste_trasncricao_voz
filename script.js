const mic = document.getElementById("mic");
const status = document.getElementById("status");
let ws, mediaRecorder, stream;

mic.onclick = async () => {
  if (ws?.readyState === WebSocket.OPEN) {
    stop();
    return;
  }

  try {
    status.textContent = "Gravando...";
    mic.style.backgroundColor = "red";

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ws = new WebSocket("wss://lyria-servicodetranscricao.onrender.com/ws");

    ws.onmessage = (e) => {
      if (e.data instanceof Blob) {
        const audio = new Audio(URL.createObjectURL(e.data));
        audio.play();
      }
    };

    ws.onclose = () => {
      mic.style.backgroundColor = "";
      status.textContent = "Conexão encerrada";
    };

    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data);
      }
    };
    mediaRecorder.start(1000); // envia a cada 1 segundo

  } catch (err) {
    status.textContent = "Erro ao acessar microfone";
    console.error(err);
  }
};

function stop() {
  mediaRecorder?.stop();
  stream?.getTracks().forEach(t => t.stop());
  ws?.close();
  mic.style.backgroundColor = "";
  status.textContent = "Processando...";
}

window.addEventListener("beforeunload", () => ws?.close());