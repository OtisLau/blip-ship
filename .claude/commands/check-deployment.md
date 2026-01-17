---
model: claude-sonnet-4-5-20250929
---

# Deployment Checklist Generator

Create comprehensive deployment checklists that ensure safe, successful releases.

## Context
This command helps you create thorough pre-deployment checklists to verify your application is production-ready. It works with any application and deployment environment.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Application Context

First, understand what's being deployed:
- Verify the application/code exists and is ready for deployment
- Identify the technology stack and deployment target (cloud platform, containers, servers, etc.)
- Check for existing deployment configurations (CI/CD, infrastructure-as-code, etc.)
- Determine the deployment type (first deployment, update, rollback, etc.)
- If no application exists, inform the user that a checklist requires deployable code

### Step 2: Pre-Deployment Verification

**Code Quality**
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] No known critical bugs
- [ ] Security scan passed
- [ ] Dependency vulnerabilities addressed
- [ ] Code coverage meets threshold
- [ ] Static analysis clean
- [ ] Linting passes

**Configuration**
- [ ] Environment variables documented
- [ ] Secrets rotated and secured
- [ ] Configuration files validated
- [ ] Database connection strings correct
- [ ] API endpoints verified
- [ ] Feature flags configured
- [ ] Service dependencies identified
- [ ] Resource limits set

**Dependencies**
- [ ] All dependencies up to date
- [ ] No conflicting versions
- [ ] License compliance verified
- [ ] Third-party services confirmed operational
- [ ] API keys and credentials valid
- [ ] SSL certificates current
- [ ] DNS records configured

### 2. Infrastructure Readiness

**Environment Setup**
- [ ] Production environment provisioned
- [ ] Load balancers configured
- [ ] Auto-scaling rules set
- [ ] Firewall rules updated
- [ ] Network policies applied
- [ ] Storage volumes configured
- [ ] Backup systems operational

**Database**
- [ ] Migrations tested
- [ ] Backup completed
- [ ] Rollback plan prepared
- [ ] Connection pooling configured
- [ ] Indexes optimized
- [ ] Query performance validated
- [ ] Data integrity verified

**Monitoring and Logging**
- [ ] Logging configured and tested
- [ ] Metrics collection enabled
- [ ] Alerts configured
- [ ] Dashboards created
- [ ] Error tracking setup
- [ ] Performance monitoring active
- [ ] Distributed tracing enabled

### 3. Security Verification

**Access Control**
- [ ] Authentication tested
- [ ] Authorization rules verified
- [ ] API security validated
- [ ] HTTPS enforced
- [ ] CORS policies correct
- [ ] Rate limiting enabled
- [ ] DDoS protection active

**Data Protection**
- [ ] Encryption at rest enabled
- [ ] Encryption in transit verified
- [ ] PII handling compliant
- [ ] Data retention policies set
- [ ] Backup encryption enabled
- [ ] Key rotation scheduled

**Compliance**
- [ ] Regulatory requirements met
- [ ] Privacy policy updated
- [ ] Terms of service current
- [ ] Data processing agreements signed
- [ ] Audit logs enabled
- [ ] Compliance scans passed

### 4. Performance Validation

**Load Testing**
- [ ] Load tests completed
- [ ] Performance benchmarks met
- [ ] Stress tests passed
- [ ] Scalability verified
- [ ] Resource utilization acceptable
- [ ] Response times within SLA
- [ ] Throughput meets requirements

**Optimization**
- [ ] Caching configured
- [ ] CDN setup for static assets
- [ ] Database queries optimized
- [ ] Connection pooling tuned
- [ ] Memory usage optimized
- [ ] Startup time acceptable

### 5. Deployment Strategy

**Release Plan**
- [ ] Deployment window scheduled
- [ ] Stakeholders notified
- [ ] Maintenance window announced
- [ ] Team assignments clear
- [ ] Communication plan ready
- [ ] Rollback criteria defined

**Deployment Type**
- [ ] Blue-green deployment configured
- [ ] Canary release plan ready
- [ ] Rolling deployment strategy set
- [ ] Feature flags in place
- [ ] Traffic routing rules configured

### 6. Backup and Recovery

**Backup Verification**
- [ ] Full backup completed
- [ ] Backup tested and restorable
- [ ] Backup retention configured
- [ ] Off-site backup available
- [ ] Database dump created
- [ ] Configuration backed up
- [ ] Secrets backed up securely

**Rollback Plan**
- [ ] Previous version available
- [ ] Rollback procedure documented
- [ ] Rollback tested
- [ ] Data migration rollback plan
- [ ] DNS rollback prepared
- [ ] Feature flag rollback ready

### 7. Documentation

**Technical Documentation**
- [ ] Deployment guide updated
- [ ] Architecture diagrams current
- [ ] API documentation complete
- [ ] Configuration documented
- [ ] Runbooks updated
- [ ] Troubleshooting guide ready

**User Documentation**
- [ ] Release notes prepared
- [ ] User guide updated
- [ ] Training materials ready
- [ ] FAQ updated
- [ ] Known issues documented
- [ ] Support documentation current

### 8. Communication

**Internal Communication**
- [ ] Development team informed
- [ ] Operations team briefed
- [ ] Support team trained
- [ ] Management approval obtained
- [ ] Schedule communicated
- [ ] On-call rotation set

**External Communication**
- [ ] Users notified (if downtime)
- [ ] Status page updated
- [ ] Social media posts scheduled
- [ ] Email announcements prepared
- [ ] Customer support briefed

### 9. Post-Deployment Validation

**Smoke Tests**
- [ ] Critical paths tested
- [ ] Login functionality verified
- [ ] Payment processing tested
- [ ] API endpoints responsive
- [ ] Database connectivity confirmed
- [ ] External integrations working

**Monitoring**
- [ ] Error rates monitored
- [ ] Performance metrics tracked
- [ ] Log analysis performed
- [ ] User feedback collected
- [ ] Resource utilization checked
- [ ] Alert notifications verified

### 10. Incident Response

**Preparation**
- [ ] Incident response plan reviewed
- [ ] On-call engineer assigned
- [ ] Escalation path defined
- [ ] Communication templates ready
- [ ] War room procedures established
- [ ] Rollback authority assigned

**Post-Mortem**
- [ ] Deployment metrics collected
- [ ] Issues documented
- [ ] Lessons learned captured
- [ ] Process improvements identified
- [ ] Team retrospective scheduled

### 11. Compliance and Governance

**Change Management**
- [ ] Change request approved
- [ ] Risk assessment completed
- [ ] Testing evidence documented
- [ ] Approval workflows followed
- [ ] Audit trail maintained

**Quality Gates**
- [ ] All quality gates passed
- [ ] Performance benchmarks met
- [ ] Security scans clean
- [ ] Code coverage threshold met
- [ ] Manual testing completed

### 12. Business Continuity

**Service Availability**
- [ ] SLA requirements validated
- [ ] Redundancy verified
- [ ] Failover tested
- [ ] Disaster recovery plan ready
- [ ] Business continuity plan updated

## Output Format

1. **Pre-Flight Checklist**: Complete checklist organized by category
2. **Deployment Timeline**: Hour-by-hour deployment plan
3. **Team Responsibilities**: Who does what during deployment
4. **Risk Assessment**: Identified risks and mitigation strategies
5. **Rollback Procedures**: Step-by-step rollback guide
6. **Smoke Test Script**: Post-deployment validation tests
7. **Communication Templates**: Notification messages for different scenarios
8. **Post-Deployment Report**: Template for capturing deployment results

Focus on preventing common deployment failures through thorough preparation and verification at every stage.
