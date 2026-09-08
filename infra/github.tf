variable "github_repository" {
  description = "GitHub owner/repository allowed to deploy application code from main. Null disables the deployment role."
  type        = string
  default     = null
  validation {
    condition     = var.github_repository == null || can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Use owner/repository."
  }
}
variable "github_subject_prefix" {
  description = "Exact sub_claim_prefix reported by GitHub's repository OIDC API. Supports immutable owner/repository IDs."
  type        = string
  default     = null
  validation {
    condition     = var.github_subject_prefix == null || can(regex("^repo:[A-Za-z0-9_.-]+(@[0-9]+)?/[A-Za-z0-9_.-]+(@[0-9]+)?$", var.github_subject_prefix))
    error_message = "Use the exact repo:owner/repository prefix, optionally including numeric IDs."
  }
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.github_repository == null ? 0 : 1
  arn   = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}
resource "aws_iam_role" "github_deploy" {
  count = var.github_repository == null ? 0 : 1
  name  = "${local.name}-github-deploy"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect    = "Allow", Action = "sts:AssumeRoleWithWebIdentity",
    Principal = { Federated = data.aws_iam_openid_connect_provider.github[0].arn },
    Condition = { StringEquals = {
      "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub" = "${coalesce(var.github_subject_prefix, "repo:${var.github_repository}")}:ref:refs/heads/main"
    } }
  }] })
}
resource "aws_iam_role_policy" "github_deploy" {
  count = var.github_repository == null ? 0 : 1
  role  = aws_iam_role.github_deploy[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["s3:ListBucket"], Resource = aws_s3_bucket.web.arn },
    { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = "${aws_s3_bucket.web.arn}/*" },
    { Effect = "Allow", Action = ["cloudfront:CreateInvalidation"], Resource = aws_cloudfront_distribution.web.arn },
    { Effect = "Allow", Action = ["lambda:UpdateFunctionCode", "lambda:GetFunctionConfiguration"], Resource = concat([aws_lambda_function.api.arn], aws_lambda_function.auth_guard[*].arn) }
  ] })
}
output "github_deploy_role_arn" {
  value = var.github_repository == null ? null : aws_iam_role.github_deploy[0].arn
}
output "application_functions" {
  value = merge(
    { (aws_lambda_function.api.function_name) = "artifacts/api.zip" },
    local.google_enabled ? { (aws_lambda_function.auth_guard[0].function_name) = "artifacts/auth.zip" } : {}
  )
}
