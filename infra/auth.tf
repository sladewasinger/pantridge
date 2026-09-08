# The deployed API is private to each account; verified Google users can register.
resource "aws_cognito_user_pool" "owner" {
  name                     = local.name
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"
  admin_create_user_config { allow_admin_create_user_only = true }
  dynamic "lambda_config" {
    for_each = local.google_enabled ? [true] : []
    content {
      pre_sign_up          = aws_lambda_function.auth_guard[0].arn
      pre_token_generation = aws_lambda_function.auth_guard[0].arn
    }
  }
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  lifecycle { prevent_destroy = true }
}
resource "aws_cognito_user_pool_domain" "owner" {
  domain       = coalesce(var.auth_domain_prefix, "${local.name}-${data.aws_caller_identity.current.account_id}")
  user_pool_id = aws_cognito_user_pool.owner.id
}
resource "aws_cognito_user_pool_client" "web" {
  name                                 = "${local.name}-web"
  user_pool_id                         = aws_cognito_user_pool.owner.id
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = local.google_enabled ? [aws_cognito_identity_provider.google[0].provider_name] : ["COGNITO"]
  callback_urls                        = ["${local.url}/"]
  logout_urls                          = ["${local.url}/"]
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  refresh_token_validity               = 30
  access_token_validity                = 60
  id_token_validity                    = 60
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}
