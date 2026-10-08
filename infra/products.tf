resource "aws_dynamodb_table" "products" {
  name         = "${local.name}-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  on_demand_throughput {
    max_read_request_units  = 100
    max_write_request_units = 100
  }
  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "classificationName"
    type = "S"
  }
  global_secondary_index {
    name            = "classification-name"
    hash_key        = "classificationName"
    projection_type = "ALL"
    on_demand_throughput {
      max_read_request_units  = 50
      max_write_request_units = 50
    }
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
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:ConditionCheckItem"], Resource = aws_dynamodb_table.products.arn },
    { Effect = "Allow", Action = ["dynamodb:Query"], Resource = "${aws_dynamodb_table.products.arn}/index/classification-name" }
    ], var.classifier_provider == "openai" ? [
    { Effect = "Allow", Action = ["ssm:GetParameter"], Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.classifier_key_parameter}" }
  ] : []) })
}

output "classifier_key_parameter" {
  description = "Create a Standard SecureString here using the default aws/ssm key. The value is never managed by Terraform."
  value       = local.classifier_key_parameter
}

variable "standardization_enabled" {
  description = "Enable durable food classification after manually deploying and verifying the worker. Existing AI budgets remain unchanged."
  type        = bool
  default     = false
}
data "archive_file" "classification" {
  type        = "zip"
  source_dir  = "${path.module}/../artifacts/classification"
  output_path = "${path.module}/../artifacts/classification.zip"
}
resource "aws_cloudwatch_log_group" "classification" {
  name              = "/aws/lambda/${local.name}-classification"
  retention_in_days = 14
}
resource "aws_iam_role" "classification" {
  name               = "${local.name}-classification"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy" "classification" {
  role = aws_iam_role.classification.id
  policy = jsonencode({ Version = "2012-10-17", Statement = concat([
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem"], Resource = aws_dynamodb_table.kitchen.arn },
    { Effect = "Allow", Action = ["dynamodb:Query"], Resource = "${aws_dynamodb_table.kitchen.arn}/index/classification-due" },
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:ConditionCheckItem"], Resource = aws_dynamodb_table.access.arn },
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:ConditionCheckItem"], Resource = aws_dynamodb_table.products.arn },
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.classification.arn}:*" }
    ], var.classifier_provider == "openai" ? [
    { Effect = "Allow", Action = ["ssm:GetParameter"], Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.classifier_key_parameter}" }
  ] : []) })
}
resource "aws_lambda_function" "classification" {
  function_name    = "${local.name}-classification"
  role             = aws_iam_role.classification.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.classification.output_path
  source_code_hash = data.archive_file.classification.output_base64sha256
  lifecycle { ignore_changes = [source_code_hash] }
  timeout     = 25
  memory_size = 256
  environment {
    variables = aws_lambda_function.api.environment[0].variables
  }
  depends_on = [aws_iam_role_policy.classification, aws_cloudwatch_log_group.classification]
}
resource "aws_cloudwatch_event_rule" "classification" {
  name                = "${local.name}-classification"
  schedule_expression = "rate(1 minute)"
  state               = var.standardization_enabled ? "ENABLED" : "DISABLED"
}
resource "aws_cloudwatch_event_target" "classification" {
  rule = aws_cloudwatch_event_rule.classification.name
  arn  = aws_lambda_function.classification.arn
  retry_policy {
    maximum_retry_attempts       = 2
    maximum_event_age_in_seconds = 300
  }
}
resource "aws_lambda_permission" "classification" {
  statement_id  = "ClassificationSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.classification.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.classification.arn
}
