package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		// 1. Chạy ứng dụng và hứng lấy Context
		ConfigurableApplicationContext context = SpringApplication.run(BackendApplication.class, args);

		// 2. Lấy thông tin môi trường để đọc Port và Context Path (nếu có)
		Environment env = context.getEnvironment();
		String port = env.getProperty("server.port", "8080"); // Mặc định là 8080 nếu chưa cấu hình
		String contextPath = env.getProperty("server.servlet.context-path", "");

		// 3. In đường dẫn Swagger ra màn hình console
		System.out.println("\n----------------------------------------------------------");
		System.out.println("\tApplication is running! Access Swagger UI at:");
		System.out.println("\thttp://localhost:" + port + contextPath + "/swagger-ui/index.html");
		System.out.println("----------------------------------------------------------\n");
	}

}