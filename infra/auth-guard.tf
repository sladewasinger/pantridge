data "archive_file" "auth_guard" {
  count       = local.google_enabled ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../artifacts/auth"
  output_path = "${path.module}/../artifacts/auth.zip"
}
resource "aws_cloudwatch_log_group" "auth_guard" {
  count             = local.google_enabled ? 1 : 0
  name              = "/aws/lambda/${local.name}-auth-guard"
  retention_in_days = 14
}
resource "aws_iam_role" "auth_guard" {
  count              = local.google_enabled ? 1 : 0
  name               = "${local.name}-auth-guard"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy" "auth_guard" {
  count = local.google_enabled ? 1 : 0
  role  = aws_iam_role.auth_guard[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.auth_guard[0].arn}:*" }
  ] })
}
resource "aws_lambda_function" "auth_guard" {
  count            = local.google_enabled ? 1 : 0
  function_name    = "${local.name}-auth-guard"
  role             = aws_iam_role.auth_guard[0].arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.auth_guard[0].output_path
  source_code_hash = data.archive_file.auth_guard[0].output_base64sha256
  timeout          = 5
  memory_size      = 128
  depends_on       = [aws_iam_role_policy.auth_guard]
}
resource "aws_lambda_permission" "auth_guard" {
  count          = local.google_enabled ? 1 : 0
  statement_id   = "CognitoGoogleGuard"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.auth_guard[0].function_name
  principal      = "cognito-idp.amazonaws.com"
  source_arn     = aws_cognito_user_pool.owner.arn
  source_account = data.aws_caller_identity.current.account_id
}
