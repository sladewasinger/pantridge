variable "max_users" {
  description = "Maximum admitted Google identities, including suspended users. Existing identities keep their slot."
  type        = number
  default     = 100
  validation {
    condition     = var.max_users >= 1 && var.max_users <= 10000 && floor(var.max_users) == var.max_users
    error_message = "Use an integer from 1 to 10000."
  }
}
variable "api_enabled" {
  description = "Emergency cloud kill switch; local/offline use remains available."
  type        = bool
  default     = true
}
variable "lambda_concurrency" {
  description = "Optional per-function reservations. -1 uses the shared pool; low-quota AWS accounts cannot reserve concurrency."
  type        = object({ api = optional(number, -1), auth = optional(number, -1) })
  default     = {}
  validation {
    condition     = alltrue([for value in values(var.lambda_concurrency) : value == -1 || (value >= 1 && value <= 1000 && floor(value) == value)])
    error_message = "Use -1 or a positive integer reservation supported by the account quota."
  }
}
variable "access_limits" {
  description = "Per-account and application-wide cost/abuse boundaries. Normal cart edits are paced by the client."
  type = object({
    requests_per_minute     = optional(number, 240)
    suspend_per_minute      = optional(number, 600)
    invalid_per_ten_minutes = optional(number, 10)
    user_requests_per_day   = optional(number, 10000)
    global_requests_per_day = optional(number, 100000)
    write_units_per_day     = optional(number, 1000000)
  })
  default = {}
  validation {
    condition     = alltrue([for value in values(var.access_limits) : value >= 1 && value <= 10000000 && floor(value) == value]) && var.access_limits.suspend_per_minute > var.access_limits.requests_per_minute
    error_message = "Use positive integers up to 10000000, with suspension above the burst allowance."
  }
}
locals {
  access_environment = {
    ACCESS_TABLE                = aws_dynamodb_table.access.name
    MAX_USERS                   = tostring(var.max_users)
    API_ENABLED                 = tostring(var.api_enabled)
    USER_REQUESTS_PER_MINUTE    = tostring(var.access_limits.requests_per_minute)
    ABUSE_REQUESTS_PER_MINUTE   = tostring(var.access_limits.suspend_per_minute)
    ABUSE_INVALID_REQUESTS      = tostring(var.access_limits.invalid_per_ten_minutes)
    USER_REQUESTS_PER_DAY       = tostring(var.access_limits.user_requests_per_day)
    API_REQUESTS_PER_DAY        = tostring(var.access_limits.global_requests_per_day)
    KITCHEN_WRITE_UNITS_PER_DAY = tostring(var.access_limits.write_units_per_day)
  }
}
resource "aws_dynamodb_table" "access" {
  name                        = "${local.name}-access"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "pk"
  deletion_protection_enabled = true
  attribute {
    name = "pk"
    type = "S"
  }
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
  on_demand_throughput {
    max_read_request_units  = 200
    max_write_request_units = 100
  }
  point_in_time_recovery { enabled = true }
  server_side_encryption { enabled = true }
  lifecycle { prevent_destroy = true }
}
resource "aws_iam_role_policy" "access" {
  role = aws_iam_role.api.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"], Resource = aws_dynamodb_table.access.arn }
  ] })
}
output "access_table" { value = aws_dynamodb_table.access.name }
