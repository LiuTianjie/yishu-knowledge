const http = require("http");
const next = require("next");

let serverPromise;

function normalizeHeaders(input) {
  const headers = {};
  if (!input || typeof input !== "object") return headers;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    headers[String(key).toLowerCase()] = Array.isArray(value)
      ? value.join(",")
      : String(value);
  }

  return headers;
}

function parseEvent(rawEvent) {
  const event =
    typeof rawEvent === "string" ? JSON.parse(rawEvent || "{}") : rawEvent || {};

  const method =
    event?.requestContext?.http?.method || event?.httpMethod || event?.method || "GET";

  const path = event?.rawPath || event?.path || "/";
  const rawQueryString =
    event?.rawQueryString ||
    new URLSearchParams(event?.queryParameters || {}).toString();
  const url = rawQueryString ? `${path}?${rawQueryString}` : path;

  const headers = normalizeHeaders(event?.headers);

  let bodyBuffer;
  if (event?.body === undefined || event?.body === null || event?.body === "") {
    bodyBuffer = undefined;
  } else {
    bodyBuffer = event?.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(String(event.body));
  }

  return { method, url, headers, bodyBuffer };
}

async function getServerInfo() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const app = next({
        dev: false,
        dir: __dirname,
        hostname: "127.0.0.1",
        port: 0,
      });

      await app.prepare();
      const handle = app.getRequestHandler();

      const server = http.createServer((req, res) => {
        handle(req, res).catch((error) => {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ message: "Internal Server Error", error: String(error) }));
        });
      });

      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });

      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      if (!port) {
        throw new Error("Failed to start internal Next.js server");
      }

      return { port };
    })();
  }

  return serverPromise;
}

module.exports.handler = async (event) => {
  const { method, url, headers, bodyBuffer } = parseEvent(event);
  const { port } = await getServerInfo();

  const response = await fetch(`http://127.0.0.1:${port}${url}`, {
    method,
    headers,
    body: bodyBuffer,
    redirect: "manual",
  });

  const arrayBuffer = await response.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    isBase64Encoded: true,
    body: body.toString("base64"),
  };
};