/*
  Minimal inventory (pantry) CRUD API.

  Expected auth:
  - API Gateway with Cognito/JWT authorizer.
  - user id is taken from the JWT `sub` claim.

  DynamoDB table:
  - PK: userId
  - SK: itemId

  Env vars:
  - INVENTORY_TABLE_NAME
  - AWS_REGION (Lambda sets this automatically)
*/

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.INVENTORY_TABLE_NAME;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: body ? JSON.stringify(body) : '',
  };
}

function getUserId(event) {
  // HTTP API (v2) authorizer
  const jwtClaims = event?.requestContext?.authorizer?.jwt?.claims;
  if (jwtClaims?.sub) return String(jwtClaims.sub);

  // REST API authorizer
  const claims = event?.requestContext?.authorizer?.claims;
  if (claims?.sub) return String(claims.sub);

  return null;
}

function getRouteKey(event) {
  // HTTP API provides routeKey, REST API provides httpMethod + resource/path
  if (event?.routeKey) return event.routeKey;
  const method = event?.httpMethod || 'GET';
  // Normalize path to match our 2 routes
  const rawPath = event?.path || event?.rawPath || '/';
  if (rawPath.startsWith('/inventory/') && rawPath.split('/').length >= 3) {
    return `${method} /inventory/{id}`;
  }
  if (rawPath === '/inventory') {
    return `${method} /inventory`;
  }
  if (rawPath.startsWith('/inventory')) {
    // cover trailing slash
    return `${method} /inventory`;
  }
  return `${method} ${rawPath}`;
}

function getIdFromPath(event) {
  if (event?.pathParameters?.id) return String(event.pathParameters.id);
  const rawPath = event?.path || event?.rawPath || '';
  const parts = rawPath.split('/').filter(Boolean);
  // /inventory/{id}
  if (parts.length >= 2 && parts[0] === 'inventory') return decodeURIComponent(parts[1]);
  return null;
}

function nowIso() {
  return new Date().toISOString();
}

function newItemId() {
  // Node 18+ supports crypto.randomUUID
  const crypto = require('crypto');
  return crypto.randomUUID();
}

exports.handler = async (event) => {
  if (!TABLE_NAME) {
    return json(500, { error: 'INVENTORY_TABLE_NAME is not set' });
  }

  // Preflight
  if (event?.httpMethod === 'OPTIONS' || event?.routeKey === 'OPTIONS /{proxy+}') {
    return json(204, null);
  }

  const userId = getUserId(event);
  if (!userId) {
    return json(401, { error: 'Unauthorized: missing user context' });
  }

  const routeKey = getRouteKey(event);

  try {
    // GET /inventory
    if (routeKey === 'GET /inventory') {
      const out = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'userId' },
          ExpressionAttributeValues: { ':pk': userId },
          ScanIndexForward: false,
        })
      );

      const items = (out.Items || []).map((it) => ({
        id: it.itemId,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        category: it.category,
        expiryDate: it.expiryDate,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
      }));
      return json(200, items);
    }

    // POST /inventory
    if (routeKey === 'POST /inventory') {
      const body = event?.body ? JSON.parse(event.body) : {};
      const name = (body?.name || '').toString().trim();
      if (!name) return json(400, { error: 'name is required' });

      const itemId = newItemId();
      const createdAt = nowIso();

      const item = {
        userId,
        itemId,
        name,
        quantity: body.quantity,
        unit: body.unit,
        category: body.category,
        expiryDate: body.expiryDate,
        createdAt,
        updatedAt: createdAt,
      };

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
          ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(itemId)',
        })
      );

      return json(201, {
        id: itemId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        expiryDate: item.expiryDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    }

    // PUT /inventory/{id}
    if (routeKey === 'PUT /inventory/{id}') {
      const id = getIdFromPath(event);
      if (!id) return json(400, { error: 'Missing id' });
      const body = event?.body ? JSON.parse(event.body) : {};

      // Allow updating a subset of fields
      const allowed = ['name', 'quantity', 'unit', 'category', 'expiryDate'];
      const updates = {};
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, k)) updates[k] = body[k];
      }
      if (Object.keys(updates).length === 0) {
        return json(400, { error: 'No updatable fields provided' });
      }
      if (updates.name !== undefined) {
        const name = (updates.name || '').toString().trim();
        if (!name) return json(400, { error: 'name cannot be empty' });
        updates.name = name;
      }

      const exprNames = { '#updatedAt': 'updatedAt' };
      const exprValues = { ':updatedAt': nowIso() };

      let updateExpr = 'SET #updatedAt = :updatedAt';
      let i = 0;
      for (const [k, v] of Object.entries(updates)) {
        i += 1;
        const nk = `#k${i}`;
        const vk = `:v${i}`;
        exprNames[nk] = k;
        exprValues[vk] = v;
        updateExpr += `, ${nk} = ${vk}`;
      }

      const out = await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId, itemId: id },
          UpdateExpression: updateExpr,
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
          ConditionExpression: 'attribute_exists(userId) AND attribute_exists(itemId)',
          ReturnValues: 'ALL_NEW',
        })
      );

      const it = out.Attributes;
      return json(200, {
        id: it.itemId,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        category: it.category,
        expiryDate: it.expiryDate,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
      });
    }

    // DELETE /inventory/{id}
    if (routeKey === 'DELETE /inventory/{id}') {
      const id = getIdFromPath(event);
      if (!id) return json(400, { error: 'Missing id' });

      await ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { userId, itemId: id },
          ConditionExpression: 'attribute_exists(userId) AND attribute_exists(itemId)',
        })
      );

      return json(200, { ok: true });
    }

    return json(404, { error: `No route for ${routeKey}` });
  } catch (err) {
    // Normalize conditional errors
    const name = err?.name || '';
    if (name === 'ConditionalCheckFailedException') {
      return json(404, { error: 'Not found' });
    }
    console.error('Inventory API error', err);
    return json(500, { error: 'Internal server error' });
  }
};
