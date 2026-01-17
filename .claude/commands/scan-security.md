---
model: claude-sonnet-4-5-20250929
---

# Security Scan and Vulnerability Assessment

Perform comprehensive security audits to identify vulnerabilities and provide remediation guidance.

## Context
This command helps you perform thorough security analysis to identify vulnerabilities, assess risks, and implement protection measures. It works with any codebase.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Codebase

First, verify what code exists to scan:
- Search for the application code, configuration files, and dependencies
- Identify the technology stack (web framework, language, database, etc.)
- Look for security-sensitive areas (authentication, authorization, data handling)
- If specific files/modules are mentioned in $ARGUMENTS, verify they exist
- If no code is found or unclear, ask the user for clarification

### Step 2: Security Assessment Scope

**Areas to Analyze**
- Input validation and sanitization
- Authentication and authorization
- Session management
- Cryptography usage
- Error handling and logging
- Security configuration
- Dependency vulnerabilities
- Code injection vulnerabilities
- Sensitive data exposure
- API security

### 2. OWASP Top 10 Assessment

**A01: Broken Access Control**
- Check authorization on all endpoints
- Verify user permissions
- Test for privilege escalation
- Check for insecure direct object references
- Validate session management

**A02: Cryptographic Failures**
- Review encryption implementation
- Check for hardcoded secrets
- Verify TLS/SSL configuration
- Assess password storage (hashing, salting)
- Review key management

**A03: Injection**
- SQL injection testing
- Command injection checks
- LDAP injection assessment
- Template injection review
- NoSQL injection testing

**A04: Insecure Design**
- Review threat modeling
- Assess security requirements
- Check for security patterns
- Validate business logic security
- Review attack surface

**A05: Security Misconfiguration**
- Default credentials check
- Unnecessary features enabled
- Error message information disclosure
- Security headers missing
- Outdated software versions

**A06: Vulnerable Components**
- Dependency vulnerability scan
- Known CVE checking
- Version tracking
- License compliance
- Supply chain security

**A07: Authentication Failures**
- Password policy review
- Multi-factor authentication
- Session fixation testing
- Credential stuffing protection
- Account enumeration prevention

**A08: Software and Data Integrity**
- Code signing verification
- Update mechanism security
- Serialization/deserialization safety
- CI/CD pipeline security
- Digital signature validation

**A09: Logging and Monitoring Failures**
- Security event logging
- Log integrity protection
- Alert configuration
- Incident response capability
- Audit trail completeness

**A10: Server-Side Request Forgery (SSRF)**
- URL validation
- Internal network protection
- DNS rebinding protection
- Cloud metadata protection
- Protocol filtering

### 3. Input Validation

**Validation Checks**
- Type validation
- Length validation
- Format validation (regex patterns)
- Range validation
- Whitelist validation
- Business rule validation

**Sanitization**
- HTML encoding for display
- SQL parameter binding
- Command injection prevention
- Path traversal prevention
- LDAP escaping
- XML entity expansion prevention

### 4. Authentication Security

**Password Security**
- Strong password requirements
- Password hashing (bcrypt, Argon2, PBKDF2)
- Salt generation and storage
- Password reset security
- Account lockout mechanisms
- Brute force protection

**Session Management**
- Secure session ID generation
- HttpOnly and Secure flags on cookies
- Session timeout configuration
- Session fixation prevention
- CSRF token implementation
- Same-Site cookie attribute

**Multi-Factor Authentication**
- Second factor implementation
- Backup codes
- Recovery mechanisms
- Device trust
- Rate limiting

### 5. Authorization Security

**Access Control**
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Least privilege principle
- Permission granularity
- Resource ownership validation
- Horizontal and vertical privilege escalation checks

**API Security**
- API key management
- OAuth2/OIDC implementation
- JWT security (signing, expiration)
- Rate limiting
- Input validation
- Output encoding

### 6. Data Protection

**Sensitive Data**
- Encryption at rest
- Encryption in transit (TLS 1.2+)
- Key management
- PII identification and protection
- Credit card data (PCI DSS)
- Health data (HIPAA)

**Data Exposure**
- Sensitive data in URLs
- Logging sensitive information
- Error message leakage
- Debug information exposure
- Source code comments

### 7. Security Headers

**Essential Headers**
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### 8. Dependency Security

**Vulnerability Scanning**
- Known CVE database checking
- Security advisory monitoring
- Version outdatedness assessment
- Transitive dependency analysis
- License compliance checking

**Remediation**
- Update to patched versions
- Apply security patches
- Remove unused dependencies
- Replace vulnerable libraries
- Implement compensating controls

### 9. Code Security

**Secure Coding Practices**
- No hardcoded credentials
- Proper error handling
- Secure randomness
- Safe deserialization
- Memory safety
- Resource cleanup

**Code Review Focus**
- Authentication logic
- Authorization checks
- Input validation
- Cryptography usage
- File operations
- Database queries

### 10. Security Testing

**Static Analysis (SAST)**
- Automated code scanning
- Rule-based vulnerability detection
- Data flow analysis
- Taint analysis
- Configuration scanning

**Dynamic Analysis (DAST)**
- Runtime vulnerability testing
- Penetration testing
- Fuzzing
- API security testing
- Authentication testing

### 11. Remediation Planning

**Priority Classification**
- Critical: Immediate fix required
- High: Fix within days
- Medium: Fix within weeks
- Low: Fix in next sprint

**Fix Implementation**
- Patch application
- Update dependencies
- Add input validation
- Implement security controls
- Update configuration

### 12. Security Best Practices

**Development**
- Security training
- Secure coding standards
- Code review guidelines
- Security testing in CI/CD
- Threat modeling

**Operations**
- Security monitoring
- Incident response plan
- Regular security audits
- Vulnerability disclosure program
- Security patch management

## Output Format

1. **Executive Summary**: Critical findings and overall risk
2. **Vulnerability Report**: Detailed findings with severity ratings
3. **OWASP Assessment**: Top 10 vulnerability analysis
4. **Dependency Report**: Vulnerable dependencies with CVEs
5. **Remediation Plan**: Prioritized fixes with implementation guidance
6. **Security Recommendations**: Best practices and preventive measures
7. **Compliance Status**: Regulatory compliance assessment
8. **Security Metrics**: KPIs and risk scores

Focus on actionable findings with clear remediation steps that immediately improve security posture.
