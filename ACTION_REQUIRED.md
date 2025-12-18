# 🚨 ACTION REQUIRED: Fix Authentication Error

## Current Error

```
POST https://cognito-idp.ap-southeast-2.amazonaws.com/ 400 (Bad Request)
Client 3mpt0uof8397sd7ebjq475gqkc is configured with secret but SECRET_HASH was not received
```

## What This Means

Your current Cognito App Client (`3mpt0uof8397sd7ebjq475gqkc`) has a **client secret**, which **CANNOT** be used in frontend applications like React/Vite because:

1. Frontend code runs in the browser (client-side)
2. Client secrets would be exposed in the JavaScript bundle
3. This is a major security risk
4. AWS Cognito requires different configurations for frontend vs backend apps

## What You MUST Do Now

### Step 1: Create New App Client in AWS Cognito

1. **Open AWS Cognito Console**
   - URL: https://console.aws.amazon.com/cognito/
   - Region: **ap-southeast-2**
   - User Pool: **ap-southeast-2_cT3TFrC3N**

2. **Navigate to App Clients**
   - Click **App Integration** in left sidebar
   - Scroll to **App clients and analytics**
   - Click **Create app client**

3. **Configure New App Client**

   **General Settings:**
   - App client name: `nutrinani-web-client`
   - App type: **Public client** (IMPORTANT!)
   
   **Authentication Flows:**
   - ✅ ALLOW_USER_SRP_AUTH
   - ✅ ALLOW_REFRESH_TOKEN_AUTH
   
   **Client Secret:**
   - ❌ **DO NOT CHECK** "Generate a client secret"
   - This is the most critical setting!
   
   **OAuth 2.0 Grant Types:**
   - ✅ Authorization code grant
   
   **OAuth 2.0 Scopes:**
   - ✅ openid
   - ✅ email
   - ✅ profile
   
   **Callback URLs:**
   ```
   http://localhost:8080/
   ```
   (Later add production URL: `https://yourdomain.com/`)
   
   **Sign-out URLs:**
   ```
   http://localhost:8080/
   ```
   (Later add production URL: `https://yourdomain.com/`)
   
   **Identity Providers:**
   - ✅ Google

4. **Create and Copy Client ID**
   - Click **Create app client**
   - Copy the new **App client ID**
   - It will look like: `abc123xyz456def789ghi012jkl345`

### Step 2: Update Your .env File

Open `.env` and replace the old client ID:

```env
# OLD CLIENT ID (has secret - DO NOT USE)
# VITE_COGNITO_USER_POOL_CLIENT_ID=3mpt0uof8397sd7ebjq475gqkc

# NEW CLIENT ID (no secret - USE THIS)
VITE_COGNITO_USER_POOL_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE
```

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C or Cmd+C)

# Restart
npm run dev
```

### Step 4: Test Authentication

1. Open `http://localhost:8080/`
2. Try to sign up with a new account
3. Use a password that meets requirements:
   - At least 8 characters
   - 1 number
   - 1 special character
   - 1 uppercase letter
   - 1 lowercase letter
   - Example: `Test123!abc`

## Improved Error Messages

I've updated the authentication code to show clearer error messages:

### If You Still See the Secret Error:
```
Authentication configuration error: Your Cognito app client has a secret, 
but frontend apps cannot use secrets. Please create a new app client 
WITHOUT a client secret in AWS Cognito Console.
```

### Other Helpful Error Messages:
- "Incorrect email or password" - Wrong credentials
- "User not found. Please sign up first." - Account doesn't exist
- "Please verify your email before signing in" - Email not confirmed
- "An account with this email already exists" - During signup
- "Password does not meet requirements" - Weak password

## Why Can't We Just Remove the Secret?

Unfortunately, AWS Cognito **does not allow** removing a client secret from an existing app client. You must create a new one. This is a security design decision by AWS.

## What About the Old App Client?

You can:
- Leave it (it won't interfere)
- Delete it after confirming the new one works
- Keep it for backend/server-side use if needed

## Verification Checklist

After completing the steps above, verify:

- [ ] Created new app client WITHOUT client secret
- [ ] Copied new client ID
- [ ] Updated `.env` file with new client ID
- [ ] Restarted dev server
- [ ] Can see login page at `http://localhost:8080/`
- [ ] No "SECRET_HASH" error in browser console
- [ ] Can create account with valid password
- [ ] Can sign in with created account

## Still Having Issues?

### Check Browser Console
Look for specific error messages that will help diagnose the issue.

### Verify Environment Variables
Make sure all these are set in `.env`:
```env
VITE_COGNITO_REGION=ap-southeast-2
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_cT3TFrC3N
VITE_COGNITO_USER_POOL_CLIENT_ID=<your-new-client-id>
VITE_COGNITO_DOMAIN=ap-southeast-2ct3tfrc3n.auth.ap-southeast-2.amazoncognito.com
VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:8080/
VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:8080/
```

### Clear Browser Cache
Sometimes old cached data can cause issues:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Try Incognito Mode
This rules out browser extensions or cached data causing issues.

## Related Documentation

- `FIX_CLIENT_SECRET_ERROR.md` - Detailed fix instructions
- `COGNITO_SETUP.md` - Complete Cognito setup guide
- `PASSWORD_VALIDATION.md` - Password requirements guide

## Timeline

This should take about **5-10 minutes** to complete:
- 3-5 min: Create new app client in AWS Console
- 1 min: Update `.env` file
- 1 min: Restart server
- 2-3 min: Test authentication

## Need Help?

If you're still stuck after following these steps, check:
1. AWS Cognito Console for any error messages
2. Browser console for detailed error logs
3. Network tab in DevTools to see the actual API responses
