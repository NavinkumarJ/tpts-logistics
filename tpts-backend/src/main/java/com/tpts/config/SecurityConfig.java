package com.tpts.config;

import com.tpts.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security Configuration for TPTS Backend
 * Configures JWT authentication, BCrypt password encoding, and CORS
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * BCrypt Password Encoder Bean
     * Strength 10 is a good balance between security and performance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    /**
     * Authentication Provider using DaoAuthenticationProvider
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Authentication Manager Bean
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Security Filter Chain - Main security configuration
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF (using JWT)
                .csrf(AbstractHttpConfigurer::disable)

                // Enable CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Session management - Stateless (JWT)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints - No authentication required
                        .requestMatchers("/", "/health").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/upload/**").permitAll()

                        // WebSocket endpoints
                        .requestMatchers("/ws/**").permitAll()

                        // Public tracking - No auth required
                        .requestMatchers(HttpMethod.GET, "/api/parcels/track").permitAll()

                        // Public jobs page - No auth required
                        .requestMatchers(HttpMethod.GET, "/api/jobs/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/job-applications/public").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/job-applications/track").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/job-applications").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/job-applications/*/withdraw").permitAll()

                        // Public company listings
                        .requestMatchers(HttpMethod.GET, "/api/companies").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/companies/hiring").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/companies/city/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/companies/compare").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/companies/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/groups/city/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/groups/open/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/groups/code/**").permitAll()

                        // Payment webhook (Razorpay callbacks)
                        .requestMatchers(HttpMethod.POST, "/api/payments/webhook").permitAll()

                        // Agent location for customer tracking
                        .requestMatchers(HttpMethod.GET, "/api/agents/*/location").permitAll()

                        // Public ratings (view only)
                        .requestMatchers(HttpMethod.GET, "/api/ratings/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ratings/company/{companyId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ratings/company/{companyId}/summary").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ratings/agent/{agentId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ratings/agent/{agentId}/summary").permitAll()

                        // Customer endpoints
                        .requestMatchers("/api/customers/**").hasRole("CUSTOMER")

                        // Company admin endpoints (private)
                        .requestMatchers("/api/company/**").hasRole("COMPANY_ADMIN")
                        .requestMatchers("/api/agents/**").hasAnyRole("COMPANY_ADMIN", "DELIVERY_AGENT")

                        // Delivery agent endpoints
                        .requestMatchers("/api/delivery/**").hasRole("DELIVERY_AGENT")

                        // Super admin endpoints
                        .requestMatchers("/api/super-admin/**").hasRole("SUPER_ADMIN")

                        // All other requests require authentication
                        .anyRequest().authenticated())

                // Add JWT filter before UsernamePasswordAuthenticationFilter
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS Configuration
     * Allows requests from frontend origins
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allowed origins from properties
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));

        // Allowed methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Allowed headers
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"));

        // Exposed headers
        configuration.setExposedHeaders(List.of("Authorization"));

        // Allow credentials
        configuration.setAllowCredentials(true);

        // Max age
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}