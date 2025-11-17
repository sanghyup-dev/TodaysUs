package com.todaysus.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.s3")
@Getter
@Setter
public class S3Properties {
    private String endpoint;
    private String region;
    private String bucket;
    private String accessKey;
    private String secretKey;
}
