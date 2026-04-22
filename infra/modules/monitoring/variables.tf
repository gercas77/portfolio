variable "name_prefix" {
    description = "Prefix for resource names"
    type        = string
}

variable "ecs_cluster_name" {
    description = "ECS cluster name for alarms"
    type        = string
}

variable "ecs_service_name" {
    description = "ECS service name for alarms"
    type        = string
}

variable "alb_arn_suffix" {
    description = "ALB ARN suffix for CloudWatch metrics"
    type        = string
}

variable "alarm_email" {
    description = "Email for CloudWatch alarm notifications (optional)"
    type        = string
    default     = ""
}
