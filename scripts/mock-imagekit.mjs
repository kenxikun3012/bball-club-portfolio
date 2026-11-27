/**
 * Minimal stand-in for ImageKit's upload API, used by the integration and e2e tests so they
 * never need a real account. Not for production use.
 *
 *   POST /api/v1/files/upload   multipart; requires "Authorization: Basic base64(<privateKey>:)"
 *   GET  /__last                what the last upload looked like (file name, auth header)
 *
 * File names containing "fail-upstream" make it answer 500; "bad-url" makes it return a URL
 * outside the configured endpoint (the app must reject both).
 */
import http from "node:http";
import crypto from "node:crypto";

export const MOCK_PRIVATE_KEY = "private_mock_key";
export const MOCK_URL_ENDPOINT = "https://ik.example.test/club";

export function startMockImageKit(port) {
  let last = null;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/__last") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(last));
      return;
    }

    if (request.method !== "POST" || url.pathname !== "/api/v1/files/upload") {
      response.statusCode = 404;
      response.end("not found");
      return;
    }

    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("latin1");
      const fileName = body.match(/name="fileName"\r\n\r\n([^\r\n]*)/)?.[1] ?? "";
      const folder = body.match(/name="folder"\r\n\r\n([^\r\n]*)/)?.[1] ?? "";
      last = {
        fileName,
        folder,
        authorization: request.headers.authorization ?? "",
        bytes: Number(request.headers["content-length"] ?? 0),
      };

      const expected = `Basic ${Buffer.from(`${MOCK_PRIVATE_KEY}:`).toString("base64")}`;
      response.setHeader("content-type", "application/json");
      if (last.authorization !== expected) {
        response.statusCode = 401;
        response.end(JSON.stringify({ message: "Your account cannot be authenticated." }));
        return;
      }
      if (fileName.includes("fail-upstream")) {
        response.statusCode = 500;
        response.end(JSON.stringify({ message: "UPSTREAM-SECRET-DETAIL" }));
        return;
      }
      const ext = fileName.match(/\.[a-z0-9]+$/i)?.[0] ?? ".bin";
      const url = fileName.includes("bad-url")
        ? `https://evil.example/${crypto.randomUUID()}${ext}`
        : `${MOCK_URL_ENDPOINT}/${crypto.randomUUID()}${ext}`;
      response.end(JSON.stringify({ fileId: crypto.randomUUID(), url, name: fileName }));
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
