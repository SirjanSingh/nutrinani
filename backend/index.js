const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, QueryCommand, UpdateCommand, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { GoogleAuth } = require('google-auth-library');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Gemini on Vertex AI. Auth is keyless via Workload Identity Federation: this
// Lambda's AWS execution-role credentials are exchanged for a short-lived Google
// token that impersonates the Vertex service account. The googleAuth instance is
// created once and reused across warm invocations (it caches tokens).
const googleAuth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
const GCP_PROJECT = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_REGION || 'us-central1';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const POSTS_TABLE = "NutriNani-CommunityPosts";
const COMMENTS_TABLE = "NutriNani-CommunityComments";
const LIKES_TABLE = "NutriNani-CommunityLikes";

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event));
    
    const method = event.requestContext?.http?.method || event.httpMethod || event.requestContext?.httpMethod;
    const path = event.requestContext?.http?.path || event.rawPath || event.path;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return { statusCode: 200, headers: HEADERS, body: '' };
    }
    
    try {
        if (method === 'GET' && path === '/posts') {
            return await getPosts(event);
        } else if (method === 'POST' && path === '/posts') {
            return await createPost(event);
        } else if (method === 'POST' && path.match(/^\/posts\/([^\/]+)\/like$/)) {
            const postId = path.split('/')[2];
            return await toggleLike(event, postId);
        } else if (method === 'GET' && path.match(/^\/posts\/([^\/]+)\/comments$/)) {
            const postId = path.split('/')[2];
            return await getComments(postId);
        } else if (method === 'POST' && path.match(/^\/posts\/([^\/]+)\/comments$/)) {
            const postId = path.split('/')[2];
            return await addComment(event, postId);
        } else {
            return {
                statusCode: 404,
                headers: HEADERS,
                body: JSON.stringify({ message: "Not Found" })
            };
        }
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: "Internal server error", error: error.message })
        };
    }
};

async function getPosts(event) {
    // In a real app, you'd extract userId from Cognito authorizer token
    // const userId = event.requestContext.authorizer.jwt.claims.sub;
    const userId = "temp-user-id"; // Placeholder since authorizer isn't fully attached in this simple demo
    
    const command = new ScanCommand({
        TableName: POSTS_TABLE,
    });
    const response = await docClient.send(command);
    let posts = response.Items || [];
    
    // Sort by newest
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // We would ideally query the likes table to set likedByMe, but for now we skip or do basic mapping
    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(posts)
    };
}

async function createPost(event) {
    const body = JSON.parse(event.body);
    const { type, title, content, tags } = body;
    const postId = crypto.randomUUID();
    
    // Call Gemini (Vertex AI) to verify and rewrite. Keyless auth via WIF.
    let rewrittenText = content;
    let safetyBadge = "safe";
    let safetyReasons = ["Reviewed automatically"];

    if (GCP_PROJECT) {
        try {
            const systemPrompt = `You are NutriNani, an AI evaluating a health ${type}. Evaluate safety, rewrite it clearly in markdown, and output JSON in this format: {"rewrittenText": "...", "safetyBadge": "safe" | "caution", "safetyReasons": ["reason1"]}`;
            const url = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

            const authClient = await googleAuth.getClient();
            const aiResponse = await authClient.request({
                url,
                method: "POST",
                data: {
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [
                        { role: "user", parts: [{ text: `Title: ${title}\nContent: ${content}` }] }
                    ],
                    generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
                }
            });

            const text = aiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                const result = JSON.parse(text);
                rewrittenText = result.rewrittenText || content;
                safetyBadge = result.safetyBadge || "safe";
                safetyReasons = result.safetyReasons || safetyReasons;
            }
        } catch (e) {
            console.error("Gemini (Vertex) Error:", e?.response?.data || e.message || e);
        }
    }
    
    const postItem = {
        id: postId,
        type: type,
        title: title || "",
        tags: tags || [],
        originalText: content,
        rewrittenText: rewrittenText,
        safetyForUser: {
            badge: safetyBadge,
            reasons: safetyReasons
        },
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        createdAt: new Date().toISOString(),
        author: { name: "User" },
        authorId: "temp-user-id"
    };

    const command = new PutCommand({
        TableName: POSTS_TABLE,
        Item: postItem
    });
    
    await docClient.send(command);
    
    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(postItem)
    };
}

async function toggleLike(event, postId) {
    const userId = "temp-user-id";
    
    // Check if like exists
    const getLikeCmd = new GetCommand({
        TableName: LIKES_TABLE,
        Key: { postId, userId }
    });
    
    const likeRes = await docClient.send(getLikeCmd);
    let increment = 1;
    
    if (likeRes.Item) {
        // Un-like
        await docClient.send(new DeleteCommand({
            TableName: LIKES_TABLE,
            Key: { postId, userId }
        }));
        increment = -1;
    } else {
        // Like
        await docClient.send(new PutCommand({
            TableName: LIKES_TABLE,
            Item: { postId, userId, createdAt: new Date().toISOString() }
        }));
    }
    
    // Update post likeCount
    await docClient.send(new UpdateCommand({
        TableName: POSTS_TABLE,
        Key: { id: postId },
        UpdateExpression: "ADD likeCount :inc",
        ExpressionAttributeValues: {
            ":inc": increment
        }
    }));
    
    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ postId, liked: increment === 1 })
    };
}

async function getComments(postId) {
    const command = new QueryCommand({
        TableName: COMMENTS_TABLE,
        IndexName: "PostIdIndex",
        KeyConditionExpression: "postId = :postId",
        ExpressionAttributeValues: {
            ":postId": postId
        }
    });
    
    const response = await docClient.send(command);
    
    let comments = response.Items || [];
    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(comments)
    };
}

async function addComment(event, postId) {
    const body = JSON.parse(event.body);
    const commentId = crypto.randomUUID();
    
    const commentItem = {
        id: commentId,
        postId: postId,
        text: body.text,
        createdAt: new Date().toISOString(),
        author: { name: "User" },
        authorId: "temp-user-id"
    };
    
    await docClient.send(new PutCommand({
        TableName: COMMENTS_TABLE,
        Item: commentItem
    }));
    
    // Update post commentCount
    await docClient.send(new UpdateCommand({
        TableName: POSTS_TABLE,
        Key: { id: postId },
        UpdateExpression: "ADD commentCount :inc",
        ExpressionAttributeValues: {
            ":inc": 1
        }
    }));
    
    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(commentItem)
    };
}
