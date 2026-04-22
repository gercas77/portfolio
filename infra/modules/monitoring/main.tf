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

locals {
    # CloudWatch PutDashboard requires metric tuple fields to be strings (or a trailing render object).
    # See: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html#CloudWatch-Dashboard-Properties-Metrics-Array-Format
    cw_alb_metrics = [
        [
            "AWS/ApplicationELB",
            "RequestCount",
            "LoadBalancer",
            tostring(var.alb_arn_suffix),
            { "stat" = "Sum" },
        ],
        [
            "AWS/ApplicationELB",
            "HTTPCode_ELB_5XX_Count",
            "LoadBalancer",
            tostring(var.alb_arn_suffix),
            { "stat" = "Sum" },
        ],
        [
            "AWS/ApplicationELB",
            "HTTPCode_Target_4XX_Count",
            "LoadBalancer",
            tostring(var.alb_arn_suffix),
            { "stat" = "Sum" },
        ],
    ]
    cw_ecs_metrics = [
        [
            "AWS/ECS",
            "CPUUtilization",
            "ClusterName",
            tostring(var.ecs_cluster_name),
            "ServiceName",
            tostring(var.ecs_service_name),
            { "stat" = "Average" },
        ],
        [
            "AWS/ECS",
            "MemoryUtilization",
            "ClusterName",
            tostring(var.ecs_cluster_name),
            "ServiceName",
            tostring(var.ecs_service_name),
            { "stat" = "Average" },
        ],
    ]
    cw_widget_ecs = {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
            title   = "ECS CPU & Memory"
            metrics = local.cw_ecs_metrics
            period  = 300
            region  = "us-east-1"
        }
    }
    cw_widget_alb = {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
            title   = "ALB Request Count & Errors"
            metrics = local.cw_alb_metrics
            period  = 300
            region  = "us-east-1"
        }
    }
}

resource "aws_cloudwatch_dashboard" "main" {
    dashboard_name = "${var.name_prefix}-overview"

    dashboard_body = jsonencode({
        widgets = [
            local.cw_widget_ecs,
            local.cw_widget_alb,
        ]
    })
}
