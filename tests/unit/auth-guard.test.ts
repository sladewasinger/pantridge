import { describe, expect, it } from 'vitest';
import type { PreSignUpTriggerEvent, PreTokenGenerationTriggerEvent } from 'aws-lambda';
import { handler } from '../../api/auth-guard';

function signUp(): PreSignUpTriggerEvent {
  return {
    version: '1',
    region: 'us-west-2',
    userPoolId: 'test-pool',
    userName: 'Google_123456',
    callerContext: { awsSdkVersion: 'test', clientId: 'test-client' },
    triggerSource: 'PreSignUp_ExternalProvider',
    request: { userAttributes: { email: 'person@example.com', email_verified: 'true' } },
    response: { autoConfirmUser: false, autoVerifyEmail: false, autoVerifyPhone: false },
  };
}

describe('Google access', () => {
  it.each(['person@gmail.com', 'someone@example.com', 'another@example.org'])(
    'allows any verified Google email: %s',
    async (email) => {
      const event = signUp();
      event.request.userAttributes.email = email;
      expect(await handler(event)).toBe(event);
    },
  );
  it('rejects unverified or missing emails', async () => {
    const event = signUp();
    event.request.userAttributes.email_verified = 'false';
    await expect(handler(event)).rejects.toThrow('verified Google account');
    event.request.userAttributes.email_verified = 'true';
    delete event.request.userAttributes.email;
    await expect(handler(event)).rejects.toThrow('verified Google account');
  });
  it('rejects native signup and other providers', async () => {
    const event = signUp();
    event.userName = 'Facebook_123456';
    await expect(handler(event)).rejects.toThrow('verified Google account');
    event.userName = 'Google_123456';
    event.triggerSource = 'PreSignUp_SignUp';
    await expect(handler(event)).rejects.toThrow('verified Google account');
  });
  it.each(['TokenGeneration_HostedAuth', 'TokenGeneration_RefreshTokens'] as const)(
    'requires a verified Google identity during %s',
    async (triggerSource) => {
      const event: PreTokenGenerationTriggerEvent = {
        ...signUp(),
        triggerSource,
        request: {
          userAttributes: { email: 'anyone@example.com', email_verified: 'true' },
          groupConfiguration: {},
        },
        response: { claimsOverrideDetails: {} },
      };
      expect(await handler(event)).toBe(event);
      event.request.userAttributes.email_verified = 'false';
      await expect(handler(event)).rejects.toThrow('verified Google account');
    },
  );
});
