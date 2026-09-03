/**
 * Sincronizzazione altezza per embed iframe (protocollo `labvisivo:height`).
 *
 * Quando l'app è caricata dentro un iframe (es. cornice dinamica su Blogger
 * o su un sito), invia al parent l'altezza reale del documento così la
 * cornice può adattarsi automaticamente al contenuto (resize automatico).
 *
 * Il parent ascolta messaggi del tipo:
 *   { type: "labvisivo:height", height: <numero> }
 */

function currentHeight(): number {
  const docEl = document.documentElement;
  const body = document.body;
  /* IMPORTANTE: NON usare documentElement.scrollHeight come riferimento
     assoluto. Quando il contenuto è più corto dell'iframe, lo scrollHeight
     del documento resta "gonfiato" all'altezza del viewport dell'iframe
     (mai meno), quindi la cornice dinamica non potrebbe MAI restringersi
     e la prima pagina mostrerebbe un grande vuoto sotto la card. Usiamo
     invece l'altezza reale del contenuto (body + offsetHeight del documento)
     e aggiungiamo documentElement.scrollHeight SOLO quando il contenuto
     supera davvero il viewport. */
  const viewportH = window.innerHeight || (docEl ? docEl.clientHeight : 0);
  let h = Math.max(
    body ? body.scrollHeight : 0,
    body ? body.offsetHeight : 0,
    docEl ? docEl.offsetHeight : 0
  );
  if (docEl && docEl.scrollHeight > viewportH) {
    h = Math.max(h, docEl.scrollHeight);
  }
  return h;
}

function getCorniceToken(): string | null {
  // La cornice v3 "impermeabile" aggiunge ?cornice=<token> all'URL dell'iframe:
  // rispecchiamo il token nei messaggi, così la cornice rifiuta i messaggi
  // di altezza che arrivano da altre istanze (filtro e.source + token).
  try {
    return new URLSearchParams(window.location.search).get("cornice");
  } catch {
    return null;
  }
}

function sendHeight(token: string | null = getCorniceToken()): void {
  // Attivo solo quando siamo dentro un iframe (non come pagina principale)
  if (window.self === window.top) return;
  const height = currentHeight();
  if (height > 100) {
    const msg: Record<string, unknown> = { type: "labvisivo:height", height };
    if (token) msg.cornice = token;
    window.parent.postMessage(msg, "*");
  }
}

export function initHeightSync(): void {
  // IMPORTANTE: quando l'app è dentro un iframe a altezza automatica
  // (cornice dinamica), la pagina deve seguire l'altezza del CONTENUTO.
  // Il classico `min-h-screen` (100vh) creerebbe un loop infinito:
  //   iframe = misurato → viewport = iframe → misurato = viewport + barra → …
  // Con la classe `lf-embedded` il CSS disattiva i 100vh (vedi index.css).
  if (window.self !== window.top) {
    document.documentElement.classList.add("lf-embedded");
  }

  // Risponde al "ping" della cornice dinamica (embed Blogger): la cornice
  // può richiedere l'altezza in ogni momento con { type: "labvisivo:ping" }
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "labvisivo:ping") {
      sendHeight(
        typeof e.data.cornice === "string" ? e.data.cornice : getCorniceToken()
      );
    }
  });

  // Invia subito (prima del rendering completo) e a caricamento avvenuto
  sendHeight();
  window.addEventListener("load", () => sendHeight());
  window.addEventListener("resize", () => sendHeight());

  // Osserva i cambi di layout (es. caricamento del modello ONNX, dialoghi,
  // cambio passo dell'esercizio…)
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => sendHeight());
    if (document.documentElement) ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    setTimeout(() => sendHeight(), 250);
  }

  // Retry: font, modello OCR e contenuti asincroni possono cambiare
  // l'altezza dopo l'evento "load"
  setTimeout(sendHeight, 500);
  setTimeout(sendHeight, 1500);
}
