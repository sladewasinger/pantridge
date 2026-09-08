# Optional Google sign-in

Guests use IndexedDB on their device. Google sign-in connects a separate kitchen to the existing JWT-protected API and DynamoDB table. Signing in is optional, and cached signed-in kitchens remain usable offline. Existing local food is never silently uploaded; export it and restore into an empty signed-in kitchen to migrate.

## Google Cloud setup

1. Create/select the Pantridge project in [Google Auth Platform](https://console.cloud.google.com/auth/overview). Configure the app name and your support/contact email. Choose an External audience to allow accounts outside your organization. For public release, set the app to In production. Pantridge requests only basic identity scopes (`openid email profile`); Google documents an exception to the Testing allowlist for these scopes.
2. Create an OAuth client with application type **Web application** and name **Pantridge**.
3. Add this authorized JavaScript origin:

```text
https://pantridge-personal-510682130762.auth.us-west-2.amazoncognito.com
```

4. Add this exact authorized redirect URI:

```text
https://pantridge-personal-510682130762.auth.us-west-2.amazoncognito.com/oauth2/idpresponse
```

The redirect goes to Cognito, which exchanges the Google code and redirects back to the app. If Google asks for authorized domains, use `amazoncognito.com` and `austinwasinger.com` as described in [AWS's social sign-in setup](https://docs.aws.amazon.com/cognito/latest/developerguide/tutorial-create-user-pool-social-idp.html).

5. Download the OAuth client JSON to the ignored local path `artifacts/google-oauth.json`. Do not commit the file or put the secret in a `VITE_` variable.

## Provision and publish

Google federation remains disabled until `google_client_id` is supplied. Terraform refuses Google configuration without its secret. For each plan/apply, load the downloaded credentials into the current PowerShell process:

```powershell
$googleOauthClient = (Get-Content -Raw -LiteralPath artifacts/google-oauth.json | ConvertFrom-Json).web
$env:TF_VAR_google_client_id = $googleOauthClient.client_id
$env:TF_VAR_google_client_secret = $googleOauthClient.client_secret
$env:AWS_PROFILE = 'terraform'
$env:TF_CLI_CONFIG_FILE = 'D:\repos\Pantridge\.tools\terraform.rc'
$env:TERRAFORM_BIN = 'D:\repos\Pantridge\.tools\terraform\terraform.exe'
```

Use the same credential inputs for future Terraform plans, or Terraform will propose disabling Google. The secret is marked sensitive, but Cognito's Terraform provider still stores it in Terraform state and saved plans. Keep those files private and backed up.

Run `pnpm check`, then Terraform format/validate/mocked tests. Build before planning so `artifacts/auth` exists. Save and review the plan before applying. Expected changes add the Google identity provider and a small Google identity-check Lambda with logging permissions, update this app's user-pool triggers and web client, and select Google in the frontend outputs. The existing user pool, database, API, storage bucket, and CDN must not be replaced. Publish with `pnpm deploy` after apply succeeds.

## Access and verification

The app client allows Google only when enabled. Public native signup stays disabled. Cognito maps Google's `email` and `email_verified`; the Google identity-check Lambda accepts any verified Google email and rejects unverified emails, native signup, and other providers. It runs before federated account creation and token issuance, including refresh. It has no database permissions and does not log personal details. Each kitchen is keyed by the authenticated Cognito subject, never by a caller-supplied email or account ID.

After configuration, test the actual Google round trip, two different Google accounts with separate kitchens, sync between two signed-in browsers, and offline changes followed by reconnection. Mocked trigger tests and the existing anonymous offline browser tests do not establish that Google federation or authenticated sync works in production.

References: [AWS Google federation](https://repost.aws/knowledge-center/cognito-google-social-identity-provider), [Google OAuth client setup](https://developers.google.com/identity/protocols/oauth2/web-server), [Cognito pre-signup](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html), [Cognito pre-token generation](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html).
