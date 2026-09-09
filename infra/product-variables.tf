variable "classifier_provider" {
  description = "none uses free rules only; openai enables optional AI fallback."
  type        = string
  default     = "none"
  validation {
    condition     = contains(["none", "openai"], var.classifier_provider)
    error_message = "Choose none or openai."
  }
}
variable "classifier_model" {
  description = "OpenAI model supporting Responses structured outputs. Used only when AI is enabled."
  type        = string
  default     = "gpt-4.1-nano"
  validation {
    condition     = can(regex("^[a-zA-Z0-9._-]{1,100}$", var.classifier_model))
    error_message = "Use a model identifier."
  }
}
variable "classifier_daily_limit" {
  description = "Maximum attempted model calls across the entire app per UTC day. Each user also has a limit of 20."
  type        = number
  default     = 100
  validation {
    condition     = var.classifier_daily_limit >= 0 && var.classifier_daily_limit <= 10000 && floor(var.classifier_daily_limit) == var.classifier_daily_limit
    error_message = "Use an integer from 0 to 10000."
  }
}
