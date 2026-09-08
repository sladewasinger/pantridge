mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/pantridge-test-api" }
  }
  mock_resource "aws_cloudfront_distribution" {
    defaults = { domain_name = "d123example.cloudfront.net", hosted_zone_id = "Z2FDTNDATAQYW2", arn = "arn:aws:cloudfront::123456789012:distribution/EXAMPLE" }
  }
  mock_resource "aws_dynamodb_table" {
    defaults = { arn = "arn:aws:dynamodb:us-west-2:123456789012:table/pantridge-test-kitchen" }
  }
  mock_resource "aws_s3_bucket" {
    defaults = { arn = "arn:aws:s3:::pantridge-test", bucket_regional_domain_name = "pantridge-test.s3.us-west-2.amazonaws.com" }
  }
  mock_resource "aws_lambda_function" {
    defaults = { arn = "arn:aws:lambda:us-west-2:123456789012:function:pantridge-test-api", invoke_arn = "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:123456789012:function:pantridge-test-api/invocations" }
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
run "google_accounts_are_verified" {
  command = plan
  override_resource {
    target          = aws_lambda_function.auth_guard[0]
    override_during = plan
    values = { arn = "arn:aws:lambda:us-west-2:123456789012:function:pantridge-test-auth-guard" }
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

