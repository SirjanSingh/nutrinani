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
const USER_PROFILES_TABLE_NAME = process.env.USER_PROFILES_TABLE_NAME;

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
  // Normalize path to match our routes
  const rawPath = event?.path || event?.rawPath || '/';
  
  // Profile routes
  if (rawPath === '/profiles') {
    return `${method} /profiles`;
  }
  if (rawPath.startsWith('/profiles/') && rawPath.split('/').length >= 3) {
    return `${method} /profiles/{id}`;
  }
  if (rawPath === '/me') {
    return `${method} /me`;
  }
  
  // Inventory routes
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
  // /inventory/{id} or /profiles/{id}
  if (parts.length >= 2 && (parts[0] === 'inventory' || parts[0] === 'profiles')) {
    return decodeURIComponent(parts[1]);
  }
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
  if (!USER_PROFILES_TABLE_NAME) {
    return json(500, { error: 'USER_PROFILES_TABLE_NAME is not set' });
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
    // === PROFILE ROUTES ===
    
    // GET /profiles - List all family profiles for user
    if (routeKey === 'GET /profiles') {
      const out = await ddb.send(
        new QueryCommand({
          TableName: USER_PROFILES_TABLE_NAME,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'userId' },
          ExpressionAttributeValues: { ':pk': userId },
          ScanIndexForward: false,
        })
      );

      const profiles = (out.Items || []).map((item) => ({
        id: item.profileId,
        name: item.name,
        age: item.age,
        avatar: item.avatar,
        isMain: item.isMain || false,
        createdAt: item.createdAt,
        onboardingData: item.onboardingData || {},
      }));

      return json(200, profiles);
    }

    // POST /profiles - Create new family profile
    if (routeKey === 'POST /profiles') {
      const body = event?.body ? JSON.parse(event.body) : {};
      const name = (body?.name || '').toString().trim();
      if (!name) return json(400, { error: 'name is required' });

      const profileId = newItemId();
      const createdAt = nowIso();

      // Check if this is the first profile (make it main)
      const existingProfiles = await ddb.send(
        new QueryCommand({
          TableName: USER_PROFILES_TABLE_NAME,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'userId' },
          ExpressionAttributeValues: { ':pk': userId },
          Select: 'COUNT',
        })
      );

      const isMain = (existingProfiles.Count || 0) === 0;

      const profile = {
        userId,
        profileId,
        name,
        age: body.age,
        avatar: body.avatar || '👤',
        isMain,
        createdAt,
        updatedAt: createdAt,
        onboardingData: body.onboardingData || {
          name,
          onboarding_completed: false,
        },
      };

      await ddb.send(
        new PutCommand({
          TableName: USER_PROFILES_TABLE_NAME,
          Item: profile,
          ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(profileId)',
        })
      );

      return json(201, {
        id: profileId,
        name: profile.name,
        age: profile.age,
        avatar: profile.avatar,
        isMain: profile.isMain,
        createdAt: profile.createdAt,
        onboardingData: profile.onboardingData,
      });
    }

    // PUT /profiles/{id} - Update family profile
    if (routeKey === 'PUT /profiles/{id}') {
      const id = getIdFromPath(event);
      if (!id) return json(400, { error: 'Missing profile id' });
      const body = event?.body ? JSON.parse(event.body) : {};

      // Allow updating profile fields
      const allowed = ['name', 'age', 'avatar', 'onboardingData'];
      const updates = {};
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, k)) updates[k] = body[k];
      }
      if (Object.keys(updates).length === 0) {
        return json(400, { error: 'No updatable fields provided' });
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
          TableName: USER_PROFILES_TABLE_NAME,
          Key: { userId, profileId: id },
          UpdateExpression: updateExpr,
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
          ConditionExpression: 'attribute_exists(userId) AND attribute_exists(profileId)',
          ReturnValues: 'ALL_NEW',
        })
      );

      const item = out.Attributes;
      return json(200, {
        id: item.profileId,
        name: item.name,
        age: item.age,
        avatar: item.avatar,
        isMain: item.isMain,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        onboardingData: item.onboardingData,
      });
    }

    // DELETE /profiles/{id} - Delete family profile
    if (routeKey === 'DELETE /profiles/{id}') {
      const id = getIdFromPath(event);
      if (!id) return json(400, { error: 'Missing profile id' });

      // Check if it's the main profile
      const profileCheck = await ddb.send(
        new QueryCommand({
          TableName: USER_PROFILES_TABLE_NAME,
          KeyConditionExpression: '#pk = :pk AND #sk = :sk',
          ExpressionAttributeNames: { '#pk': 'userId', '#sk': 'profileId' },
          ExpressionAttributeValues: { ':pk': userId, ':sk': id },
        })
      );

      const profile = profileCheck.Items?.[0];
      if (profile?.isMain) {
        return json(400, { error: 'Cannot delete main profile' });
      }

      await ddb.send(
        new DeleteCommand({
          TableName: USER_PROFILES_TABLE_NAME,
          Key: { userId, profileId: id },
          ConditionExpression: 'attribute_exists(userId) AND attribute_exists(profileId)',
        })
      );

      return json(200, { ok: true });
    }

    // GET /me - Legacy endpoint for backward compatibility
    if (routeKey === 'GET /me') {
      // Try to get the main profile first
      const out = await ddb.send(
        new QueryCommand({
          TableName: USER_PROFILES_TABLE_NAME,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'userId' },
          ExpressionAttributeValues: { ':pk': userId },
          FilterExpression: 'isMain = :isMain',
          ExpressionAttributeValues: { ':pk': userId, ':isMain': true },
        })
      );

      const mainProfile = out.Items?.[0];
      if (mainProfile) {
        return json(200, mainProfile.onboardingData || {});
      }

      // If no main profile, return empty profile
      return json(200, { name: '', onboarding_completed: false });
    }

    // PUT /me - Legacy endpoint for backward compatibility
    if (routeKey === 'PUT /me') {
      const body = event?.body ? JSON.parse(event.body) : {};
      
      // Try to find main profile
      const out = await ddb.send(
        new QueryCommand({
          TableName: USER_PROFILES_TABLE_NAME,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'userId' },
          ExpressionAttributeValues: { ':pk': userId },
          FilterExpression: 'isMain = :isMain',
          ExpressionAttributeValues: { ':pk': userId, ':isMain': true },
        })
      );

      let mainProfile = out.Items?.[0];
      
      if (!mainProfile) {
        // Create a main profile if it doesn't exist
        const profileId = newItemId();
        const createdAt = nowIso();
        
        mainProfile = {
          userId,
          profileId,
          name: body.name || 'Me',
          avatar: '👤',
          isMain: true,
          createdAt,
          updatedAt: createdAt,
          onboardingData: body,
        };

        await ddb.send(
          new PutCommand({
            TableName: USER_PROFILES_TABLE_NAME,
            Item: mainProfile,
          })
        );
      } else {
        // Update existing main profile
        await ddb.send(
          new UpdateCommand({
            TableName: USER_PROFILES_TABLE_NAME,
            Key: { userId, profileId: mainProfile.profileId },
            UpdateExpression: 'SET onboardingData = :data, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':data': { ...mainProfile.onboardingData, ...body },
              ':updatedAt': nowIso(),
            },
          })
        );
      }

      return json(200, { ...mainProfile.onboardingData, ...body });
    }

    // === INVENTORY ROUTES (existing) ===
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
