# AWS Cognito + Google OAuth Setup Guide

## What Was Fixed

### 1. Environment Variables
- ✅ Added trailing slashes to redirect URLs (`http://localhost:8080/`)
- ✅ All required Cognito parameters are configured
- ✅ Google OAuth domain is properly set

### 2. Amplify Configuration (`src/lib/amplify.ts`)
- ✅ Added `isGoogleAuthConfigured` export to check if Google OAuth is ready
- ✅ Improved OAuth configuration with better logging
- ✅ Added console warnings for missing configuration

### 3. Authentication Library (`src/lib/auth.ts`)
- ✅ Added validation for Google auth configuration
- ✅ Throws clear error if Google OAuth is not configured
- ✅ Imports `isGoogleAuthConfigured` from amplify config

## Current Configuration

```env
VITE_COGNITO_REGION=ap-southeast-2
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_cT3TFrC3N
VITE_COGNITO_USER_POOL_CLIENT_ID=3mpt0uof8397sd7ebjq475gqkc
VITE_COGNITO_DOMAIN=ap-southeast-2ct3tfrc3n.auth.ap-southeast-2.amazoncognito.com
VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:8080/
VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:8080/
```

## AWS Cognito Setup Checklist

### ⚠️ CRITICAL: App Client Secret Issue

**Current Error:** `Client is configured with secret but SECRET_HASH was not received`

**Problem:** Your current app client (`3mpt0uof8397sd7ebjq475gqkc`) has a client secret, but frontend apps cannot use client secrets securely.

**Solution:** Create a new App Client WITHOUT a client secret:

1. Go to AWS Cognito Console → User Pool `ap-southeast-2_cT3TFrC3N`
2. Navigate to **App Integration** → **App clients**
3. Click **Create app client**
4. Configure:
   - **App client name**: `nutrinani-web-client`
   - **Client secret**: ❌ **UNCHECK** "Generate a client secret"
   - **Authentication flows**: 
     - ✅ ALLOW_USER_SRP_AUTH
     - ✅ ALLOW_REFRESH_TOKEN_AUTH
   - **OAuth 2.0 grant types**: 
     - ✅ Authorization code grant
   - **OAuth scopes**: 
     - ✅ openid
     - ✅ email  
     - ✅ profile
   - **Callback URLs**: `http://localhost:8080/`
   - **Sign-out URLs**: `http://localhost:8080/`
   - **Identity providers**: ✅ Google
5. Click **Create app client**
6. Copy the new **App client ID**
7. Update `.env` file: `VITE_COGNITO_USER_POOL_CLIENT_ID=<new-client-id>`
8. Restart your dev server

### In AWS Cognito Console:

1. **User Pool Settings**
   - ✅ User Pool ID: `ap-southeast-2_cT3TFrC3N`
   - ✅ Region: `ap-southeast-2`

2. **App Client Settings** (NEW CLIENT WITHOUT SECRET)
   - ⚠️ Create new App Client ID (without secret)
   - ⚠️ Ensure "Hosted UI" is enabled
   - ⚠️ Ensure OAuth 2.0 flows are enabled
   - ⚠️ **CRITICAL**: Do NOT generate a client secret

3. **Hosted UI Domain**
   - ✅ Domain: `ap-southeast-2ct3tfrc3n.auth.ap-southeast-2.amazoncognito.com`

4. **Callback URLs** (CRITICAL!)
   - ⚠️ Add: `http://localhost:8080/`
   - ⚠️ Add: `http://localhost:8080` (without trailing slash as backup)
   - For production: Add your production URL

5. **Sign-out URLs** (CRITICAL!)
   - ⚠️ Add: `http://localhost:8080/`
   - ⚠️ Add: `http://localhost:8080` (without trailing slash as backup)

6. **OAuth 2.0 Scopes**
   - ✅ `openid`
   - ✅ `email`
   - ✅ `profile`

7. **Identity Providers**
   - ⚠️ Ensure "Google" is added and configured
   - ⚠️ Google Client ID must be configured in Cognito
   - ⚠️ Google Client Secret must be configured in Cognito

### In Google Cloud Console:

1. **OAuth 2.0 Client**
   - ✅ Client ID: `1001817854202-de37d7vel9vkhi5d1u1fvs07mnpuj3hu.apps.googleusercontent.com`
   
2. **Authorized Redirect URIs** (CRITICAL!)
   - ⚠️ Add: `https://ap-southeast-2ct3tfrc3n.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse`
   - This is the Cognito domain + `/oauth2/idpresponse`

3. **Authorized JavaScript Origins**
   - ⚠️ Add: `http://localhost:8080`
   - For production: Add your production domain

## Testing the Setup

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   - Navigate to `http://localhost:8080/`
   - You should see the login page

3. **Test Google Sign-In:**
   - Click "Continue with Google" button
   - Should redirect to Cognito Hosted UI
   - Then redirect to Google login
   - After successful login, should redirect back to your app

## Troubleshooting

### Error: "Client is configured with secret but SECRET_HASH was not received"
- ❌ **CRITICAL**: Your app client has a client secret
- ✅ **FIX**: Create a new app client WITHOUT a client secret (see instructions above)
- Frontend apps (React/Vite) cannot securely use client secrets
- You MUST create a new app client without a secret

### Error: "Google auth params not configured"
- ✅ FIXED: Added proper validation in `auth.ts`
- Check that `VITE_COGNITO_DOMAIN` is set in `.env`
- Restart dev server after changing `.env`

### Error: "redirect_uri_mismatch"
- Check callback URLs in AWS Cognito match exactly
- Check authorized redirect URIs in Google Cloud Console
- Ensure trailing slashes match

### CSP Error in Console
- This is likely from a browser extension (not your app)
- Try disabling browser extensions or use incognito mode
- The error doesn't affect functionality

### OAuth Flow Not Working
1. Check AWS Cognito App Client settings:
   - OAuth flows enabled
   - Hosted UI enabled
   - Google identity provider linked
2. Check Google Cloud Console:
   - Redirect URI includes Cognito domain
   - OAuth consent screen configured
3. Clear browser cache and cookies
4. Check browser console for detailed errors

## How It Works

1. User clicks "Continue with Google"
2. App calls `signInWithGoogle()` from `auth.ts`
3. Amplify redirects to Cognito Hosted UI
4. Cognito redirects to Google login
5. User authenticates with Google
6. Google redirects back to Cognito with auth code
7. Cognito exchanges code for tokens
8. Cognito redirects back to your app at `http://localhost:8080/`
9. Amplify Hub listener detects sign-in event
10. App updates auth state and shows dashboard

## Next Steps

- [ ] Verify callback URLs in AWS Cognito Console
- [ ] Verify redirect URIs in Google Cloud Console
- [ ] Test the complete OAuth flow
- [ ] Add error handling for specific OAuth errors
- [ ] Configure production URLs when deploying
