import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const INVENTORY_TABLE = process.env.INVENTORY_TABLE_NAME;
const PROFILES_TABLE = process.env.USER_PROFILES_TABLE_NAME;

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
  const jwtClaims = event?.requestContext?.authorizer?.jwt?.claims;
  if (jwtClaims?.sub) return String(jwtClaims.sub);
  
  const claims = event?.requestContext?.authorizer?.claims;
  if (claims?.sub) return String(claims.sub);
  
  return null;
}

function getRouteKey(event) {
  if (event?.routeKey) return event.routeKey;
  
  const method = event?.httpMethod || 'GET';
  const path = event?.path || event?.rawPath || '/';
  
  // Profile routes
  if (path === '/profiles') return `${method} /profiles`;
  if (path.startsWith('/profiles/') && path.split('/').length >= 3) return `${method} /profiles/{id}`;
  if (path === '/me') return `${method} /me`;
  
  // Inventory routes
  if (path.startsWith('/inventory/') && path.split('/').length >= 3) return `${method} /inventory/{id}`;
  if (path === '/inventory' || path.startsWith('/inventory')) return `${method} /inventory`;

  return `${method} ${path}`;
}

function getIdFromPath(event) {
  if (event?.pathParameters?.id) return String(event.pathParameters.id);
  
  const path = event?.path || event?.rawPath || '';
  const parts = path.split('/').filter(Boolean);
  
  if (parts.length >= 2 && (parts[0] === 'inventory' || parts[0] === 'profiles')) {
    return decodeURIComponent(parts[1]);
  }
  return null;
}

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return randomUUID();
}

// === PROFILE FUNCTIONS ===

async function getAllProfiles(userId) {
  console.log(`Getting all profiles for user: ${userId}`);
  
  const result = await ddb.send(
    new QueryCommand({
      TableName: PROFILES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false,
    })
  );
  
  const profiles = (result.Items || []).map(item => ({
    id: item.profileId,
    name: item.name,
    age: item.age,
    avatar: item.avatar,
    isMain: item.isMain || false,
    createdAt: item.createdAt,
    onboardingData: item.onboardingData || {},
  }));
  
  console.log(`Found ${profiles.length} profiles`);
  return profiles;
}

async function getMainProfile(userId) {
  console.log(`Getting main profile for user: ${userId}`);
  
  const result = await ddb.send(
    new QueryCommand({
      TableName: PROFILES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId, ':isMain': true },
      FilterExpression: 'isMain = :isMain',
    })
  );
  
  const mainProfile = result.Items?.[0] || null;
  console.log(`Main profile found: ${!!mainProfile}`);
  return mainProfile;
}

async function createProfile(userId, profileData) {
  console.log(`Creating profile for user: ${userId}`, profileData);
  
  const profileId = `profile_${Date.now()}_${newId().slice(0, 8)}`;
  const now = nowIso();
  
  // Check if this is the first profile
  const existingCount = await ddb.send(
    new QueryCommand({
      TableName: PROFILES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Select: 'COUNT',
    })
  );
  
  const isMain = (existingCount.Count || 0) === 0;
  console.log(`Is main profile: ${isMain}`);
  
  const profile = {
    userId,
    profileId,
    name: profileData.name,
    age: profileData.age,
    avatar: profileData.avatar || '👤',
    isMain,
    createdAt: now,
    updatedAt: now,
    onboardingData: profileData.onboardingData || {
      name: profileData.name,
      onboarding_completed: false,
    },
  };
  
  await ddb.send(
    new PutCommand({
      TableName: PROFILES_TABLE,
      Item: profile,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(profileId)',
    })
  );
  
  console.log(`Profile created with ID: ${profileId}`);
  
  return {
    id: profileId,
    name: profile.name,
    age: profile.age,
    avatar: profile.avatar,
    isMain: profile.isMain,
    createdAt: profile.createdAt,
    onboardingData: profile.onboardingData,
  };
}

async function updateProfile(userId, profileId, updates) {
  console.log(`Updating profile ${profileId} for user ${userId}`, updates);
  
  const allowed = ['name', 'age', 'avatar', 'onboardingData'];
  const validUpdates = {};
  
  for (const key of allowed) {
    if (updates.hasOwnProperty(key)) {
      validUpdates[key] = updates[key];
    }
  }
  
  if (Object.keys(validUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const exprNames = { '#updatedAt': 'updatedAt' };
  const exprValues = { ':updatedAt': nowIso() };
  let updateExpr = 'SET #updatedAt = :updatedAt';
  
  let i = 0;
  for (const [key, value] of Object.entries(validUpdates)) {
    i++;
    const nameKey = `#field${i}`;
    const valueKey = `:value${i}`;
    exprNames[nameKey] = key;
    exprValues[valueKey] = value;
    updateExpr += `, ${nameKey} = ${valueKey}`;
  }
  
  const result = await ddb.send(
    new UpdateCommand({
      TableName: PROFILES_TABLE,
      Key: { userId, profileId },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(profileId)',
      ReturnValues: 'ALL_NEW',
    })
  );
  
  const item = result.Attributes;
  console.log(`Profile updated successfully`);
  
  return {
    id: item.profileId,
    name: item.name,
    age: item.age,
    avatar: item.avatar,
    isMain: item.isMain,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    onboardingData: item.onboardingData,
  };
}

async function deleteProfile(userId, profileId) {
  console.log(`Deleting profile ${profileId} for user ${userId}`);
  
  // Check if it's a main profile
  const profile = await ddb.send(
    new GetCommand({
      TableName: PROFILES_TABLE,
      Key: { userId, profileId },
    })
  );
  
  if (!profile.Item) {
    throw new Error('Profile not found');
  }
  
  if (profile.Item.isMain) {
    throw new Error('Cannot delete main profile');
  }
  
  await ddb.send(
    new DeleteCommand({
      TableName: PROFILES_TABLE,
      Key: { userId, profileId },
    })
  );
  
  console.log(`Profile deleted successfully`);
  return { success: true };
}

// === INVENTORY FUNCTIONS ===

async function getInventory(userId) {
  console.log(`Getting inventory for user: ${userId}`);
  
  const result = await ddb.send(
    new QueryCommand({
      TableName: INVENTORY_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false,
    })
  );
  
  const items = (result.Items || []).map(item => ({
    id: item.itemId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiryDate: item.expiryDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
  
  console.log(`Found ${items.length} inventory items`);
  return items;
}

async function createInventoryItem(userId, itemData) {
  console.log(`Creating inventory item for user: ${userId}`, itemData);
  
  const itemId = newId();
  const now = nowIso();
  
  const item = {
    userId,
    itemId,
    name: itemData.name,
    quantity: itemData.quantity,
    unit: itemData.unit,
    category: itemData.category,
    expiryDate: itemData.expiryDate,
    createdAt: now,
    updatedAt: now,
  };
  
  await ddb.send(
    new PutCommand({
      TableName: INVENTORY_TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(itemId)',
    })
  );
  
  console.log(`Inventory item created with ID: ${itemId}`);
  
  return {
    id: itemId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiryDate: item.expiryDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function updateInventoryItem(userId, itemId, updates) {
  console.log(`Updating inventory item ${itemId} for user ${userId}`, updates);
  
  const allowed = ['name', 'quantity', 'unit', 'category', 'expiryDate'];
  const validUpdates = {};
  
  for (const key of allowed) {
    if (updates.hasOwnProperty(key)) {
      validUpdates[key] = updates[key];
    }
  }
  
  if (Object.keys(validUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }
  
  if (validUpdates.name !== undefined && !validUpdates.name.trim()) {
    throw new Error('Name cannot be empty');
  }
  
  const exprNames = { '#updatedAt': 'updatedAt' };
  const exprValues = { ':updatedAt': nowIso() };
  let updateExpr = 'SET #updatedAt = :updatedAt';
  
  let i = 0;
  for (const [key, value] of Object.entries(validUpdates)) {
    i++;
    const nameKey = `#field${i}`;
    const valueKey = `:value${i}`;
    exprNames[nameKey] = key;
    exprValues[valueKey] = value;
    updateExpr += `, ${nameKey} = ${valueKey}`;
  }
  
  const result = await ddb.send(
    new UpdateCommand({
      TableName: INVENTORY_TABLE,
      Key: { userId, itemId },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(itemId)',
      ReturnValues: 'ALL_NEW',
    })
  );
  
  const item = result.Attributes;
  console.log(`Inventory item updated successfully`);
  
  return {
    id: item.itemId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiryDate: item.expiryDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function deleteInventoryItem(userId, itemId) {
  console.log(`Deleting inventory item ${itemId} for user ${userId}`);
  
  await ddb.send(
    new DeleteCommand({
      TableName: INVENTORY_TABLE,
      Key: { userId, itemId },
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(itemId)',
    })
  );
  
  console.log(`Inventory item deleted successfully`);
  return { success: true };
}

// === MAIN HANDLER ===

export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  if (!INVENTORY_TABLE) {
    console.error('INVENTORY_TABLE_NAME not configured');
    return json(500, { error: 'INVENTORY_TABLE_NAME not configured' });
  }
  
  if (!PROFILES_TABLE) {
    console.error('USER_PROFILES_TABLE_NAME not configured');
    return json(500, { error: 'USER_PROFILES_TABLE_NAME not configured' });
  }
  
  // Handle CORS preflight
  if (event?.httpMethod === 'OPTIONS' || event?.routeKey === 'OPTIONS /{proxy+}') {
    console.log('Handling CORS preflight');
    return json(204, null);
  }
  
  const userId = getUserId(event);
  if (!userId) {
    console.error('No user ID found in request');
    return json(401, { error: 'Unauthorized: missing user context' });
  }
  
  console.log(`Processing request for user: ${userId}`);
  
  const routeKey = getRouteKey(event);
  console.log(`Route: ${routeKey}`);
  
  try {
    // === PROFILE ROUTES ===
    
    if (routeKey === 'GET /profiles') {
      const profiles = await getAllProfiles(userId);
      return json(200, profiles);
    }
    
    if (routeKey === 'POST /profiles') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name?.trim()) {
        return json(400, { error: 'Profile name is required' });
      }
      
      const profile = await createProfile(userId, body);
      return json(201, profile);
    }
    
    if (routeKey === 'PUT /profiles/{id}') {
      const profileId = getIdFromPath(event);
      if (!profileId) {
        return json(400, { error: 'Profile ID required' });
      }
      
      const body = JSON.parse(event.body || '{}');
      const updatedProfile = await updateProfile(userId, profileId, body);
      return json(200, updatedProfile);
    }
    
    if (routeKey === 'DELETE /profiles/{id}') {
      const profileId = getIdFromPath(event);
      if (!profileId) {
        return json(400, { error: 'Profile ID required' });
      }
      
      await deleteProfile(userId, profileId);
      return json(200, { success: true });
    }
    
    if (routeKey === 'GET /me') {
      const mainProfile = await getMainProfile(userId);
      if (mainProfile) {
        return json(200, mainProfile.onboardingData || {});
      }
      return json(200, { name: '', onboarding_completed: false });
    }
    
    if (routeKey === 'PUT /me') {
      const body = JSON.parse(event.body || '{}');
      
      let mainProfile = await getMainProfile(userId);
      
      if (!mainProfile) {
        // Create main profile if it doesn't exist
        await createProfile(userId, {
          name: body.name || 'Me',
          onboardingData: body,
        });
        return json(200, body);
      } else {
        // Update existing main profile
        const updated = await updateProfile(userId, mainProfile.profileId, {
          onboardingData: { ...mainProfile.onboardingData, ...body }
        });
        return json(200, updated.onboardingData);
      }
    }
    
    // === INVENTORY ROUTES ===
    
    if (routeKey === 'GET /inventory') {
      const items = await getInventory(userId);
      return json(200, items);
    }
    
    if (routeKey === 'POST /inventory') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name?.trim()) {
        return json(400, { error: 'Item name is required' });
      }
      
      const item = await createInventoryItem(userId, body);
      return json(201, item);
    }
    
    if (routeKey === 'PUT /inventory/{id}') {
      const itemId = getIdFromPath(event);
      if (!itemId) {
        return json(400, { error: 'Item ID required' });
      }
      
      const body = JSON.parse(event.body || '{}');
      const updatedItem = await updateInventoryItem(userId, itemId, body);
      return json(200, updatedItem);
    }
    
    if (routeKey === 'DELETE /inventory/{id}') {
      const itemId = getIdFromPath(event);
      if (!itemId) {
        return json(400, { error: 'Item ID required' });
      }

      await deleteInventoryItem(userId, itemId);
      return json(200, { success: true });
    }

    console.log(`Route not found: ${routeKey}`);
    return json(404, { error: `Route not found: ${routeKey}` });
    
  } catch (error) {
    console.error('Lambda execution error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      requestId: event.requestContext?.requestId,
      userId: userId,
      route: routeKey,
      event: JSON.stringify(event, null, 2)
    });
    
    if (error.name === 'ConditionalCheckFailedException') {
      return json(404, { error: 'Resource not found' });
    }
    
    if (error.name === 'ValidationException') {
      return json(400, { error: `Validation error: ${error.message}` });
    }
    
    if (error.name === 'ResourceNotFoundException') {
      return json(500, { error: 'Database table not found' });
    }
    
    return json(500, { 
      error: 'Internal server error',
      message: error.message,
      requestId: event.requestContext?.requestId
    });
  }
};