let recordedChunks = [];
let mediaRecorder;
let stream;
let ws;

document.getElementById("mic").onclick = async () => {
  const mic = document.getElementById("mic");
  const status = document.getElementById("status");

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    mic.textContent = "🎤";
    status.textContent = "Processando...";
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];

    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      const buffer = await blob.arrayBuffer();

      ws = new WebSocket("wss://lyria-servicodetranscricao.onrender.com/ws");
      ws.onopen = () => ws.send(buffer);

      ws.onmessage = (e) => {
        if (e.data instanceof Blob) {
          const audio = new Audio(URL.createObjectURL(e.data));
          audio.play().finally(() => {
            mic.textContent = "🎤";
            status.textContent = "Toque para falar...";
          });
        }
      };

      ws.onclose = () => {
        stream.getTracks().forEach(t => t.stop());
      };
    };

    mediaRecorder.start();
    mic.textContent = "⏹️";
    status.textContent = "Gravando...";

  } catch (err) {
    console.error("Erro no microfone:", err);
    status.textContent = "Erro ao acessar microfone";
  }
};