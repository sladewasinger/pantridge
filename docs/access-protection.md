# Cloud access and cost protection

Device-only use stays open and offline edits remain in IndexedDB. Google sign-in reserves one of 100 configurable cloud slots. Existing users are seeded before enforcement; repeat sign-in does not consume another slot. The verified Cognito subject owns each kitchen. There is no email allowlist.

## Limits

Configure `max_users`, `api_enabled`, and `access_limits` in the ignored Terraform variables file, then review and apply Terraform manually. GitHub deploys application code only.

| Boundary                                          |                        Default | Outcome                                               |
| ------------------------------------------------- | -----------------------------: | ----------------------------------------------------- |
| Admitted Google identities                        |                            100 | Further sign-ins denied; existing users retain access |
| Requests per account per minute                   |                            240 | Short cooldown, no immediate suspension               |
| Requests per account per minute before suspension |                  More than 600 | Cloud account suspended                               |
| Repeated over-limit minutes                       |  3 in a fixed 10-minute window | Cloud account suspended                               |
| Malformed requests                                | 10 in a fixed 10-minute window | Cloud account suspended                               |
| Requests per account per UTC day                  |                         10,000 | Pause until the next UTC day                          |
| Requests across the app per UTC day               |                        100,000 | Pause until the next UTC day                          |
| Estimated kitchen write units per UTC day         |                      1,000,000 | Pause writes until the next UTC day                   |
| API Gateway                                       |   15 requests/second, burst 30 | Aggregate throttle                                    |

Ordinary conflicts, missing barcode results, and product-provider cooldowns are not malformed-request strikes. A test exercises 200 requests in a minute without suspension or throttling. Request counters use atomic DynamoDB updates; kitchen write reservations account for snapshot size and transactional writes, including failed attempts. Limits use fixed time windows, not sliding windows.

Sync retains its outbox, honors server cooldowns, and commits partial batch acknowledgments before retrying. Each batch sends at most 20 pending edits. Visible idle clients poll every five minutes, and background clients stop polling. Local editing remains available when cloud work is paused.

Product lookup and AI have separate pre-existing quotas described in [barcode scanning](barcode-scanning.md). Exhausting those quotas does not suspend an account. AI may fall back to free classification rules. These protections do not make paid classification unlimited.

## First deployment

Build and test first. Review a targeted Terraform plan for `aws_dynamodb_table.access` and apply it to create only the new access table. Seed existing users before deploying enforcement:

```powershell
node scripts/access.mjs seed-existing --table pantridge-personal-access --region us-west-2 --profile terraform --pool us-west-2_xks00OUPC
node scripts/access.mjs probe --table pantridge-personal-access --region us-west-2 --profile terraform
```

The probe uses temporary identities, exercises atomic capacity, cooldown, suspension, recovery, and write reservations against DynamoDB, then removes its identities and capacity reservations. Its short-lived request counters expire. It does not modify inventory or call OpenAI. Next, review a fresh full Terraform plan and apply it. Never deploy the new handler before its table and permissions exist.

## Owner recovery

Run these locally with owner AWS credentials, using the deployment's actual table, region, and profile:

```powershell
node scripts/access.mjs list --table pantridge-personal-access --region us-west-2 --profile terraform
node scripts/access.mjs resume --owner VERIFIED_SUBJECT --table pantridge-personal-access --region us-west-2 --profile terraform
node scripts/access.mjs suspend --owner VERIFIED_SUBJECT --table pantridge-personal-access --region us-west-2 --profile terraform
```

Suspension blocks API access even with an existing token and blocks new Cognito tokens. It preserves inventory and device data. Resume clears current abuse counters but does not refund daily usage. The client backs off after a suspension; reload after restoring access to retry immediately.

Suspended identities retain their capacity slot. An interrupted first sign-in can reserve a slot before account binding. Release only an inspected, unbound reservation with `release-reservation --identity Google_EXACT_ID` and the same table/region/profile arguments. This command refuses to release an admitted account. Lowering the cap does not evict existing users. Account deletion and slot reclamation for admitted accounts require a future coordinated data-deletion flow.

Set `api_enabled = false` and manually apply Terraform for an emergency cloud pause. Local use continues. A CloudWatch metric and alarm record `AccountSuspended`; no email/SNS destination is configured.

## Operational limits

This is layered cost protection, not an absolute AWS bill cap. Rejected public traffic can still incur gateway, logging, authentication, Lambda, and counter costs. AWS throttling is best effort. DynamoDB throughput caps bound each app table; they can slow legitimate traffic during an attack. Existing inventory and product storage continue to incur storage and backup charges. Review account billing alerts separately.

`lambda_concurrency` optionally reserves API/auth capacity; `-1` uses the shared pool. This deployment's AWS account has only 10 shared Lambda slots, so reservations remain disabled: AWS requires leaving 100 unreserved slots when setting reservations. No account quota or other application's resources are changed. See [AWS concurrency documentation](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html) and [HTTP API throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html).

Future paid tiers should use server-owned entitlements and bounded provider budgets. Client-supplied plans, model names, or account IDs must never bypass these checks.
