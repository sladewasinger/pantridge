variable "region" {
  description = "AWS region for API, authentication, and storage. CloudFront certificates use us-east-1."
  type        = string
  default     = "us-west-2"
}
variable "aws_profile" {
  description = "Optional local AWS profile; null uses the standard AWS credential chain."
  type        = string
  default     = null
}
variable "aws_account_id" {
  description = "Optional account guard: refuse to plan or apply against any other AWS account."
  type        = string
  default     = null
  validation {
    condition     = var.aws_account_id == null || can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "Use the intended 12-digit AWS account ID."
  }
}
variable "environment" {
  type    = string
  default = "personal"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}$", var.environment))
    error_message = "Use 2–21 lowercase letters, numbers, or hyphens, beginning with a letter."
  }
}
variable "domain_name" {
  description = "Optional full app hostname, for example pantry.example.com."
  type        = string
  default     = null
}
variable "route53_zone_id" {
  description = "Optional public Route53 zone ID. Leave null to manage DNS at Namecheap or another external provider."
  type        = string
  default     = null
}
variable "auth_domain_prefix" {
  description = "Optional globally unique Cognito prefix. Default includes AWS account ID."
  type        = string
  default     = null
}
