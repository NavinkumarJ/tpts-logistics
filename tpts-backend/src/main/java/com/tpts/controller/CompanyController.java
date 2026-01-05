package com.tpts.controller;

import com.tpts.dto.request.UpdateCompanyRequest;
import com.tpts.dto.request.UpdateHiringRequest;
import com.tpts.dto.response.ApiResponse;
import com.tpts.dto.response.CompanyDTO;
import com.tpts.dto.response.CompanyDashboardDTO;
import com.tpts.dto.response.CompanyPublicDTO;
import com.tpts.entity.User;
import com.tpts.service.CompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Company Controller
 * Handles all company-related endpoints
 *
 * Private Endpoints (Requires COMPANY_ADMIN role):
 * - GET /api/company/me - Get current company profile
 * - GET /api/company/dashboard - Get company dashboard
 * - PUT /api/company/profile - Update company profile
 * - PUT /api/company/hiring - Update hiring settings
 *
 * Public Endpoints (No auth required):
 * - GET /api/companies - Get all approved companies
 * - GET /api/companies/hiring - Get hiring companies (jobs page)
 * - GET /api/companies/city/{city} - Get companies by service city
 * - GET /api/companies/compare - Compare company prices
 * - GET /api/companies/{id} - Get company by ID (public info)
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class CompanyController {

    private final CompanyService companyService;

    // ==========================================
    // Private Endpoints (Company Admin Only)
    // ==========================================

    /**
     * Get current logged-in company profile
     * GET /api/company/me
     */
    @GetMapping("/api/company/me")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyDTO>> getCurrentCompany(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting profile for company user: {}", currentUser.getEmail());

        CompanyDTO company = companyService.getCompanyByUser(currentUser);

        return ResponseEntity.ok(ApiResponse.success(company, "Company profile retrieved"));
    }

    /**
     * Get company dashboard
     * GET /api/company/dashboard
     */
    @GetMapping("/api/company/dashboard")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyDashboardDTO>> getCompanyDashboard(
            @AuthenticationPrincipal User currentUser) {

        log.info("Getting dashboard for company user: {}", currentUser.getEmail());

        // Get company ID from user
        CompanyDTO company = companyService.getCompanyByUser(currentUser);
        CompanyDashboardDTO dashboard = companyService.getCompanyDashboard(company.getId(), currentUser);

        return ResponseEntity.ok(ApiResponse.success(dashboard, "Dashboard retrieved"));
    }

    /**
     * Update company profile
     * PUT /api/company/profile
     */
    @PutMapping("/api/company/profile")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyDTO>> updateCompanyProfile(
            @Valid @RequestBody UpdateCompanyRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Updating company profile for user: {}", currentUser.getEmail());

        // Get company ID from user
        CompanyDTO existingCompany = companyService.getCompanyByUser(currentUser);
        CompanyDTO company = companyService.updateCompany(existingCompany.getId(), request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(company, "Company profile updated"));
    }

    /**
     * Update hiring settings
     * PUT /api/company/hiring
     */
    @PutMapping("/api/company/hiring")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyDTO>> updateHiringSettings(
            @Valid @RequestBody UpdateHiringRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Updating hiring settings for user: {}", currentUser.getEmail());

        // Get company ID from user
        CompanyDTO existingCompany = companyService.getCompanyByUser(currentUser);
        CompanyDTO company = companyService.updateHiringSettings(existingCompany.getId(), request, currentUser);

        return ResponseEntity.ok(ApiResponse.success(company, "Hiring settings updated"));
    }

    // ==========================================
    // Public Endpoints (No Auth Required)
    // ==========================================

    /**
     * Get all approved companies
     * GET /api/companies
     */
    @GetMapping("/api/companies")
    public ResponseEntity<ApiResponse<List<CompanyPublicDTO>>> getAllCompanies() {

        log.info("Getting all approved companies");

        List<CompanyPublicDTO> companies = companyService.getAllApprovedCompanies();

        return ResponseEntity.ok(ApiResponse.success(companies,
                "Retrieved " + companies.size() + " companies"));
    }

    /**
     * Get hiring companies (for public jobs page)
     * GET /api/companies/hiring
     */
    @GetMapping("/api/companies/hiring")
    public ResponseEntity<ApiResponse<List<CompanyPublicDTO>>> getHiringCompanies() {

        log.info("Getting hiring companies");

        List<CompanyPublicDTO> companies = companyService.getHiringCompanies();

        return ResponseEntity.ok(ApiResponse.success(companies,
                "Retrieved " + companies.size() + " hiring companies"));
    }

    /**
     * Get companies by service city
     * GET /api/companies/city/{city}
     */
    @GetMapping("/api/companies/city/{city}")
    public ResponseEntity<ApiResponse<List<CompanyPublicDTO>>> getCompaniesByCity(
            @PathVariable String city) {

        log.info("Getting companies serving city: {}", city);

        List<CompanyPublicDTO> companies = companyService.getCompaniesByCity(city);

        return ResponseEntity.ok(ApiResponse.success(companies,
                "Retrieved " + companies.size() + " companies serving " + city));
    }

    /**
     * Compare company prices for a route
     * GET /api/companies/compare?from=Chennai&to=Bangalore&weight=2.5&distance=350
     */
    @GetMapping("/api/companies/compare")
    public ResponseEntity<ApiResponse<List<CompanyPublicDTO>>> compareCompanyPrices(
            @RequestParam("from") String fromCity,
            @RequestParam("to") String toCity,
            @RequestParam("weight") BigDecimal weightKg,
            @RequestParam(value = "distance", required = false) BigDecimal distanceKm) {

        log.info("Comparing prices from {} to {} for {}kg", fromCity, toCity, weightKg);

        List<CompanyPublicDTO> companies = companyService.compareCompanyPrices(
                fromCity, toCity, weightKg, distanceKm);

        return ResponseEntity.ok(ApiResponse.success(companies,
                "Found " + companies.size() + " companies for this route"));
    }

    /**
     * Get company by ID (public info only)
     * GET /api/companies/{id}
     */
    @GetMapping("/api/companies/{id}")
    public ResponseEntity<ApiResponse<CompanyPublicDTO>> getCompanyById(
            @PathVariable Long id) {

        log.info("Getting company by ID: {}", id);

        CompanyDTO company = companyService.getCompanyById(id);

        // Return only public information
        CompanyPublicDTO publicDTO = CompanyPublicDTO.builder()
                .id(company.getId())
                .companyName(company.getCompanyName())
                .city(company.getCity())
                .state(company.getState())
                .serviceCities(company.getServiceCities())
                .baseRatePerKm(company.getBaseRatePerKm())
                .baseRatePerKg(company.getBaseRatePerKg())
                .ratingAvg(company.getRatingAvg())
                .totalDeliveries(company.getTotalDeliveries())
                .isHiring(company.getIsHiring())
                .openPositions(company.getOpenPositions())
                .salaryRangeMin(company.getSalaryRangeMin())
                .salaryRangeMax(company.getSalaryRangeMax())
                .build();

        return ResponseEntity.ok(ApiResponse.success(publicDTO, "Company retrieved"));
    }

    // ==========================================
    // Messaging (Company Admin Only)
    // ==========================================

    private final com.tpts.service.EmailLogService emailLogService;

    /**
     * Send email to company agents
     * POST /api/company/messaging/send
     */
    @PostMapping("/api/company/messaging/send")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<com.tpts.dto.response.EmailLogDTO>> sendEmailToAgents(
            @Valid @RequestBody com.tpts.dto.request.SendBulkEmailRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Company sending email to agents - sendToAll: {}", request.isSendToAll());

        com.tpts.dto.response.EmailLogDTO result = emailLogService.sendEmailToAgents(request, currentUser);

        if (result == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No agents found"));
        }

        return ResponseEntity.ok(ApiResponse.success(result, "Email sent successfully"));
    }

    /**
     * Get company email history
     * GET /api/company/messaging/history
     */
    @GetMapping("/api/company/messaging/history")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<com.tpts.dto.response.EmailLogDTO>>> getCompanyEmailHistory(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "50") int limit) {

        log.info("Getting email history for company");

        org.springframework.data.domain.Page<com.tpts.dto.response.EmailLogDTO> history = emailLogService
                .getCompanyEmailHistory(currentUser,
                        org.springframework.data.domain.PageRequest.of(0, limit));

        return ResponseEntity.ok(ApiResponse.success(history.getContent(),
                history.getContent().size() + " emails retrieved"));
    }

    /**
     * Search company agents for messaging
     * GET /api/company/messaging/agents/search?q=
     */
    @GetMapping("/api/company/messaging/agents/search")
    @PreAuthorize("hasRole('COMPANY_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<com.tpts.dto.response.AgentDTO>>> searchCompanyAgents(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false, defaultValue = "") String q) {

        log.info("Searching company agents: {}", q);

        java.util.List<com.tpts.dto.response.AgentDTO> agents = companyService.searchAgents(currentUser, q);

        return ResponseEntity.ok(ApiResponse.success(agents,
                agents.size() + " agents found"));
    }
}
