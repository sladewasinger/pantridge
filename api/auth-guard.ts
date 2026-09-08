import type { PreSignUpTriggerEvent, PreTokenGenerationTriggerEvent } from 'aws-lambda';

type AuthEvent = PreSignUpTriggerEvent | PreTokenGenerationTriggerEvent;

export async function handler(event: AuthEvent): Promise<AuthEvent> {
  const attributes = event.request.userAttributes;
  const email = attributes.email?.trim().toLowerCase();
  const googleUser = event.userName.startsWith('Google_');
  const allowedSource =
    event.triggerSource === 'PreSignUp_ExternalProvider' ||
    event.triggerSource === 'TokenGeneration_HostedAuth' ||
    event.triggerSource === 'TokenGeneration_RefreshTokens';

  if (!email || attributes.email_verified !== 'true' || !googleUser || !allowedSource) {
    throw new Error('Sign in with a verified Google account to use Pantridge sync.');
  }
  return event;
}
