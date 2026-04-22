variable "aws_region" {
    description = "AWS region for all resources"
    type        = string
    default     = "us-east-1"
}

variable "aws_profile" {
    description = "AWS CLI profile to use"
    type        = string
    default     = "portfolio"
}

variable "project" {
    description = "Project name used for resource naming and tagging"
    type        = string
    default     = "portfolio"
}

variable "environment" {
    description = "Environment name (prod, staging)"
    type        = string
    default     = "prod"
}

variable "domain_name" {
    description = "Root domain for the portfolio site"
    type        = string
    default     = "gercastro.xyz"
}

variable "vpc_cidr" {
    description = "CIDR block for the VPC"
    type        = string
    default     = "10.0.0.0/16"
}

variable "availability_zones" {
    description = "AZs to use (minimum 2 for ALB)"
    type        = list(string)
    default     = ["us-east-1a", "us-east-1b"]
}

variable "ec2_instance_type" {
    description = "EC2 instance type for ECS cluster"
    type        = string
    default     = "t3.medium"
}

variable "ec2_key_pair_name" {
    description = "Name of an existing EC2 key pair for SSH access (optional)"
    type        = string
    default     = ""
}
