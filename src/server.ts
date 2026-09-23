import { createServer } from "node:http";
import { routeContactForm } from "./contact_form.js";

const inbox = process.env.TEAM_INBOX;
if (!inbox) throw new Error("TEAM_INBOX is required");
createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/contact") { response.writeHead(404).end(); return; }
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  try {
    const result = await routeContactForm(JSON.parse(Buffer.concat(chunks).toString("utf8")), inbox);
    response.writeHead(result.accepted ? 202 : result.status, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch { response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "invalid_request" })); }
}).listen(Number(process.env.PORT ?? 3000));
