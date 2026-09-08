output "app_url" { value = local.url }
output "web_bucket" { value = aws_s3_bucket.web.id }
output "distribution_id" { value = aws_cloudfront_distribution.web.id }
output "user_pool_id" { value = aws_cognito_user_pool.owner.id }
output "aws_account_id" { value = data.aws_caller_identity.current.account_id }
output "certificate_validation_records" {
  description = "Add these CNAME records at your DNS provider when using external DNS. Keep them for certificate renewal."
  value = local.custom ? [for option in aws_acm_certificate.web[0].domain_validation_options : {
    type  = option.resource_record_type
    name  = option.resource_record_name
    value = option.resource_record_value
  }] : []
}
output "application_dns_record" {
  description = "External-DNS record for this app only; existing root-domain and mail records are not changed."
  value = local.custom && !local.manage_dns ? {
    type  = "CNAME"
    name  = var.domain_name
    value = aws_cloudfront_distribution.web.domain_name
  } : null
}
output "frontend_environment" {
  value = {
    VITE_API_URL           = aws_apigatewayv2_api.api.api_endpoint
    VITE_AUTHORITY         = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.owner.id}"
    VITE_CLIENT_ID         = aws_cognito_user_pool_client.web.id
    VITE_AUTH_DOMAIN       = "https://${aws_cognito_user_pool_domain.owner.domain}.auth.${var.region}.amazoncognito.com"
    VITE_IDENTITY_PROVIDER = local.google_enabled ? "Google" : ""
  }
}
