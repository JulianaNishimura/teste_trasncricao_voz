const mic = document.getElementById("mic");
const status = document.getElementById("status");
let ws, mediaRecorder, stream, recordedChunks = [];

mic.onclick = async () => {
  // Se já estiver gravando, pare e envie o áudio
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stop();
    return;
  }

  try {
    status.textContent = "Gravando...";
    mic.style.backgroundColor = "red";
    recordedChunks = [];

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

    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (recordedChunks.length > 0 && ws.readyState === WebSocket.OPEN) {
        const blob = new Blob(recordedChunks, { type: "audio/webm" });
        blob.arrayBuffer().then(buffer => {
          ws.send(buffer);
          ws.close();
        });
      }
    };

    mediaRecorder.start();

  } catch (err) {
    status.textContent = "Erro ao acessar microfone";
    console.error(err);
    mic.style.backgroundColor = "";
  }
};

function stop() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  stream?.getTracks().forEach(t => t.stop());
  status.textContent = "Processando...";
}

window.addEventListener("beforeunload", () => {
  mediaRecorder?.stop();
  ws?.close();
});