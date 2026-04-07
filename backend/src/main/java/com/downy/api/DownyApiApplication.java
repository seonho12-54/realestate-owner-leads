package com.downy.api;

import com.downy.api.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class DownyApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DownyApiApplication.class, args);
    }
}
