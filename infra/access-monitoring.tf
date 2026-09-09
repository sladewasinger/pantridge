resource "aws_cloudwatch_log_metric_filter" "suspensions" {
  name           = "${local.name}-account-suspensions"
  log_group_name = aws_cloudwatch_log_group.api.name
  pattern        = "\"AccountSuspended\""
  metric_transformation {
    name      = "AccountSuspensions"
    namespace = "Pantridge/${var.environment}"
    value     = "1"
  }
}
resource "aws_cloudwatch_metric_alarm" "suspensions" {
  alarm_name          = "${local.name}-account-suspensions"
  alarm_description   = "Accounts suspended for request flooding or repeated malformed requests. Inspect the Pantridge access table."
  namespace           = "Pantridge/${var.environment}"
  metric_name         = "AccountSuspensions"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
}
