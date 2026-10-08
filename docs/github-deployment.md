# Branches and automatic deployment

Start feature branches from `develop`, open a pull request into `develop`, then promote `develop` to `main` through a pull request. Pushes to `develop` and pull requests targeting it run only unit tests and a build. They receive no AWS credentials and do not deploy. Run the full local checks before promotion.

Only pushes to `main` trigger Deploy. It first calls Quality for the full checks, browser tests, dependency audit, and mocked Terraform tests. Deploy then builds the production frontend and Lambda bundles, runs the mobile browser tests, and only then requests AWS credentials. It updates the API, identity-check and classification functions, publishes the site through the service-worker barriers below, and waits for CloudFront. Runs are serialized to avoid overlapping production updates.

## AWS connection

The one-time, manually applied Terraform setup in `infra/github.tf` reuses the account's existing GitHub OIDC provider and creates `pantridge-personal-github-deploy`. Its trust policy accepts only `sladewasinger/pantridge` on `refs/heads/main`. The GitHub repository variable `AWS_DEPLOY_ROLE_ARN` points to this role; there are no long-lived AWS access keys in GitHub.

The role can upload to this app's S3 bucket, create and read invalidations for this CloudFront distribution, and update code for the API, Google identity-check and classification functions. It cannot edit IAM, Cognito, DynamoDB, DNS, or Lambda configuration. Terraform state and the Google client secret are not available to the workflow.

Set `github_subject_prefix` to the exact `sub_claim_prefix` from `gh api repos/OWNER/REPO/actions/oidc/customization/sub`. This repository uses `repo:sladewasinger@16869873/pantridge@1361257244`; the role appends `:ref:refs/heads/main`. Numeric IDs are part of GitHub's issued identity, as verified in CloudTrail. Do not replace this with a wildcard or grant other repositories access.

## Manual infrastructure changes

Terraform remains manual. Load the Google OAuth inputs as described in `google-sign-in.md`, build the bundles, review a saved plan, and apply it locally. The workflow never runs a Terraform apply. Quality runs only format, validation, and mocked infrastructure tests.

`config/production.json` contains public deployment destinations and frontend settings. Update it from the corresponding Terraform outputs when infrastructure names or endpoints change; never export raw state or provider credentials there. Local `pnpm deploy` reads Terraform outputs unless `PANTRIDGE_DEPLOY_CONFIG` points to this file. GitHub uses the file so it does not need state access.

`node scripts/build-release.mjs` builds with that configuration. `node scripts/deploy.mjs --built --api` publishes a previously tested build and zipped functions. Terraform uses bundles for initial function creation and ignores later source-code hash changes, so a manual infrastructure/configuration apply cannot overwrite application releases with a local build. Code updates go through the main-branch workflow.

Branch protection can require `test-build` for pull requests into `develop` and require a pull request for `main`. Quality runs after a merge to `main` and gates deployment; do not require that post-merge check on a promotion PR, where it does not run. Review infrastructure changes separately. Keep the API backward-compatible with installed PWA versions that might remain offline across a release.

## Service-worker publication

Upload hashed assets and static files first, excluding `index.html` and `sw.js`. Publish HTML, invalidate `/*`, and wait for completion before uploading the new worker. Then invalidate `/sw.js` and wait again. Merely uploading the worker last is insufficient while CloudFront can still serve the previous HTML. A failed first barrier withholds the new worker; a failed final barrier fails the deployment rather than reporting success. The two standard AWS CLI waiters are bounded, and the deployment job has 30 minutes for both barriers plus its build checks. Browser and provider timeouts are unchanged.

Manually apply the distribution-scoped `cloudfront:GetInvalidation` permission in `infra/github.tf` before releasing this publication script. It adds observation of application invalidations only; the deployment role still cannot change infrastructure. No CDN configuration change is required.

Each Vite build inserts a new `pantridge-build` HTML meta value before Workbox generates its precache manifest. The value stays fixed within that build and is preserved when deploying with `--built`. This gives even an application-code-identical rebuild a new HTML revision. It also lets the next release recover a worker that previously cached old HTML under a newer revision, without clearing IndexedDB, kitchens, sign-in state, or offline data.

`tests/e2e/pwa/updates.spec.ts` serves the production-built app and its generated Workbox worker on an isolated loopback origin. It tests a delayed installation prompt, the real Update button, retained shopping data during update and origin outage, and recovery from deliberately publishing a worker before its HTML. Deployment unit tests separately enforce both CDN barriers and failure behavior. The unsafe order was reproduced locally; that does not establish the cause of any particular installed production client's stale banner. Inspect its active/waiting worker and cached HTML to distinguish that from ordinary installation delay.
