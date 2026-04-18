/*
  Family Profiles API for NutriNani
  
  DynamoDB UserProfilesV2 table:
  - PK: userId (String) 
  - SK: profileId (String)
  
  Each profile contains:
  - Basic info: name, avatar, age, isMain
  - onboardingData: all dietary preferences, allergies, etc.
*/

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE_NAME;

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

function newProfileId() {
  const crypto = require('crypto');
  return `profile_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

// === QUERY PATTERNS ===

// 1. Get all profiles for a user
async function getAllProfiles(userId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: USER_PROFILES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false, // newest first
    })
  );
  
  return (result.Items || []).map(item => ({
    id: item.profileId,
    name: item.name,
    age: item.age,
    avatar: item.avatar,
    isMain: item.isMain || false,
    createdAt: item.createdAt,
    onboardingData: item.onboardingData || {},
  }));
}

// 2. Get main profile for legacy /me endpoint
async function getMainProfile(userId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: USER_PROFILES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId, ':isMain': true },
      FilterExpression: 'isMain = :isMain',
    })
  );
  
  return result.Items?.[0] || null;
}

// 3. Create new profile
async function createProfile(userId, profileData) {
  const profileId = newProfileId();
  const now = nowIso();
  
  // Check if this is the first profile (make it main)
  const existingProfiles = await ddb.send(
    new QueryCommand({
      TableName: USER_PROFILES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Select: 'COUNT',
    })
  );
  
  const isMain = (existingProfiles.Count || 0) === 0;
  
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
      TableName: USER_PROFILES_TABLE,
      Item: profile,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(profileId)',
    })
  );
  
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

// 4. Update profile (including onboarding data)
async function updateProfile(userId, profileId, updates) {
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
      TableName: USER_PROFILES_TABLE,
      Key: { userId, profileId },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(profileId)',
      ReturnValues: 'ALL_NEW',
    })
  );
  
  const item = result.Attributes;
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

// 5. Delete profile (with main profile protection)
async function deleteProfile(userId, profileId) {
  // First check if it's a main profile
  const profile = await ddb.send(
    new QueryCommand({
      TableName: USER_PROFILES_TABLE,
      KeyConditionExpression: 'userId = :userId AND profileId = :profileId',
      ExpressionAttributeValues: { ':userId': userId, ':profileId': profileId },
    })
  );
  
  const profileItem = profile.Items?.[0];
  if (!profileItem) {
    throw new Error('Profile not found');
  }
  
  if (profileItem.isMain) {
    throw new Error('Cannot delete main profile');
  }
  
  await ddb.send(
    new DeleteCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { userId, profileId },
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(profileId)',
    })
  );
  
  return { success: true };
}

// === API ROUTES ===

exports.handler = async (event) => {
  if (!USER_PROFILES_TABLE) {
    return json(500, { error: 'USER_PROFILES_TABLE_NAME not configured' });
  }
  
  // Handle CORS preflight
  if (event?.httpMethod === 'OPTIONS') {
    return json(204, null);
  }
  
  const userId = getUserId(event);
  if (!userId) {
    return json(401, { error: 'Unauthorized' });
  }
  
  const method = event?.httpMethod || 'GET';
  const path = event?.path || event?.rawPath || '/';
  
  try {
    // GET /profiles - List all family profiles
    if (method === 'GET' && path === '/profiles') {
      const profiles = await getAllProfiles(userId);
      return json(200, profiles);
    }
    
    // POST /profiles - Create new profile
    if (method === 'POST' && path === '/profiles') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name?.trim()) {
        return json(400, { error: 'Profile name is required' });
      }
      
      const profile = await createProfile(userId, body);
      return json(201, profile);
    }
    
    // PUT /profiles/{id} - Update profile
    if (method === 'PUT' && path.startsWith('/profiles/')) {
      const profileId = path.split('/')[2];
      if (!profileId) {
        return json(400, { error: 'Profile ID required' });
      }
      
      const body = JSON.parse(event.body || '{}');
      const updatedProfile = await updateProfile(userId, profileId, body);
      return json(200, updatedProfile);
    }
    
    // DELETE /profiles/{id} - Delete profile
    if (method === 'DELETE' && path.startsWith('/profiles/')) {
      const profileId = path.split('/')[2];
      if (!profileId) {
        return json(400, { error: 'Profile ID required' });
      }
      
      await deleteProfile(userId, profileId);
      return json(200, { success: true });
    }
    
    // GET /me - Legacy endpoint (returns main profile's onboarding data)
    if (method === 'GET' && path === '/me') {
      const mainProfile = await getMainProfile(userId);
      if (mainProfile) {
        return json(200, mainProfile.onboardingData || {});
      }
      return json(200, { name: '', onboarding_completed: false });
    }
    
    // PUT /me - Legacy endpoint (updates main profile's onboarding data)
    if (method === 'PUT' && path === '/me') {
      const body = JSON.parse(event.body || '{}');
      
      let mainProfile = await getMainProfile(userId);
      
      if (!mainProfile) {
        // Create main profile if it doesn't exist
        const newProfile = await createProfile(userId, {
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
    
    return json(404, { error: 'Route not found' });
    
  } catch (error) {
    console.error('Profile API Error:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return json(404, { error: 'Profile not found' });
    }
    
    return json(500, { 
      error: error.message || 'Internal server error' 
    });
  }
};