resource "aws_dynamodb_table" "products" {
  name         = "${local.name}-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  attribute {
    name = "pk"
    type = "S"
  }
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
  server_side_encryption { enabled = true }
}

locals {
  classifier_key_parameter = "/${local.name}/classifier/api-key"
}

resource "aws_iam_role_policy" "products" {
  role = aws_iam_role.api.id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"], Resource = aws_dynamodb_table.products.arn }
    ], var.classifier_provider == "openai" ? [
    { Effect = "Allow", Action = ["ssm:GetParameter"], Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.classifier_key_parameter}" }
  ] : []) })
}

output "classifier_key_parameter" {
  description = "Create a Standard SecureString here using the default aws/ssm key. The value is never managed by Terraform."
  value       = local.classifier_key_parameter
}
