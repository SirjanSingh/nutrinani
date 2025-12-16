import { Amplify } from 'aws-amplify';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
const cognitoDomain = import.meta.env.VITE_COGNITO_COGNITO_DOMAIN;
const region = import.meta.env.VITE_COGNITO_REGION || 'ap-south-1';
const redirectSignIn = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN || window.location.origin + '/';
const redirectSignOut = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT || window.location.origin + '/';

export const isAmplifyConfigured = !!(userPoolId && userPoolClientId);

export function configureAmplify() {
  if (!isAmplifyConfigured) {
    console.warn('Amplify not configured: Missing VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_USER_POOL_CLIENT_ID');
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: cognitoDomain ? {
          oauth: {
            domain: cognitoDomain,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [redirectSignIn],
            redirectSignOut: [redirectSignOut],
            responseType: 'code',
          },
        } : undefined,
      },
    },
  });
}
