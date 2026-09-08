# AWS deployment

Domain, AWS profile, region, account ID, and final sign-in preference are configurable. The current deployment uses `pantridge.austinwasinger.com`, the `terraform` AWS profile, and `us-west-2`. Its DNS stays at Namecheap; AWS does not manage the existing domain records.

## Current deployment

Published on September 8, 2026 at https://pantridge.austinwasinger.com. The stack is isolated under `pantridge-personal`; its CloudFront distribution is `E2UWAV9C7BG4TE` (`d3embrxl3p37pg.cloudfront.net`). Both Namecheap CNAME records are in place, including the certificate renewal record.

Live checks passed for HTTPS, all three mobile browser tests (including offline inventory/shopping/put-away across reloads), the hosted sign-in page, unauthenticated API rejection, and a read-only Lambda-to-DynamoDB probe. The Lambda build includes a fresh-process ESM startup check to catch bundled dependency loading errors before upload.

Optional Google sign-in is deployed and open to any verified Google user. The live button reaches Google's account entry screen. Anonymous offline tests and account-isolation unit tests pass; the complete Google callback and authenticated cross-device sync still need verification with a real user's sign-in. See [Google setup](google-sign-in.md). Local device storage works immediately. Data from the localhost preview does not migrate automatically: export there and restore into an empty kitchen at the published origin.

## Provision

The stack creates a private S3 origin, CloudFront with HTTPS/security headers, an on-demand DynamoDB table with recovery/deletion protection, a Node Lambda, JWT-protected HTTP API routes, and an admin-provisioned Cognito pool. The default Cognito adapter is a replaceable starting point while the final sign-in choice is undecided. Public account signup is disabled.

1. Install AWS CLI and Terraform ≥1.10. Authenticate to the intended AWS account.
2. Copy `infra/terraform.tfvars.example` to `infra/terraform.tfvars`; fill in your region, profile, and intended 12-digit account ID. The account ID prevents Terraform from applying in another account. For a custom hostname, set `domain_name`. Leave `route53_zone_id = null` for external DNS such as Namecheap; supply an existing public Route53 zone ID only if AWS should manage the app's DNS records. With no custom hostname, use the generated CloudFront hostname.
3. Build, initialize, and inspect the plan:

```sh
pnpm install --frozen-lockfile
pnpm check
terraform -chdir=infra init
terraform -chdir=infra plan -out=pantridge.tfplan
terraform -chdir=infra show pantridge.tfplan
```

4. Review resource addresses and actions. A fresh deployment should only add Pantridge resources. For external DNS, complete the certificate bootstrap below before regenerating and applying the full plan. Otherwise, apply the reviewed plan:

```sh
terraform -chdir=infra apply pantridge.tfplan
```

Terraform defaults to local state. Keep that state private and backed up. For a shared deployment, configure an existing encrypted S3 state bucket and state locking before applying; backend credentials belong in the AWS credential chain, never in repository files. Deletion protection and `prevent_destroy` make removal an explicit maintenance operation.

CloudFront certificates are created in `us-east-1`; the data/API region comes from your settings. DNS creation is limited to the selected app hostname and certificate validation records. No existing domain records are overwritten with `allow_overwrite`.

## External DNS certificate bootstrap

CloudFront needs a validated certificate before it can use the custom hostname. Request just the certificate first to obtain its verification record without leaving a full apply waiting on manual DNS changes:

```sh
terraform -chdir=infra plan -target=aws_acm_certificate.web -out=certificate.tfplan
terraform -chdir=infra show certificate.tfplan
terraform -chdir=infra apply certificate.tfplan
terraform -chdir=infra output -json certificate_validation_records
```

This targeted apply is only for the initial certificate bootstrap. Add the returned CNAME at the domain's DNS provider. In Namecheap Advanced DNS, the Host field is relative to `austinwasinger.com`: remove that suffix from the record name, keep its leading underscore, and paste the full record value. Use Automatic TTL and retain this record for certificate renewal. Leave existing records and nameservers intact.

After DNS validation, regenerate the full plan: plans saved before the certificate apply are stale. Review and apply it to provision the remaining resources. Then read `terraform -chdir=infra output -json application_dns_record` and add its CNAME at Namecheap with Host `pantridge` and the returned CloudFront hostname as Value. Publish the frontend and verify HTTPS at the custom hostname.

## Publish the frontend

Use the same AWS account/profile for Terraform and the AWS CLI. `pnpm deploy` reads the applied Terraform outputs, builds the frontend with its API/OIDC endpoints, uploads hashed assets first, and publishes the HTML entry point last. It retains old hashed assets for already-open clients and invalidates CloudFront. It does not run `terraform apply` or create a user.

```sh
pnpm deploy
```

Set `AWS_PROFILE` for the CLI when using a named profile. `TERRAFORM_BIN` can select a Terraform executable outside PATH. The deploy script stops if neither Terraform outputs nor an explicit deployment configuration is available. Routine frontend and Lambda code deployments now run through the [main-branch GitHub workflow](github-deployment.md). Terraform remains manual for infrastructure changes. Local `pnpm deploy` publishes only the frontend unless `--api` is passed with packaged application functions.

## Enable the initial sign-in adapter

If choosing the prepared email/password adapter, provision the sole user after deployment:

```sh
aws cognito-idp admin-create-user --user-pool-id YOUR_POOL_ID --username YOU@example.com --user-attributes Name=email,Value=YOU@example.com Name=email_verified,Value=true
```

The pool ID is a Terraform output. Cognito sends its temporary sign-in instructions; passwords are never stored in Terraform. The app uses authorization code with PKCE and no client secret. Selecting Google or another provider later requires its provider configuration and credentials; none are fabricated here.

For a custom phone client later, add a separate public app client and callback URL rather than sharing a web client secret. Only authenticated requests with the required access-token scopes can reach the kitchen API.

## Verification and operations

- `terraform validate` and mocked Terraform tests need no AWS resource creation.
- On the real deployment, confirm sign-in, sync between two browsers, and an offline edit followed by reconnection. These live checks require your chosen account and credentials.
- CloudWatch retains API logs for 14 days. Logs omit food contents, tokens, and request bodies.
- Exported JSON backups supplement DynamoDB point-in-time recovery and browser persistence.
- AWS resources incur usage charges after applying; no resources run during local development.
