resource "aws_acm_certificate" "web" {
  provider          = aws.edge
  count             = local.custom ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}
resource "aws_route53_record" "certificate" {
  for_each = local.manage_dns ? {
    for option in aws_acm_certificate.web[0].domain_validation_options : option.domain_name => {
      name = option.resource_record_name, record = option.resource_record_value, type = option.resource_record_type
    }
  } : {}
  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}
resource "aws_acm_certificate_validation" "web" {
  provider                = aws.edge
  count                   = local.custom ? 1 : 0
  certificate_arn         = aws_acm_certificate.web[0].arn
  validation_record_fqdns = local.manage_dns ? [for record in aws_route53_record.certificate : record.fqdn] : [for option in aws_acm_certificate.web[0].domain_validation_options : option.resource_record_name]
}
resource "aws_route53_record" "web" {
  for_each = local.manage_dns ? toset(["A", "AAAA"]) : toset([])
  zone_id  = var.route53_zone_id
  name     = var.domain_name
  type     = each.value
  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}
