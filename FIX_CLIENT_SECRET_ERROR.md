# 🚨 URGENT: Fix Client Secret Error

## The Problem

```
Client 3mpt0uof8397sd7ebjq475gqkc is configured with secret but SECRET_HASH was not received
```

Your Cognito App Client has a **client secret**, but frontend applications (React/Vite) **cannot use client secrets** because:
- They run in the browser (client-side)
- Client secrets would be exposed in the JavaScript bundle
- This is a security risk

## The Solution

You **MUST** create a new App Client **WITHOUT** a client secret.

### Step-by-Step Instructions

#### 1. Go to AWS Cognito Console
- Navigate to: https://console.aws.amazon.com/cognito/
- Select region: **ap-southeast-2**
- Click on User Pool: **ap-southeast-2_cT3TFrC3N**

#### 2. Create New App Client
- Click **App Integration** (left sidebar)
- Scroll to **App clients and analytics**
- Click **Create app client**

#### 3. Configure the New App Client

**General settings:**
- **App client name**: `nutrinani-web-client` (or any name you prefer)
- **App type**: Select **Public client**

**Authentication flows:**
- ✅ ALLOW_USER_SRP_AUTH
- ✅ ALLOW_REFRESH_TOKEN_AUTH
- ❌ Do NOT check "Generate a client secret"

**OAuth 2.0 settings:**
- **Allowed OAuth Flows**:
  - ✅ Authorization code grant
- **Allowed OAuth Scopes**:
  - ✅ openid
  - ✅ email
  - ✅ profile

**Hosted UI settings:**
- **Allowed callback URLs**: 
  ```
  http://localhost:8080/
  ```
  (Add production URL later: `https://yourdomain.com/`)

- **Allowed sign-out URLs**: 
  ```
  http://localhost:8080/
  ```
  (Add production URL later: `https://yourdomain.com/`)

**Identity providers:**
- ✅ Google

#### 4. Save and Copy Client ID
- Click **Create app client**
- Copy the new **App client ID** (it will look like: `abc123xyz456...`)

#### 5. Update Your .env File

Replace the old client ID with the new one:

```env
# OLD (has secret - DO NOT USE)
# VITE_COGNITO_USER_POOL_CLIENT_ID=3mpt0uof8397sd7ebjq475gqkc

# NEW (no secret - USE THIS)
VITE_COGNITO_USER_POOL_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE
```

#### 6. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Verification

After restarting, you should see in the browser console:
```
Amplify configured successfully
Google OAuth configured with domain: ap-southeast-2ct3tfrc3n.auth.ap-southeast-2.amazoncognito.com
```

And the error should be gone! ✅

## Why This Happens

- **Backend apps** (Node.js, Python, etc.) can use client secrets because they run on secure servers
- **Frontend apps** (React, Vue, Angular) run in the browser and cannot securely store secrets
- AWS Cognito requires different app client configurations for each type

## Additional Notes

### About the CSP Error
The Content Security Policy error you're seeing:
```
Evaluating a string as JavaScript violates the following Content Security Policy directive...
```

This is likely from a **browser extension** (not your app). It doesn't affect functionality. To verify:
- Try opening your app in **Incognito/Private mode**
- Or temporarily disable browser extensions

### Testing Google Sign-In

Once you've updated the client ID:

1. Open `http://localhost:8080/`
2. Click **"Continue with Google"**
3. You should be redirected to Cognito Hosted UI
4. Then to Google login
5. After login, redirected back to your app

If you get a redirect error, double-check:
- Callback URLs in Cognito match exactly (including trailing slash)
- Google Cloud Console has the Cognito redirect URI configured

## Need Help?

If you still see errors after creating the new app client:
1. Check browser console for specific error messages
2. Verify all callback URLs match exactly
3. Clear browser cache and cookies
4. Try incognito mode to rule out extension issues
