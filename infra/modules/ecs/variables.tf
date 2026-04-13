variable "name_prefix" {
    description = "Prefix for resource names"
    type        = string
}

variable "vpc_id" {
    description = "VPC ID"
    type        = string
}

variable "public_subnet_ids" {
    description = "Public subnet IDs for ALB and ECS instances"
    type        = list(string)
}

variable "alb_sg_id" {
    description = "Security group ID for the ALB"
    type        = string
}

variable "ecs_sg_id" {
    description = "Security group ID for ECS instances"
    type        = string
}

variable "certificate_arn" {
    description = "ACM certificate ARN for HTTPS listener"
    type        = string
}

variable "ecr_repository_url" {
    description = "ECR repository URL"
    type        = string
}

variable "instance_type" {
    description = "EC2 instance type for ECS"
    type        = string
    default     = "t3.medium"
}

variable "key_pair_name" {
    description = "EC2 key pair name for SSH (optional, empty = no SSH)"
    type        = string
    default     = ""
}

variable "deploy_service" {
    description = "Whether to create the ECS service (false on first apply before any image exists in ECR)"
    type        = bool
    default     = false
}
