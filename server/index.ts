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

  // COOP/COEP headers required by ONNX Runtime Web for SharedArrayBuffer
  app.use((_req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  // CORS per i font OpenDyslexic (usati anche dalle cornici embed su siti esterni)
  app.use("/fonts", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  // Ensure .wasm files are served with the correct MIME type
  app.use(
    express.static(staticPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
        }
      },
    })
  );

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
