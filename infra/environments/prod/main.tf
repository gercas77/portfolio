locals {
    name_prefix = "${var.project}-${var.environment}"
}

module "networking" {
    source = "../../modules/networking"

    name_prefix        = local.name_prefix
    vpc_cidr           = var.vpc_cidr
    availability_zones = var.availability_zones
}

module "ecr" {
    source = "../../modules/ecr"

    name_prefix = local.name_prefix
}

module "dns" {
    source = "../../modules/dns"

    domain_name = var.domain_name
}

module "secrets" {
    source = "../../modules/secrets"

    name_prefix = local.name_prefix
}

module "ecs" {
    source = "../../modules/ecs"

    name_prefix          = local.name_prefix
    vpc_id               = module.networking.vpc_id
    public_subnet_ids    = module.networking.public_subnet_ids
    alb_sg_id            = module.networking.alb_sg_id
    ecs_sg_id            = module.networking.ecs_sg_id
    certificate_arn      = module.dns.certificate_arn
    ecr_repository_url = module.ecr.repository_url
    instance_type        = var.ec2_instance_type
    key_pair_name        = var.ec2_key_pair_name
    app_secret_arn       = module.secrets.secret_arn
    public_app_url       = "https://${var.domain_name}"
}

module "cdn" {
    source = "../../modules/cdn"

    name_prefix     = local.name_prefix
    domain_name     = var.domain_name
    alb_dns_name    = module.ecs.alb_dns_name
    certificate_arn = module.dns.certificate_arn
    zone_id         = module.dns.zone_id
}

module "monitoring" {
    source = "../../modules/monitoring"

    name_prefix      = local.name_prefix
    ecs_cluster_name = module.ecs.cluster_name
    ecs_service_name = module.ecs.service_name
    alb_arn_suffix   = module.ecs.alb_arn_suffix
}
