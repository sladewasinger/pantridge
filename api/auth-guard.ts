import type { PreSignUpTriggerEvent, PreTokenGenerationTriggerEvent } from 'aws-lambda';
import { admitAccount, reserveIdentity } from './access/admission';

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
  if (event.triggerSource === 'PreSignUp_ExternalProvider') await reserveIdentity(event.userName);
  else {
    if (!attributes.sub) throw new Error('Google account subject is missing.');
    await admitAccount(attributes.sub, event.userName);
  }
  return event;
}
