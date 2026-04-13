terraform {
    required_version = "~> 1.14"

    required_providers {
        aws = {
            source  = "hashicorp/aws"
            version = "~> 6.40"
        }
    }

    backend "s3" {
        bucket         = "portfolio-tfstate-853612430439"
        key            = "prod/terraform.tfstate"
        region         = "us-east-1"
        dynamodb_table = "portfolio-tf-locks"
        encrypt        = true
        profile        = "portfolio"
    }
}

provider "aws" {
    region  = var.aws_region
    profile = var.aws_profile

    default_tags {
        tags = {
            Project     = var.project
            Environment = var.environment
            ManagedBy   = "terraform"
        }
    }
}
