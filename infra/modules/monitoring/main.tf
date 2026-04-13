resource "aws_sns_topic" "alarms" {
    count = var.alarm_email != "" ? 1 : 0

    name = "${var.name_prefix}-alarms"

    tags = { Name = "${var.name_prefix}-alarm-topic" }
}

resource "aws_sns_topic_subscription" "email" {
    count = var.alarm_email != "" ? 1 : 0

    topic_arn = aws_sns_topic.alarms[0].arn
    protocol  = "email"
    endpoint  = var.alarm_email
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
    count = var.deploy_service ? 1 : 0

    alarm_name          = "${var.name_prefix}-ecs-cpu-high"
    comparison_operator = "GreaterThanThreshold"
    evaluation_periods  = 2
    metric_name         = "CPUUtilization"
    namespace           = "AWS/ECS"
    period              = 300
    statistic           = "Average"
    threshold           = 80
    alarm_description   = "ECS CPU utilization above 80%"

    dimensions = {
        ClusterName = var.ecs_cluster_name
        ServiceName = var.ecs_service_name
    }

    alarm_actions = var.alarm_email != "" ? [aws_sns_topic.alarms[0].arn] : []

    tags = { Name = "${var.name_prefix}-cpu-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
    alarm_name          = "${var.name_prefix}-alb-5xx"
    comparison_operator = "GreaterThanThreshold"
    evaluation_periods  = 2
    metric_name         = "HTTPCode_ELB_5XX_Count"
    namespace           = "AWS/ApplicationELB"
    period              = 300
    statistic           = "Sum"
    threshold           = 10
    alarm_description   = "ALB 5xx errors above 10 in 5 minutes"
    treat_missing_data  = "notBreaching"

    dimensions = {
        LoadBalancer = var.alb_arn_suffix
    }

    alarm_actions = var.alarm_email != "" ? [aws_sns_topic.alarms[0].arn] : []

    tags = { Name = "${var.name_prefix}-5xx-alarm" }
}

resource "aws_cloudwatch_dashboard" "main" {
    dashboard_name = "${var.name_prefix}-overview"

    dashboard_body = jsonencode({
        widgets = [
            {
                type   = "metric"
                x      = 0
                y      = 0
                width  = 12
                height = 6
                properties = {
                    title   = "ECS CPU & Memory"
                    metrics = [
                        ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
                        ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name, "ServiceName", var.ecs_service_name],
                    ]
                    period = 300
                    region = "us-east-1"
                }
            },
            {
                type   = "metric"
                x      = 12
                y      = 0
                width  = 12
                height = 6
                properties = {
                    title   = "ALB Request Count & Errors"
                    metrics = [
                        ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
                        ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix],
                        ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix],
                    ]
                    period = 300
                    region = "us-east-1"
                }
            }
        ]
    })
}
