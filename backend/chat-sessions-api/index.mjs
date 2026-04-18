import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE = process.env.CHAT_SESSIONS_TABLE_NAME || "NutriNaniChatSessions";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

const res = (statusCode, body) => ({
  statusCode,
  headers,
  body: body == null ? "" : JSON.stringify(body),
});

const now = () => new Date().toISOString();
const getUserId = (event) =>
  event?.requestContext?.authorizer?.jwt?.claims?.sub ?? null;

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method;
  const path = event?.rawPath;

  if (method === "OPTIONS") return res(204);

  const userId = getUserId(event);
  if (!userId) return res(401, { error: "Unauthorized" });

  try {
    // GET /chat/sessions  -> list sessions metadata (newest first)
    if (method === "GET" && path === "/chat/sessions") {
      const limit = Math.min(
        parseInt(event?.queryStringParameters?.limit || "20", 10) || 20,
        50
      );
      const out = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "userId = :u",
          ExpressionAttributeValues: { ":u": userId },
          ProjectionExpression:
            "sessionId, title, createdAt, updatedAt, messageCount",
        })
      );
      const items = (out.Items ?? [])
        .map((it) => ({
          id: it.sessionId,
          title: it.title || "New chat",
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,
          messageCount: it.messageCount || 0,
        }))
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        .slice(0, limit);
      return res(200, items);
    }

    // GET /chat/sessions/{id}
    if (method === "GET" && path.startsWith("/chat/sessions/")) {
      const id = decodeURIComponent(path.split("/")[3] || "");
      if (!id) return res(400, { error: "sessionId required" });
      const out = await ddb.send(
        new GetCommand({ TableName: TABLE, Key: { userId, sessionId: id } })
      );
      if (!out.Item) return res(404, { error: "Not found" });
      return res(200, {
        id: out.Item.sessionId,
        title: out.Item.title || "New chat",
        messages: Array.isArray(out.Item.messages) ? out.Item.messages : [],
        createdAt: out.Item.createdAt,
        updatedAt: out.Item.updatedAt,
      });
    }

    // PUT /chat/sessions/{id}  -> upsert (autosave whole session)
    if (method === "PUT" && path.startsWith("/chat/sessions/")) {
      const id = decodeURIComponent(path.split("/")[3] || "");
      if (!id) return res(400, { error: "sessionId required" });
      const body = JSON.parse(event.body || "{}");
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const title =
        (body.title && String(body.title).slice(0, 120)) ||
        messages.find((m) => m.role === "user")?.content?.slice(0, 80) ||
        "New chat";

      const out = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId, sessionId: id },
          UpdateExpression:
            "SET #title=:title, #messages=:messages, #messageCount=:count, #updatedAt=:updatedAt, #createdAt=if_not_exists(#createdAt,:createdAt)",
          ExpressionAttributeNames: {
            "#title": "title",
            "#messages": "messages",
            "#messageCount": "messageCount",
            "#updatedAt": "updatedAt",
            "#createdAt": "createdAt",
          },
          ExpressionAttributeValues: {
            ":title": title,
            ":messages": messages,
            ":count": messages.length,
            ":updatedAt": now(),
            ":createdAt": now(),
          },
          ReturnValues: "ALL_NEW",
        })
      );
      const it = out.Attributes;
      return res(200, {
        id: it.sessionId,
        title: it.title,
        messages: it.messages || [],
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
      });
    }

    // DELETE /chat/sessions/{id}
    if (method === "DELETE" && path.startsWith("/chat/sessions/")) {
      const id = decodeURIComponent(path.split("/")[3] || "");
      if (!id) return res(400, { error: "sessionId required" });
      await ddb.send(
        new DeleteCommand({ TableName: TABLE, Key: { userId, sessionId: id } })
      );
      return res(200, { ok: true });
    }

    return res(404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    return res(500, { error: "Internal error" });
  }
};
