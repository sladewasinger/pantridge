# Branches and automatic deployment

Start feature branches from `develop`, open a pull request into `develop`, then promote `develop` to `main` through a pull request. Pushes to `develop` and pull requests targeting it run only unit tests and a build. They receive no AWS credentials and do not deploy. Run the full local checks before promotion.

Only pushes to `main` trigger Deploy. It first calls Quality for the full checks, browser tests, dependency audit, and mocked Terraform tests. Deploy then builds the production frontend and Lambda bundles, runs the mobile browser tests on that build, and only then requests AWS credentials. It updates the two application functions, uploads web assets, publishes HTML last, and invalidates Pantridge's CloudFront distribution. Runs are serialized to avoid overlapping production updates.

## AWS connection

The one-time, manually applied Terraform setup in `infra/github.tf` reuses the account's existing GitHub OIDC provider and creates `pantridge-personal-github-deploy`. Its trust policy accepts only `sladewasinger/pantridge` on `refs/heads/main`. The GitHub repository variable `AWS_DEPLOY_ROLE_ARN` points to this role; there are no long-lived AWS access keys in GitHub.

The role can upload to this app's S3 bucket, invalidate this CloudFront distribution, and update code for the API and Google identity-check functions. It cannot edit IAM, Cognito, DynamoDB, DNS, or Lambda configuration. Terraform state and the Google client secret are not available to the workflow.

Set `github_subject_prefix` to the exact `sub_claim_prefix` from `gh api repos/OWNER/REPO/actions/oidc/customization/sub`. This repository uses `repo:sladewasinger@16869873/pantridge@1361257244`; the role appends `:ref:refs/heads/main`. Numeric IDs are part of GitHub's issued identity, as verified in CloudTrail. Do not replace this with a wildcard or grant other repositories access.

## Manual infrastructure changes

Terraform remains manual. Load the Google OAuth inputs as described in `google-sign-in.md`, build the bundles, review a saved plan, and apply it locally. The workflow never runs a Terraform apply. Quality runs only format, validation, and mocked infrastructure tests.

`config/production.json` contains public deployment destinations and frontend settings. Update it from the corresponding Terraform outputs when infrastructure names or endpoints change; never export raw state or provider credentials there. Local `pnpm deploy` reads Terraform outputs unless `PANTRIDGE_DEPLOY_CONFIG` points to this file. GitHub uses the file so it does not need state access.

`node scripts/build-release.mjs` builds with that configuration. `node scripts/deploy.mjs --built --api` publishes a previously tested build and zipped functions. Routine application deployments update code only; a later manual Terraform plan may reconcile bundle hashes without requiring infrastructure replacement.

Branch protection can require `test-build` for pull requests into `develop` and require a pull request for `main`. Quality runs after a merge to `main` and gates deployment; do not require that post-merge check on a promotion PR, where it does not run. Review infrastructure changes separately. Keep the API backward-compatible with installed PWA versions that might remain offline across a release.
