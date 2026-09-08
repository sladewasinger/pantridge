terraform {
  required_version = ">= 1.10, < 2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}
provider "aws" {
  region              = var.region
  profile             = var.aws_profile
  allowed_account_ids = var.aws_account_id == null ? null : [var.aws_account_id]
  default_tags { tags = { Project = "Pantridge", Environment = var.environment, ManagedBy = "Terraform" } }
}
provider "aws" {
  alias               = "edge"
  region              = "us-east-1"
  profile             = var.aws_profile
  allowed_account_ids = var.aws_account_id == null ? null : [var.aws_account_id]
  default_tags { tags = { Project = "Pantridge", Environment = var.environment, ManagedBy = "Terraform" } }
}
data "aws_caller_identity" "current" {}
locals {
  name       = "pantridge-${var.environment}"
  custom     = var.domain_name != null
  manage_dns = local.custom && var.route53_zone_id != null
  url        = "https://${local.custom ? var.domain_name : aws_cloudfront_distribution.web.domain_name}"
}
