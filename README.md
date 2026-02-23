# TPTS - Trail Parcel Tracking System
## Reframed Complete Architecture & Flow Documentation

---

## 🎯 Key Changes & Corrections

### 1. **Group Buy Flow - CORRECTED** (Company-Created, Not Customer-Created)

**OLD (Incorrect):** Customer creates group buy
**NEW (Correct):** Company Admin creates group shipments for specific routes

**Why This Makes Sense:**
- Companies know their routes, capacity, and logistics
- Two Agents Model: Pickup Agent collects all → Delivery Agent delivers all
- Customers simply JOIN existing groups for discounts
- Works for same city OR intercity routes
- Simple & practical for local courier companies

---

## 🚀 Innovative Features That Make TPTS Unique

### 1. **Smart Group Buy System (Two Agents Model)**
```
Flow: Company creates group → Customers join → Pickup Agent collects all → Delivery Agent delivers all
Routes: Same city (Chennai → Chennai) OR Intercity (Chennai → Bangalore)
Discount: 20-40% savings through bulk consolidation
```

### 2. **Public Tracking (Receiver-Friendly)**
```
Track using: Tracking Number + Receiver's Last 4 Phone Digits
Why: Receivers don't have accounts but need to track their packages
```

### 3. **Public Jobs Portal for Agents**
- Companies toggle `isHiring` flag
- Jobs appear on public page with limited slots
- 3-step application: Personal → Professional → Documents
- Company reviews and hires → Agent account created

### 4. **Dynamic Pricing**
- Pricing based on: distance, weight
- Price comparison across companies
- Group buy discount calculation

### 5. **Live Agent Tracking**
- Map display: Leaflet + OpenStreetMap (100% free)
- Route & ETA: OSRM API (free, no API key needed)
- Real-time updates: WebSocket
- Agent location updates every 10-15 seconds
- SMS notifications for status changes

---

## 📱 Complete User Flows

### FLOW 1: Customer Journey (9 Steps)

```
1. Register/Login
   - Full name, email, phone (+91), city, pincode
   - Password with confirmation
   - OTP verification
   - API: POST /api/auth/register/customer

2. Customer Dashboard
   - Active shipments overview
   - Recent deliveries history
   - Notifications & alerts
   - Quick actions
   - API: GET /api/customers/{id}/dashboard

3. Create Shipment - Step 1: Details
   - Pickup: Name, Phone, Address, City, Pincode
   - Delivery: Receiver Name, Phone, Address, City, Pincode
   - Package: Weight, Length, Type, Fragile flag
   - Progress: Step 1 of 3

4. Create Shipment - Step 2: Company Selection
   - Route summary displayed
   - Company list with: Rating, Delivery days, Price
   - BOOKING TYPE SELECTION:
     * Regular: Full price, immediate
     * Group Buy: 30-40% discount (if company has active group)
   - Show active groups for matching route
   - "JOIN THIS GROUP" button
   - API: GET /api/companies/compare
   - API: GET /api/groups/city/{city}?status=OPEN

5. Create Shipment - Step 3: Payment
   - Order summary
   - Price breakdown (Base + Group discount)
   - Payment methods: UPI, Card, Net Banking, Wallet
   - Razorpay integration
   - API: POST /api/payments

6. Booking Confirmation
   - Payment success receipt
   - Tracking number generated
   - Download receipt option
   - Track Shipment button
   - SMS & Email sent
   - API: GET /api/parcels/{id}/receipt

7. Track Shipment (Live)
   - LIVE MAP (Leaflet + OpenStreetMap):
     * Agent location marker (updates via WebSocket)
     * Route line from agent to delivery
   - ETA & Distance (from OSRM API)
   - Journey timeline with status updates
   - Agent contact: Call button
   - API: WebSocket /ws/tracking/{trackingNumber}
   - API: OSRM /route/v1/driving/{from};{to}

8. Receive & Confirm
   - Agent arrives
   - Customer provides OTP
   - Agent captures photo & signature
   - Status: DELIVERED
   - API: PATCH /api/parcels/{id}/status

9. Rate & Review
   - Rate company (5 stars)
   - Rate agent (5 stars)
   - Write review (optional)
   - API: POST /api/ratings
```

---

### FLOW 2: Group Buy Flow - TWO AGENTS MODEL (8 Steps)

```
1. Company Creates Group Shipment
   - Company Admin Dashboard → Create Group
   - Select Route: City → City (e.g., Chennai → Chennai or Chennai → Bangalore)
   - Set Target Members: 10/15/20
   - Set Deadline: 6h / 12h / 24h
   - Set Discount: 20-40%
   - System generates Group Code: GRP456
   - Status: OPEN
   - API: POST /api/groups

2. Groups Displayed on Platform
   - Customer Dashboard: "Available Group Shipments"
   - Homepage section: "Join Group & Save!"
   - During shipment creation Step 2:
     * If route matches active group → Show group option
   - Filter by: City, Route, Deadline
   - API: GET /api/groups/city/{city}?status=OPEN

3. Customer Joins Group
   - During shipment creation, customer sees matching groups
   - Group card: Route, Members (18/20), Discount (30%), Deadline (2h 34m)
   - Click "JOIN THIS GROUP"
   - Parcel linked to group
   - Payment created (pending until group fills)
   - API: POST /api/groups/join

4. Group Progress Tracking
   - Real-time member count updates
   - Progress bar: 18/20 members
   - Countdown timer to deadline
   - SMS notifications:
     * "2 more members needed!"
     * "Group fills in 30 minutes!"

5. Group Fills Up / Deadline Reached
   - SCENARIO A: Target reached
     * All payments processed
     * Discount applied
     * Status: FULL
   - SCENARIO B: Deadline with partial fill
     * Process with reduced discount OR
     * Refund & cancel
   - All members notified via SMS
   - Company assigns agents
   - API: POST /api/groups/{groupId}/activate

6. Pickup Phase (Agent 1 - Pickup Agent)
   - Company assigns PICKUP AGENT
   - Agent receives list of all pickup locations
   - Collects packages from all group members
   - Each pickup: Verify sender OTP, take photo
   - Brings all packages to Company Office
   - All parcels status: PICKED_UP
   - API: PATCH /api/groups/{groupId}/pickup-complete

7. Delivery Phase (Agent 2 - Delivery Agent)
   - Company assigns DELIVERY AGENT
   - Agent receives all packages at company office
   - Gets list of all delivery locations
   - Delivers to each receiver:
     * Verify receiver OTP
     * Take delivery photo
     * Digital signature
   - Real-time tracking for all members
   - API: GET /api/groups/{groupId}/tracking

8. Group Delivery Complete
   - All packages delivered
   - Each member receives SMS: "Package Delivered!"
   - Group status: COMPLETED
   - All members saved 20-40%!
   - Members can rate & review
   - API: PATCH /api/groups/{groupId}/complete-delivery
```

**Two Agents Model Summary:**
```
PICKUP AGENT (Agent 1)          DELIVERY AGENT (Agent 2)
        |                                |
Collects from all senders       Delivers to all receivers
        |                                |
        └──→ Company Office ───→────────┘
```

---

### FLOW 3: Company Admin Journey (9 Steps)

```
1. Register Company
   - Company Name, GST/CIN Number
   - Admin Name, Email, Phone
   - Address, City, Service Areas
   - Pricing: Base Rate, Rate/km
   - Upload: GST Cert, License, PAN
   - Password setup
   - Submit for approval (24-48 hrs)
   - API: POST /api/companies

2. Login to Dashboard
   - Email + Password
   - Account Status: Active/Pending/Rejected
   - API: POST /api/auth/login (userType: COMPANY_ADMIN)

3. Dashboard Overview
   - Stats: Orders, Agents, Revenue, Rating
   - Pending Actions:
     * Orders needing assignment
     * Agent applications to review
   - Recent completed orders
   - API: GET /api/companies/{id}/dashboard

4. Manage Hiring (NEW)
   - Toggle: isHiring (appears on public jobs page)
   - Open positions count
   - Applications table with status
   - Actions: View, Approve, Reject
   - API: GET /api/job-applications/company/{companyId}

5. Create Delivery Agent
   - From approved application OR manual
   - Agent details: Name, Phone, Email
   - City, Service Pincode
   - Vehicle Type & Number
   - System generates temp password
   - Agent receives SMS credentials
   - API: POST /api/agents
   - API: POST /api/job-applications/{id}/hire

6. Create Group Shipment (NEW)
   - Route selection
   - Target members, deadline, discount
   - Generate group code
   - Track members joining
   - API: POST /api/groups

7. Receive & Assign Orders
   - New order notifications
   - Accept/Reject order
   - ASSIGN AGENT (filter by availability):
     * Only agents where: isActive=true AND isAvailable=true
     * Priority 1: Same pincode as pickup location
     * Priority 2: Same city as pickup location
     * Agent card: Name, Rating, Current orders count
     * Select agent → Assign
   - ASSIGNMENT STATUS TRACKING:
     * PENDING: Waiting for agent response
     * ACCEPTED: Agent accepted, delivery starts
     * REJECTED: Agent rejected, need to reassign
   - API: GET /api/agents/company/{id}/available?pincode=X&city=Y
   - API: PUT /api/delivery-requests/{id}/assign

8. Monitor Shipments
   - Filters: All, Pending, In Transit, Delivered
   - Each shipment: Tracking#, Route, Agent, Status
   - Actions: Track, Call
   - Today's summary
   - API: GET /api/parcels/company/{companyId}

9. Analytics & Pricing
   - Revenue trends
   - Agent performance
   - Delivery metrics
   - Pricing configuration
   - API: GET /api/companies/{id}/analytics
```

---

### FLOW 4: Delivery Agent Journey (9 Steps)

```
1. Apply via Public Jobs Page (NEW)
   - Browse companies hiring (no login)
   - Filter: City, Salary, Experience
   - "Apply Now" button
   - 3-Step Application:
     * Step 1: Personal (Name, Phone, Email, City, Pincode)
     * Step 2: Professional (Experience, Vehicle, License, Shifts, Pincodes)
     * Step 3: Documents (License, Aadhaar, RC Book, Photo)
   - Submit application
   - API: GET /api/job-applications/public
   - API: POST /api/job-applications

2. Application Review
   - Status: PENDING
   - Company reviews
   - Outcomes: Approved/Rejected/Interview scheduled
   - SMS/Email notification

3. Get Hired & Credentials
   - Company approves
   - Agent account auto-created
   - SMS with credentials
   - Download app & login
   - API: POST /api/job-applications/{id}/hire

4. Login & Set Availability
   - OTP-based login
   - Dashboard: Profile, Company info
   - STATUS FLAGS:
     * isActive: Set by company (account active/inactive)
     * isAvailable: Set by agent (ready to accept deliveries)
   - Today's summary: Earnings, Completed deliveries
   - Pending deliveries list
   - API: PATCH /api/agents/{id}/availability

5. Receive Assignment
   - Push notification: "New Delivery Assigned by [Company]"
   - Order details: Pickup, Drop, Distance, Earnings
   - Package info
   - Actions: ACCEPT or REJECT
   - If REJECTED → Company notified to reassign
   - If ACCEPTED → Proceed to pickup
   - API: PATCH /api/delivery-requests/{id}/agent-response

6. Navigate to Pickup
   - Status: Going to Pickup
   - Customer details (Call/Chat)
   - Map navigation
   - Status updates

7. Pickup Package
   - Verify sender OTP
   - Check package condition
   - Take photo (optional)
   - Status: PICKED_UP
   - API: PATCH /api/parcels/{id}/status

8. Deliver Package
   - Navigate to delivery
   - Call receiver
   - Enter receiver OTP
   - Take delivery photo
   - Digital signature
   - Status: DELIVERED
   - API: PATCH /api/parcels/{id}/status

9. View Earnings
   - Delivery complete summary
   - Earnings + bonuses
   - History: Daily/Weekly/Monthly
   - Performance stats
   - API: GET /api/agents/{id}/earnings
```

---

### FLOW 5: Super Admin Journey (6 Steps)

```
1. Secure Login
   - Email + Password
   - Two-Factor Authentication
   - Security notices
   - API: POST /api/auth/login (userType: SUPER_ADMIN)

2. Platform Dashboard
   - Overview: Orders, Revenue, Companies, Agents
   - Revenue breakdown
   - Top companies
   - Alerts (pending approvals, disputes)
   - API: GET /api/super-admin/statistics

3. Company Approvals
   - Pending/Approved/Rejected tabs
   - Review: Details, Documents
   - Set commission rate
   - Approve/Reject
   - API: POST /api/super-admin/companies/{id}/approve

4. User Management
   - All users: Companies, Agents, Customers
   - Search & filter
   - View/Edit/Suspend/Activate
   - Activity logs
   - API: GET /api/super-admin/users

5. Financial Control
   - Default commission rate
   - Custom rates per company
   - Additional fees (Group Buy, Premium listing)
   - Revenue impact preview
   - API: PUT /api/super-admin/platform-settings

6. Platform Settings
   - Group buy rules
   - Pricing limits
   - Notification settings
   - Integration configs
   - API: GET/PUT /api/super-admin/settings
```

---

### FLOW 6: Public Pages (5 Pages)

```
1. Landing Page (Homepage)
   - Navigation: Home, Track, Jobs (NEW), About, Login, Register
   - Hero: "Ship Smarter, Save More"
   - Quick Track (No login): Tracking# + Phone last 4 digits
   - Why Choose TPTS
   - How It Works
   - Companies Hiring section
   
2. Jobs Page (NEW - Public)
   - "Delivery Agent Jobs"
   - Stats: Open positions, Companies hiring
   - Filters: City, Experience, Salary
   - Job cards with: Company, Rating, Salary, Positions
   - View Details / Apply Now buttons
   - API: GET /api/companies?isHiring=true

3. Public Tracking Page
   - "Track Your Shipment"
   - Tracking Number input
   - Phone Last 4 digits (RECEIVER'S phone)
   - Track button
   - Result: Timeline view
   - "Login for full tracking" prompt
   - API: GET /api/parcels/track?trackingNumber=X&phoneLastFour=Y

4. Login/Register Selection
   - Choose role: Customer, Agent, Company
   - Login / Register tabs
   - Social login options

5. About & Contact
   - Platform information
   - Statistics
   - Contact form
```

---

## 🗄️ Database Schema Updates

### New/Updated Tables:

```sql
-- GroupShipment (Updated)
CREATE TABLE group_shipment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    group_code VARCHAR(10) UNIQUE NOT NULL,
    company_id BIGINT NOT NULL,
    pickup_agent_id BIGINT,                -- Agent 1: Collects all packages
    delivery_agent_id BIGINT,              -- Agent 2: Delivers all packages
    source_city VARCHAR(100) NOT NULL,
    target_city VARCHAR(100) NOT NULL,     -- Can be same as source_city for local
    target_members INT NOT NULL,
    current_members INT DEFAULT 0,
    discount_percentage DECIMAL(5,2) NOT NULL,
    status ENUM('OPEN', 'FULL', 'PICKUP_IN_PROGRESS', 'PICKUP_COMPLETE', 'DELIVERY_IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    deadline TIMESTAMP NOT NULL,
    pickup_completed_at TIMESTAMP,
    delivery_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company_admin(id),
    FOREIGN KEY (pickup_agent_id) REFERENCES delivery_agent(id),
    FOREIGN KEY (delivery_agent_id) REFERENCES delivery_agent(id)
);

-- JobApplication (New)
CREATE TABLE job_application (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    applicant_name VARCHAR(100) NOT NULL,
    applicant_email VARCHAR(100) NOT NULL,
    applicant_phone VARCHAR(15) NOT NULL,
    vehicle_type ENUM('BIKE', 'CAR', 'VAN', 'E_BIKE'),
    vehicle_number VARCHAR(20),
    license_number VARCHAR(50),
    experience_years VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    service_pincodes TEXT,
    preferred_shifts TEXT,
    documents_url TEXT,
    cover_letter TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'HIRED'),
    interview_date TIMESTAMP,
    rejection_reason TEXT,
    hired_as_agent_id BIGINT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company_admin(id)
);

-- CompanyAdmin (Updated - add isHiring)
ALTER TABLE company_admin ADD COLUMN is_hiring BOOLEAN DEFAULT FALSE;
ALTER TABLE company_admin ADD COLUMN open_positions INT DEFAULT 0;
ALTER TABLE company_admin ADD COLUMN salary_range_min INT;
ALTER TABLE company_admin ADD COLUMN salary_range_max INT;

-- DeliveryAgent (Updated - add availability flags)
ALTER TABLE delivery_agent ADD COLUMN is_active BOOLEAN DEFAULT TRUE;      -- Set by Company
ALTER TABLE delivery_agent ADD COLUMN is_available BOOLEAN DEFAULT FALSE;  -- Set by Agent

-- DeliveryRequest (for tracking assignment status)
CREATE TABLE delivery_request (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parcel_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    assigned_agent_id BIGINT,
    assignment_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'REASSIGN_NEEDED'),
    assigned_at TIMESTAMP,
    agent_response_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parcel_id) REFERENCES parcel(id),
    FOREIGN KEY (company_id) REFERENCES company_admin(id),
    FOREIGN KEY (assigned_agent_id) REFERENCES delivery_agent(id)
);
```

---

## 🔌 API Endpoints Summary

### Authentication
```
POST /api/auth/register/customer
POST /api/auth/register/company
POST /api/auth/login
POST /api/auth/logout
POST /api/password-reset/request
POST /api/password-reset/reset
```

### Customers
```
GET    /api/customers/{id}
PUT    /api/customers/{id}
GET    /api/customers/{id}/dashboard
```

### Parcels
```
POST   /api/parcels
GET    /api/parcels/{id}
GET    /api/parcels/tracking/{trackingNumber}
GET    /api/parcels/track?trackingNumber=X&phoneLastFour=Y (PUBLIC)
GET    /api/parcels/customer/{customerId}
GET    /api/parcels/company/{companyId}
PATCH  /api/parcels/{id}/status
```

### Companies
```
POST   /api/companies
GET    /api/companies
GET    /api/companies/{id}
PUT    /api/companies/{id}
GET    /api/companies/{id}/dashboard
GET    /api/companies/{id}/analytics
GET    /api/companies?isHiring=true (PUBLIC)
GET    /api/companies/compare?from=X&to=Y&weight=Z
```

### Group Shipments (TWO AGENTS MODEL)
```
POST   /api/groups                                    (Company creates)
GET    /api/groups                                    (All groups)
GET    /api/groups/{id}
GET    /api/groups/code/{groupCode}
GET    /api/groups/city/{city}?status=OPEN           (Public listing)
GET    /api/groups/company/{companyId}
POST   /api/groups/join                              (Customer joins)
POST   /api/groups/{groupId}/activate                (Group filled - activate)
PUT    /api/groups/{groupId}/assign-pickup-agent     (Assign Agent 1)
PUT    /api/groups/{groupId}/assign-delivery-agent   (Assign Agent 2)
PATCH  /api/groups/{groupId}/pickup-complete         (Agent 1 finished)
PATCH  /api/groups/{groupId}/delivery-complete       (Agent 2 finished)
GET    /api/groups/{groupId}/members
GET    /api/groups/{groupId}/tracking
```

### Job Applications (NEW)
```
GET    /api/job-applications/public            (Public jobs listing)
POST   /api/job-applications                   (Submit application)
GET    /api/job-applications/{id}
GET    /api/job-applications/company/{companyId}
GET    /api/job-applications/status/{status}
PUT    /api/job-applications/{id}/review       (Approve/Reject)
POST   /api/job-applications/{id}/hire         (Create agent)
DELETE /api/job-applications/{id}
```

### Delivery Agents
```
POST   /api/agents
GET    /api/agents
GET    /api/agents/{id}
GET    /api/agents/company/{companyId}
GET    /api/agents/company/{companyId}/available?pincode=X&city=Y  (Filter: isActive=true AND isAvailable=true, Priority: same pincode > same city)
PUT    /api/agents/{id}
PATCH  /api/agents/{id}/availability               (Agent sets isAvailable)
PATCH  /api/agents/{id}/active                     (Company sets isActive)
GET    /api/agents/{id}/earnings
```

### Delivery Requests (Assignment Flow)
```
POST   /api/delivery-requests                      (Create when order accepted)
GET    /api/delivery-requests/{id}
GET    /api/delivery-requests/company/{companyId}
PUT    /api/delivery-requests/{id}/assign          (Company assigns agent)
PATCH  /api/delivery-requests/{id}/agent-response  (Agent accepts/rejects)
GET    /api/delivery-requests/agent/{agentId}      (Agent's pending requests)
```

### Payments
```
POST   /api/payments
GET    /api/payments/{id}
POST   /api/payments/{id}/process
POST   /api/payments/{id}/fail
POST   /api/payments/{id}/refund
GET    /api/payments/customer/{customerId}
```

### Ratings
```
POST   /api/ratings
GET    /api/ratings/parcel/{parcelId}
GET    /api/ratings/company/{companyId}/summary
GET    /api/ratings/agent/{agentId}/summary
```

### Super Admin
```
POST   /api/super-admin
GET    /api/super-admin/statistics
POST   /api/super-admin/companies/{id}/approve
POST   /api/super-admin/companies/{id}/reject
POST   /api/super-admin/customers/{id}/suspend
POST   /api/super-admin/customers/{id}/activate
GET    /api/super-admin/users
PUT    /api/super-admin/platform-settings
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios with interceptors
- **Routing:** React Router DOM v6
- **State:** React Context + useState
- **Notifications:** React Hot Toast
- **Icons:** Lucide React
- **UI Components:** Headless UI
- **Maps:** React Leaflet + OpenStreetMap

### Backend
- **Framework:** Spring Boot 3.x
- **Security:** Spring Security + JWT
- **ORM:** JPA/Hibernate
- **Database:** MySQL
- **Email:** Spring Boot Mail
- **SMS:** Twilio SDK
- **Payment:** Razorpay SDK

### Maps & Routing (100% Free)
- **Map Display:** Leaflet + OpenStreetMap tiles
- **Routing/ETA:** OSRM API (Open Source Routing Machine)
- **No API keys required for basic usage**

### Real-time
- **WebSocket:** Spring WebSocket
- **Agent location updates:** Every 10-15 seconds

### Deployment
- **Cloud:** AWS (EC2, RDS, S3)
- **Version Control:** Git/GitHub

---

## 📋 Implementation Priority

### Phase 1: Core Features
1. ✅ Authentication (all roles)
2. ✅ Customer shipment creation (3-step)
3. ✅ Company registration & approval
4. ✅ Agent management
5. ✅ Basic tracking

### Phase 2: Group Buy (Two Agents Model)
1. 🔄 Company creates group shipment
2. 🔄 Public group listing
3. 🔄 Customer joins group
4. 🔄 Pickup Agent & Delivery Agent assignment
5. 🔄 Group delivery complete

### Phase 3: Public Features
1. 📋 Public jobs page
2. 📋 Job application flow
3. 📋 Public tracking (receiver-friendly)
4. 📋 Landing page sections

### Phase 4: Advanced Features
1. 📋 Live tracking (WebSocket)
2. 📋 SMS/Email notifications
3. 📋 Map integrations

---

This documentation provides the complete reframed architecture for TPTS with the corrected Group Buy flow and the key features that will make the platform functional and user-friendly.
