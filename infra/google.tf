variable "google_client_id" {
  description = "Google OAuth web client ID. Null keeps the existing sign-in adapter."
  type        = string
  default     = null
  validation {
    condition     = var.google_client_id == null || can(regex("^[A-Za-z0-9-]+\\.apps\\.googleusercontent\\.com$", var.google_client_id))
    error_message = "Use the Google OAuth web client ID ending in .apps.googleusercontent.com."
  }
}
variable "google_client_secret" {
  description = "Google OAuth client secret, supplied privately at deployment. Stored in private Terraform state, never frontend outputs."
  type        = string
  sensitive   = true
  default     = null
}
locals {
  google_enabled = var.google_client_id != null
}
resource "aws_cognito_identity_provider" "google" {
  count         = local.google_enabled ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.owner.id
  provider_name = "Google"
  provider_type = "Google"
  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }
  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    username       = "sub"
  }
  lifecycle {
    # Cognito discovers these Google endpoints and returns them on every read.
    # Credentials, scopes, and attribute mappings remain managed by Terraform.
    ignore_changes = [
      provider_details["attributes_url"],
      provider_details["attributes_url_add_attributes"],
      provider_details["authorize_url"],
      provider_details["oidc_issuer"],
      provider_details["token_request_method"],
      provider_details["token_url"],
    ]
    precondition {
      condition     = try(length(trimspace(var.google_client_secret)) > 0, false)
      error_message = "Google sign-in requires its client secret."
    }
  }
}
output "google_redirect_uri" {
  description = "Register this exact authorized redirect URI on Google's OAuth web client."
  value       = "https://${aws_cognito_user_pool_domain.owner.domain}.auth.${var.region}.amazoncognito.com/oauth2/idpresponse"
}
