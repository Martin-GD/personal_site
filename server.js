const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8765);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "..", "ha_workstation_daily_duration.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": payload.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  });
  response.end(payload);
}

function sendJson(response, statusCode, value) {
  send(response, statusCode, JSON.stringify(value), MIME_TYPES[".json"]);
}

function safePublicPath(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) return null;
  return filePath;
}

function handleData(response) {
  fs.readFile(DATA_FILE, "utf8", (error, text) => {
    if (error) {
      sendJson(response, 500, { error: "无法读取工位数据", detail: error.code });
      return;
    }

    try {
      const data = JSON.parse(text);
      sendJson(response, 200, data);
    } catch {
      sendJson(response, 500, { error: "工位 JSON 格式无效" });
    }
  });
}

function handleStatic(response, requestPath) {
  const filePath = safePublicPath(requestPath);
  if (!filePath) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      send(response, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Unable to read file");
      return;
    }
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    send(response, 200, file, contentType);
  });
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET") {
    send(response, 405, "Method Not Allowed");
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/api/workstation") {
    handleData(response);
    return;
  }
  if (requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, storage: "json-file" });
    return;
  }
  handleStatic(response, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`GMD personal site running at http://${HOST}:${PORT}`);
  console.log(`Data source: ${DATA_FILE}`);
});

server.on("error", (error) => {
  console.error(`Unable to start server: ${error.message}`);
  process.exitCode = 1;
});
