const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { networkInterfaces } = require("os");

const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

const MAX_BODY = 25 * 1024 * 1024;

function getLanIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const isV4 = net.family === "IPv4" || net.family === 4;
      if (isV4 && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;

    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function extractText(responseJson) {
  if (typeof responseJson?.output_text === "string") return responseJson.output_text;
  const output = responseJson?.output;
  if (!Array.isArray(output)) return "";
  for (const item of output) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === "/vision" && req.method === "POST") {
    try {
      if (!OPENAI_API_KEY) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing OPENAI_API_KEY" }));
        return;
      }

      const body = await readJson(req);
      const images = Array.isArray(body.images) ? body.images : [];
      const poiNames = Array.isArray(body.poiNames) ? body.poiNames : [];

      if (!images.length) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No images provided" }));
        return;
      }

      const instruction = `You are a vision assistant for Toronto PATH indoor navigation.\n\nIdentify the most likely location based on the photo(s).\nOnly use this list of possible places: ${poiNames.join(", ")}.\nReturn JSON with keys: guess (string), candidates (array of strings, up to 5), confidence (0-1), evidence (array of short hints).`;

      const content = [
        { type: "input_text", text: instruction },
        ...images.map((image) => ({ type: "input_image", image_url: image })),
      ];

      const apiResponse = await fetch(`${OPENAI_BASE_URL}/responses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_VISION_MODEL,
          input: [
            {
              role: "user",
              content,
            },
          ],
          text: {
            format: { type: "json_object" },
          },
        }),
      });

      const apiText = await apiResponse.text();
      if (!apiResponse.ok) {
        res.writeHead(apiResponse.status, { "Content-Type": "application/json" });
        res.end(apiText || JSON.stringify({ error: "OpenAI request failed" }));
        return;
      }

      let parsed;
      try {
        const parsedJson = JSON.parse(apiText);
        const outputText = extractText(parsedJson);
        parsed = outputText ? JSON.parse(outputText) : parsedJson;
      } catch (error) {
        parsed = { guess: "", candidates: [], confidence: 0, evidence: [] };
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(parsed));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: String(error?.message || error || "Proxy error"),
        })
      );
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  const host = getLanIp();
  console.log(`Vision proxy listening on http://localhost:${PORT}`);
  console.log(`LAN access: http://${host}:${PORT}`);
});
