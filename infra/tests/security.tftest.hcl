mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/pantridge-test-api" }
  }
  mock_resource "aws_cloudfront_distribution" {
    override_during = plan
    defaults        = { domain_name = "d123example.cloudfront.net", hosted_zone_id = "Z2FDTNDATAQYW2", arn = "arn:aws:cloudfront::123456789012:distribution/EXAMPLE" }
  }
  mock_resource "aws_dynamodb_table" {
    override_during = plan
    defaults        = { arn = "arn:aws:dynamodb:us-west-2:123456789012:table/pantridge-test-kitchen" }
  }
  mock_resource "aws_s3_bucket" {
    override_during = plan
    defaults        = { arn = "arn:aws:s3:::pantridge-test", bucket_regional_domain_name = "pantridge-test.s3.us-west-2.amazonaws.com" }
  }
  mock_resource "aws_lambda_function" {
    override_during = plan
    defaults        = { arn = "arn:aws:lambda:us-west-2:123456789012:function:pantridge-test-api", invoke_arn = "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123456789012:function:pantridge-test-api/invocations" }
  }
  mock_resource "aws_cognito_user_pool" {
    defaults = { arn = "arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_test" }
  }
  mock_resource "aws_apigatewayv2_api" {
    defaults = { execution_arn = "arn:aws:execute-api:us-west-2:123456789012:example", api_endpoint = "https://example.execute-api.us-west-2.amazonaws.com" }
  }
  mock_resource "aws_cloudwatch_log_group" {
    defaults = { arn = "arn:aws:logs:us-west-2:123456789012:log-group:/aws/lambda/pantridge-test-api" }
  }
}
mock_provider "aws" { alias = "edge" }
run "github_deploy_is_main_only" {
  command = plan
  variables {
    github_repository     = "example/pantridge"
    github_subject_prefix = "repo:example@123/pantridge@456"
  }
  override_data {
    target = data.aws_iam_openid_connect_provider.github[0]
    values = { arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" }
  }
  assert {
    condition     = jsondecode(aws_iam_role.github_deploy[0].assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:example@123/pantridge@456:ref:refs/heads/main"
    error_message = "Only the selected repository's main branch may deploy."
  }
  assert {
    condition     = alltrue([for statement in jsondecode(aws_iam_role_policy.github_deploy[0].policy).Statement : alltrue([for action in statement.Action : contains(["s3:ListBucket", "s3:GetObject", "s3:PutObject", "cloudfront:CreateInvalidation", "lambda:UpdateFunctionCode", "lambda:GetFunctionConfiguration"], action)])])
    error_message = "Deployment must only publish application code, without infrastructure or data permissions."
  }
}
run "google_accounts_are_verified" {
  command = plan
  override_resource {
    target          = aws_lambda_function.auth_guard[0]
    override_during = plan
    values          = { arn = "arn:aws:lambda:us-west-2:123456789012:function:pantridge-test-auth-guard" }
  }
  variables {
    google_client_id     = "123456-example.apps.googleusercontent.com"
    google_client_secret = "test-secret-never-used"

  }
  assert {
    condition     = aws_cognito_user_pool_client.web.supported_identity_providers == toset(["Google"])
    error_message = "The Google configuration must not allow password sign-in."
  }
  assert {
    condition     = aws_cognito_user_pool.owner.lambda_config[0].pre_sign_up == aws_lambda_function.auth_guard[0].arn && aws_cognito_user_pool.owner.lambda_config[0].pre_token_generation == aws_lambda_function.auth_guard[0].arn
    error_message = "Google identity must be checked during both account creation and token generation."
  }
  assert {
    condition     = aws_cognito_identity_provider.google[0].attribute_mapping["email_verified"] == "email_verified"
    error_message = "Google email verification must be mapped."
  }
  assert {
    condition     = output.frontend_environment.VITE_IDENTITY_PROVIDER == "Google" && !contains(keys(output.frontend_environment), "VITE_GOOGLE_CLIENT_SECRET")
    error_message = "The frontend must select Google without receiving OAuth secrets."
  }
}
run "google_requires_secret" {
  command = plan
  variables {
    google_client_id = "123456-example.apps.googleusercontent.com"
  }
  expect_failures = [aws_cognito_identity_provider.google]
}
run "external_dns_is_isolated" {
  command = plan
  variables {
    domain_name     = "pantridge.example.com"
    route53_zone_id = null
    aws_account_id  = "123456789012"
    aws_profile     = null
  }
  assert {
    condition     = length(aws_route53_record.web) == 0 && length(aws_route53_record.certificate) == 0
    error_message = "External DNS deployments must not create or modify Route53 records."
  }
  assert {
    condition     = aws_acm_certificate.web[0].domain_name == "pantridge.example.com" && aws_cloudfront_distribution.web.aliases == toset(["pantridge.example.com"])
    error_message = "The certificate and CDN must be limited to the requested hostname."
  }
}
run "private_by_default" {
  command = plan
  assert {
    condition     = alltrue([for route in aws_apigatewayv2_route.api : route.authorization_type == "JWT" && contains(route.authorization_scopes, "openid")])
    error_message = "Every API route must require an access token."
  }
  assert {
    condition     = aws_cognito_user_pool.owner.admin_create_user_config[0].allow_admin_create_user_only
    error_message = "Public signup must be disabled."
  }
  assert {
    condition     = aws_s3_bucket_public_access_block.web.block_public_policy && aws_s3_bucket_public_access_block.web.restrict_public_buckets
    error_message = "The website bucket must be private."
  }
  assert {
    condition     = aws_dynamodb_table.kitchen.deletion_protection_enabled && aws_dynamodb_table.kitchen.point_in_time_recovery[0].enabled
    error_message = "Inventory must have deletion protection and recovery enabled."
  }
}

run "scanner_is_authenticated_and_ai_is_opt_in" {
  command = plan
  variables {
    classifier_provider          = "none"
    classifier_reasoning_effort  = null
    classifier_max_output_tokens = 200
  }
  assert {
    condition     = aws_apigatewayv2_route.api["POST /v1/products/resolve"].authorization_type == "JWT" && aws_lambda_function.api.environment[0].variables["CLASSIFIER_PROVIDER"] == "none"
    error_message = "Barcode lookup must require authentication, with paid AI disabled by default."
  }
  assert {
    condition     = aws_dynamodb_table.products.ttl[0].enabled && length(jsondecode(aws_iam_role_policy.products.policy).Statement) == 1
    error_message = "Cache must expire and rules-only mode must not have secret access."
  }
}
run "classifier_key_access_is_narrow" {
  command = plan
  variables { classifier_provider = "openai" }
  assert {
    condition     = jsondecode(aws_iam_role_policy.products.policy).Statement[1].Action == ["ssm:GetParameter"] && endswith(jsondecode(aws_iam_role_policy.products.policy).Statement[1].Resource, ":parameter/pantridge-personal/classifier/api-key")
    error_message = "AI may read only its dedicated provider key, never a wildcard parameter path."
  }
}
run "luna_low_configuration" {
  command = plan
  variables {
    classifier_provider          = "openai"
    classifier_model             = "gpt-5.6-luna"
    classifier_reasoning_effort  = "low"
    classifier_max_output_tokens = 1024
  }
  assert {
    condition     = aws_lambda_function.api.environment[0].variables["CLASSIFIER_MODEL"] == "gpt-5.6-luna" && aws_lambda_function.api.environment[0].variables["CLASSIFIER_REASONING_EFFORT"] == "low" && aws_lambda_function.api.environment[0].variables["CLASSIFIER_MAX_OUTPUT_TOKENS"] == "1024"
    error_message = "The selected Luna model, reasoning effort and token cap must reach Lambda."
  }
}


run "bounded_cloud_access" {
  command = plan
  assert {
    condition     = aws_lambda_function.api.environment[0].variables["MAX_USERS"] == "100" && aws_lambda_function.api.environment[0].variables["USER_REQUESTS_PER_MINUTE"] == "240"
    error_message = "Reserve 100 slots and permit normal cart activity."
  }
  assert {
    condition     = aws_dynamodb_table.access.deletion_protection_enabled && aws_dynamodb_table.access.ttl[0].enabled && aws_dynamodb_table.access.on_demand_throughput[0].max_write_request_units == 100
    error_message = "Admission state must be protected and transient counters must expire with bounded throughput."
  }
  assert {
    condition     = aws_lambda_function.api.reserved_concurrent_executions == -1 && aws_apigatewayv2_stage.api.default_route_settings[0].throttling_rate_limit == 15
    error_message = "Respect low-quota shared Lambda accounts and bound gateway traffic."
  }
  assert {
    condition     = jsondecode(aws_iam_role_policy.access.policy).Statement[0].Resource == aws_dynamodb_table.access.arn && contains(aws_apigatewayv2_api.api.cors_configuration[0].expose_headers, "retry-after")
    error_message = "Keep access policy scoped and allow clients to honor cooldowns."
  }
}
run "configurable_capacity_and_emergency_pause" {
  command = plan
  variables {
    max_users     = 150
    api_enabled   = false
    access_limits = { requests_per_minute = 300, suspend_per_minute = 900 }
  }
  assert {
    condition     = aws_lambda_function.api.environment[0].variables["MAX_USERS"] == "150" && aws_lambda_function.api.environment[0].variables["API_ENABLED"] == "false" && aws_lambda_function.api.environment[0].variables["ABUSE_REQUESTS_PER_MINUTE"] == "900"
    error_message = "Capacity, pause and abuse thresholds must be configurable."
  }
}
run "reject_invalid_limits" {
  command = plan
  variables {
    max_users     = 0
    access_limits = { requests_per_minute = 500, suspend_per_minute = 100 }
  }
  expect_failures = [var.max_users, var.access_limits]
}

