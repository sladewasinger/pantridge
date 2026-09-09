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
variable "classifier_reasoning_effort" {
  description = "Optional supported reasoning effort for the selected model. Null omits reasoning for non-reasoning models."
  type        = string
  default     = null
  validation {
    condition     = var.classifier_reasoning_effort == null || contains(["none", "low", "medium", "high", "xhigh", "max"], var.classifier_reasoning_effort)
    error_message = "Choose a supported reasoning effort or null."
  }
}
variable "classifier_max_output_tokens" {
  description = "Total output budget, including reasoning tokens."
  type        = number
  default     = 200
  validation {
    condition     = var.classifier_max_output_tokens >= 200 && var.classifier_max_output_tokens <= 4096 && floor(var.classifier_max_output_tokens) == var.classifier_max_output_tokens
    error_message = "Use an integer output budget from 200 to 4096."
  }
}
