package com.tpts.service;

import com.tpts.dto.request.SendBulkEmailRequest;
import com.tpts.dto.response.EmailLogDTO;
import com.tpts.entity.*;
import com.tpts.entity.EmailLog.EmailLogStatus;
import com.tpts.entity.EmailLog.EmailRecipientType;
import com.tpts.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing email logs and sending bulk emails
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailLogService {

    private final EmailLogRepository emailLogRepository;
    private final EmailService emailService;
    private final CompanyAdminRepository companyRepository;
    private final CustomerRepository customerRepository;
    private final DeliveryAgentRepository agentRepository;

    /**
     * Send bulk email to companies/customers (admin only)
     */
    @Transactional
    public EmailLogDTO sendBulkEmail(SendBulkEmailRequest request, User sender) {
        EmailRecipientType recipientType = EmailRecipientType.valueOf(request.getRecipientType().toUpperCase());

        List<String[]> recipients = getRecipients(recipientType, request.getRecipientIds(), request.isSendToAll(),
                sender);

        if (recipients.isEmpty()) {
            log.warn("No recipients found for bulk email");
            return null;
        }

        // Create email log
        EmailLog emailLog = EmailLog.builder()
                .senderUser(sender)
                .senderName(getUserName(sender))
                .senderEmail(sender.getEmail())
                .recipientType(recipientType)
                .recipientId(request.isSendToAll() ? null
                        : (request.getRecipientIds() != null && request.getRecipientIds().size() == 1
                                ? request.getRecipientIds().get(0)
                                : null))
                .recipientName(request.isSendToAll() ? "All " + recipientType.name().toLowerCase() + "s"
                        : (recipients.size() == 1 ? recipients.get(0)[1] : recipients.size() + " recipients"))
                .recipientEmail(recipients.size() == 1 ? recipients.get(0)[0] : null)
                .recipientCount(recipients.size())
                .subject(request.getSubject())
                .message(request.getMessage())
                .status(EmailLogStatus.PENDING)
                .build();

        emailLog = emailLogRepository.save(emailLog);

        // Send emails
        int successCount = 0;
        int failCount = 0;
        List<String> errors = new ArrayList<>();

        for (String[] recipient : recipients) {
            try {
                String email = recipient[0];
                String name = recipient[1];
                emailService.sendBulkAdminEmail(email, name, request.getSubject(), request.getMessage());
                successCount++;
            } catch (Exception e) {
                failCount++;
                errors.add(recipient[0] + ": " + e.getMessage());
                log.error("Failed to send bulk email to {}: {}", recipient[0], e.getMessage());
            }
        }

        // Update log status
        if (failCount == 0) {
            emailLog.setStatus(EmailLogStatus.SENT);
        } else if (successCount == 0) {
            emailLog.setStatus(EmailLogStatus.FAILED);
            emailLog.setErrorMessage(String.join("; ", errors));
        } else {
            emailLog.setStatus(EmailLogStatus.PARTIAL);
            emailLog.setErrorMessage("Sent: " + successCount + ", Failed: " + failCount);
        }
        emailLog.setSentAt(LocalDateTime.now());
        emailLog = emailLogRepository.save(emailLog);

        log.info("Bulk email sent: {} recipients, {} success, {} failed",
                recipients.size(), successCount, failCount);

        return mapToDTO(emailLog);
    }

    /**
     * Send email to agents (company only)
     */
    @Transactional
    public EmailLogDTO sendEmailToAgents(SendBulkEmailRequest request, User sender) {
        // Find company
        CompanyAdmin company = companyRepository.findByUser(sender).orElse(null);
        if (company == null) {
            throw new IllegalArgumentException("Sender is not a company admin");
        }

        List<DeliveryAgent> agents;
        if (request.isSendToAll() || request.getRecipientIds() == null || request.getRecipientIds().isEmpty()) {
            agents = agentRepository.findByCompany(company);
        } else {
            agents = agentRepository.findAllById(request.getRecipientIds()).stream()
                    .filter(a -> a.getCompany().getId().equals(company.getId()))
                    .collect(Collectors.toList());
        }

        if (agents.isEmpty()) {
            log.warn("No agents found for email");
            return null;
        }

        // Create email log
        EmailLog emailLog = EmailLog.builder()
                .senderUser(sender)
                .senderName(company.getCompanyName())
                .senderEmail(sender.getEmail())
                .recipientType(EmailRecipientType.AGENT)
                .recipientId(agents.size() == 1 ? agents.get(0).getId() : null)
                .recipientName(request.isSendToAll() ? "All agents"
                        : (agents.size() == 1 ? agents.get(0).getFullName() : agents.size() + " agents"))
                .recipientEmail(agents.size() == 1 ? agents.get(0).getUser().getEmail() : null)
                .recipientCount(agents.size())
                .subject(request.getSubject())
                .message(request.getMessage())
                .status(EmailLogStatus.PENDING)
                .build();

        emailLog = emailLogRepository.save(emailLog);

        // Send emails
        int successCount = 0;
        int failCount = 0;

        for (DeliveryAgent agent : agents) {
            try {
                emailService.sendBulkAdminEmail(
                        agent.getUser().getEmail(),
                        agent.getFullName(),
                        request.getSubject(),
                        request.getMessage());
                successCount++;
            } catch (Exception e) {
                failCount++;
                log.error("Failed to send email to agent {}: {}", agent.getFullName(), e.getMessage());
            }
        }

        // Update log status
        if (failCount == 0) {
            emailLog.setStatus(EmailLogStatus.SENT);
        } else if (successCount == 0) {
            emailLog.setStatus(EmailLogStatus.FAILED);
        } else {
            emailLog.setStatus(EmailLogStatus.PARTIAL);
            emailLog.setErrorMessage("Sent: " + successCount + ", Failed: " + failCount);
        }
        emailLog.setSentAt(LocalDateTime.now());
        emailLog = emailLogRepository.save(emailLog);

        log.info("Email to agents sent: {} agents, {} success, {} failed",
                agents.size(), successCount, failCount);

        return mapToDTO(emailLog);
    }

    /**
     * Get email history for admin
     */
    public Page<EmailLogDTO> getEmailHistory(Pageable pageable) {
        return emailLogRepository.findAll(pageable).map(this::mapToDTO);
    }

    /**
     * Get email history by recipient type
     */
    public Page<EmailLogDTO> getEmailHistoryByType(EmailRecipientType type, Pageable pageable) {
        return emailLogRepository.findByRecipientTypeOrderByCreatedAtDesc(type, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Get email history for a company (their agent emails only)
     */
    public Page<EmailLogDTO> getCompanyEmailHistory(User companyUser, Pageable pageable) {
        return emailLogRepository.findBySenderUserAndRecipientTypeOrderByCreatedAtDesc(
                companyUser, EmailRecipientType.AGENT, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Get recent emails for dashboard
     */
    public List<EmailLogDTO> getRecentEmails() {
        return emailLogRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private List<String[]> getRecipients(EmailRecipientType type, List<Long> ids, boolean sendToAll, User sender) {
        List<String[]> recipients = new ArrayList<>();

        switch (type) {
            case COMPANY:
                List<CompanyAdmin> companies;
                if (sendToAll || ids == null || ids.isEmpty()) {
                    companies = companyRepository.findAll();
                } else {
                    companies = companyRepository.findAllById(ids);
                }
                for (CompanyAdmin c : companies) {
                    recipients.add(new String[] { c.getUser().getEmail(), c.getCompanyName() });
                }
                break;

            case CUSTOMER:
                List<Customer> customers;
                if (sendToAll || ids == null || ids.isEmpty()) {
                    customers = customerRepository.findAll();
                } else {
                    customers = customerRepository.findAllById(ids);
                }
                for (Customer c : customers) {
                    recipients.add(new String[] { c.getUser().getEmail(), c.getFullName() });
                }
                break;

            case AGENT:
                // For admin, get all agents; for company, this method shouldn't be used
                List<DeliveryAgent> agents;
                if (sendToAll || ids == null || ids.isEmpty()) {
                    agents = agentRepository.findAll();
                } else {
                    agents = agentRepository.findAllById(ids);
                }
                for (DeliveryAgent a : agents) {
                    recipients.add(new String[] { a.getUser().getEmail(), a.getFullName() });
                }
                break;
        }

        return recipients;
    }

    private String getUserName(User user) {
        switch (user.getUserType()) {
            case SUPER_ADMIN:
                return "TPTS Admin";
            case COMPANY_ADMIN:
                return companyRepository.findByUser(user)
                        .map(CompanyAdmin::getCompanyName)
                        .orElse("Company");
            case CUSTOMER:
                return customerRepository.findByUser(user)
                        .map(Customer::getFullName)
                        .orElse("Customer");
            case DELIVERY_AGENT:
                return agentRepository.findByUser(user)
                        .map(DeliveryAgent::getFullName)
                        .orElse("Agent");
            default:
                return user.getEmail();
        }
    }

    private EmailLogDTO mapToDTO(EmailLog emailLog) {
        return EmailLogDTO.builder()
                .id(emailLog.getId())
                .senderUserId(emailLog.getSenderUser() != null ? emailLog.getSenderUser().getId() : null)
                .senderName(emailLog.getSenderName())
                .senderEmail(emailLog.getSenderEmail())
                .recipientType(emailLog.getRecipientType())
                .recipientId(emailLog.getRecipientId())
                .recipientEmail(emailLog.getRecipientEmail())
                .recipientName(emailLog.getRecipientName())
                .recipientCount(emailLog.getRecipientCount())
                .subject(emailLog.getSubject())
                .message(emailLog.getMessage())
                .status(emailLog.getStatus())
                .errorMessage(emailLog.getErrorMessage())
                .sentAt(emailLog.getSentAt())
                .createdAt(emailLog.getCreatedAt())
                .build();
    }
}
