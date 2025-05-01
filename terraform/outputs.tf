output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = aws_api_gateway_stage.api.invoke_url
}

output "frontend_cloudfront_domain" {
  description = "CloudFront distribution domain name for frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend files"
  value       = aws_s3_bucket.frontend.bucket
}

output "database_endpoint" {
  description = "Endpoint of the Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.postgres.endpoint
}

output "database_name" {
  description = "Name of the PostgreSQL database"
  value       = aws_rds_cluster.postgres.database_name
}
