import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // CORS per i font OpenDyslexic (usati anche dalle cornici embed su siti esterni)
  app.use("/fonts", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  // Ensure .wasm files are served with the correct MIME type.
  // IMPORTANTE: COOP/COEP sono impostati SOLO sui documenti HTML (servono a
  // ONNX Runtime Web per SharedArrayBuffer). NON vanno messi su font/asset:
  // altrimenti il font OpenDyslexic non puo' essere caricato cross-origin dalle
  // cornici embed su Blogger (ricadrebbe su un font serif).
  app.use(
    express.static(staticPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
        }
        if (filePath.endsWith(".html")) {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        }
      },
    })
  );

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
