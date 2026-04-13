resource "aws_wafv2_web_acl" "main" {
    name  = "${var.name_prefix}-waf"
    scope = "CLOUDFRONT"

    default_action {
        allow {}
    }

    rule {
        name     = "rate-limit"
        priority = 1

        action {
            block {}
        }

        statement {
            rate_based_statement {
                limit              = 2000
                aggregate_key_type = "IP"
            }
        }

        visibility_config {
            sampled_requests_enabled   = true
            cloudwatch_metrics_enabled = true
            metric_name                = "${var.name_prefix}-rate-limit"
        }
    }

    rule {
        name     = "aws-managed-common"
        priority = 2

        override_action {
            none {}
        }

        statement {
            managed_rule_group_statement {
                name        = "AWSManagedRulesCommonRuleSet"
                vendor_name = "AWS"
            }
        }

        visibility_config {
            sampled_requests_enabled   = true
            cloudwatch_metrics_enabled = true
            metric_name                = "${var.name_prefix}-common-rules"
        }
    }

    visibility_config {
        sampled_requests_enabled   = true
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.name_prefix}-waf"
    }

    tags = { Name = "${var.name_prefix}-waf" }
}

resource "aws_cloudfront_distribution" "main" {
    enabled             = true
    is_ipv6_enabled     = true
    aliases             = [var.domain_name, "www.${var.domain_name}"]
    web_acl_id          = aws_wafv2_web_acl.main.arn
    default_root_object = ""

    origin {
        domain_name = var.alb_dns_name
        origin_id   = "alb"

        custom_origin_config {
            http_port              = 80
            https_port             = 443
            origin_protocol_policy = "https-only"
            origin_ssl_protocols   = ["TLSv1.2"]
        }
    }

    default_cache_behavior {
        allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
        cached_methods   = ["GET", "HEAD"]
        target_origin_id = "alb"

        forwarded_values {
            query_string = true
            headers      = ["Host", "Origin", "Authorization"]

            cookies { forward = "all" }
        }

        viewer_protocol_policy = "redirect-to-https"
        min_ttl                = 0
        default_ttl            = 0
        max_ttl                = 0
        compress               = true
    }

    ordered_cache_behavior {
        path_pattern     = "/_next/static/*"
        allowed_methods  = ["GET", "HEAD"]
        cached_methods   = ["GET", "HEAD"]
        target_origin_id = "alb"

        forwarded_values {
            query_string = false
            cookies { forward = "none" }
        }

        viewer_protocol_policy = "redirect-to-https"
        min_ttl                = 86400
        default_ttl            = 604800
        max_ttl                = 31536000
        compress               = true
    }

    restrictions {
        geo_restriction { restriction_type = "none" }
    }

    viewer_certificate {
        acm_certificate_arn      = var.certificate_arn
        ssl_support_method       = "sni-only"
        minimum_protocol_version = "TLSv1.2_2021"
    }

    tags = { Name = "${var.name_prefix}-cdn" }
}

resource "aws_route53_record" "apex" {
    zone_id = var.zone_id
    name    = var.domain_name
    type    = "A"

    alias {
        name                   = aws_cloudfront_distribution.main.domain_name
        zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
        evaluate_target_health = false
    }
}

resource "aws_route53_record" "www" {
    zone_id = var.zone_id
    name    = "www.${var.domain_name}"
    type    = "A"

    alias {
        name                   = aws_cloudfront_distribution.main.domain_name
        zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
        evaluate_target_health = false
    }
}
