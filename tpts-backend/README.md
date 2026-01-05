# TPTS Backend - Trail Parcel Tracking System

A Spring Boot backend for a logistics platform designed for local courier companies in India.

## 🚀 Phase 1 - Authentication Setup (Complete)

### Features Implemented
- ✅ User Entity (base for all users)
- ✅ Customer, CompanyAdmin, DeliveryAgent, SuperAdmin entities
- ✅ JWT Configuration (Access Token + Refresh Token)
- ✅ BCrypt Password Hashing
- ✅ Spring Security Configuration
- ✅ Role-based Authorization
- ✅ OTP Generation & Verification
- ✅ Password Reset Flow
- ✅ Global Exception Handling

### Tech Stack
- **Framework:** Spring Boot 3.2.0
- **Security:** Spring Security + JWT (jjwt 0.12.3)
- **Database:** MySQL + JPA/Hibernate
- **Build Tool:** Maven
- **Java Version:** 17

---

## 📦 Project Structure

```
src/main/java/com/tpts/
├── config/
│   └── SecurityConfig.java         # Security + CORS + BCrypt configuration
├── controller/
│   ├── AuthController.java         # Authentication endpoints
│   └── HealthController.java       # Health check endpoints
├── dto/
│   ├── request/
│   │   ├── CustomerRegisterRequest.java
│   │   ├── CompanyRegisterRequest.java
│   │   ├── LoginRequest.java
│   │   ├── VerifyOtpRequest.java
│   │   ├── ResendOtpRequest.java
│   │   ├── RefreshTokenRequest.java
│   │   ├── ForgotPasswordRequest.java
│   │   └── ResetPasswordRequest.java
│   └── response/
│       ├── ApiResponse.java        # Generic API response wrapper
│       └── AuthResponse.java       # Login/Register response
├── entity/
│   ├── User.java                   # Base user entity (implements UserDetails)
│   ├── UserType.java               # Enum: CUSTOMER, COMPANY_ADMIN, etc.
│   ├── Customer.java
│   ├── CompanyAdmin.java
│   ├── DeliveryAgent.java
│   ├── SuperAdmin.java
│   └── VehicleType.java            # Enum: BIKE, CAR, VAN, E_BIKE
├── exception/
│   ├── TptsExceptions.java         # Custom exception classes
│   └── GlobalExceptionHandler.java # Global exception handler
├── repository/
│   ├── UserRepository.java
│   ├── CustomerRepository.java
│   ├── CompanyAdminRepository.java
│   ├── DeliveryAgentRepository.java
│   └── SuperAdminRepository.java
├── security/
│   ├── JwtUtil.java                # JWT token generation/validation
│   └── JwtAuthenticationFilter.java # JWT filter for requests
├── service/
│   ├── AuthService.java            # Authentication business logic
│   └── CustomUserDetailsService.java
├── util/
│   └── OtpUtil.java                # OTP and token generation
└── TptsApplication.java            # Main application class
```

---

## 🛠️ Setup Instructions

### Prerequisites
- Java 17+
- Maven 3.8+
- MySQL 8.0+

### 1. Create MySQL Database

```sql
CREATE DATABASE tpts_db;
CREATE USER 'tpts_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON tpts_db.* TO 'tpts_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configure Application

Edit `src/main/resources/application.properties`:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/tpts_db
spring.datasource.username=tpts_user
spring.datasource.password=your_password

# JWT Secret (change in production!)
jwt.secret=YOUR_BASE64_ENCODED_SECRET_KEY
```

### 3. Build and Run

```bash
# Navigate to project directory
cd tpts-backend

# Build with Maven
mvn clean install

# Run the application
mvn spring-boot:run

# Or run the JAR
java -jar target/tpts-backend-1.0.0.jar
```

### 4. Verify Setup

Open browser: http://localhost:8080

Expected response:
```json
{
  "success": true,
  "message": "Welcome to TPTS API",
  "data": {
    "name": "TPTS Backend API",
    "version": "1.0.0",
    "status": "running"
  }
}
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register/customer` | Register customer | No |
| POST | `/api/auth/register/company` | Register company | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/verify-otp` | Verify OTP | No |
| POST | `/api/auth/resend-otp` | Resend OTP | No |
| POST | `/api/auth/refresh-token` | Refresh access token | No |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password | No |
| POST | `/api/auth/logout` | Logout | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/api/auth/health` | Auth service health |

---

## 📝 Testing with Postman

### Import Collection

1. Open Postman
2. Click **Import**
3. Select `TPTS_Postman_Collection.json`
4. Collection will appear with all endpoints

### Test Flow

1. **Health Check** - Verify server is running
2. **Register Customer** - Create new account (check console for OTP)
3. **Verify OTP** - Use OTP from console
4. **Login** - Get access token
5. **Test Protected Endpoint** - Verify JWT auth works

### Sample Requests

#### Register Customer
```bash
curl -X POST http://localhost:8080/api/auth/register/customer \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jai Kumar",
    "email": "jai@example.com",
    "phone": "9876543210",
    "password": "password123",
    "city": "Chennai",
    "pincode": "600001"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jai@example.com",
    "password": "password123",
    "userType": "CUSTOMER"
  }'
```

#### Access Protected Endpoint
```bash
curl -X GET http://localhost:8080/api/customers/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔐 Security Notes

### JWT Configuration
- Access Token: 24 hours expiration
- Refresh Token: 7 days expiration
- Algorithm: HS256

### Password Security
- BCrypt with strength 10
- Minimum 6 characters required

### CORS
- Allowed origins: http://localhost:5173, http://localhost:3000
- Configure in `application.properties`

---

## 📋 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2024-12-06T10:30:00"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed message",
    "details": { ... }
  },
  "timestamp": "2024-12-06T10:30:00"
}
```

### Auth Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "email": "jai@example.com",
      "phone": "9876543210",
      "userType": "CUSTOMER",
      "isVerified": true,
      "isActive": true,
      "profileId": 1,
      "displayName": "Jai Kumar"
    }
  }
}
```

---

## 🔄 Next Steps (Phase 2)

- [ ] Customer Controller & Service
- [ ] Company Controller & Service
- [ ] Agent Controller & Service
- [ ] Parcel Entity & Controller
- [ ] Group Shipment Flow
- [ ] Public Tracking Endpoint
- [ ] Job Application Flow

---

## 📞 Support

For issues or questions, refer to the project documentation:
- `TPTS_Chat_Starter.md` - Quick reference guide
- `TPTS_Reframed_Architecture.md` - Complete architecture

---

*TPTS Backend v1.0.0 - Phase 1 Complete*
