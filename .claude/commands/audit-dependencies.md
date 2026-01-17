---
model: claude-sonnet-4-5-20250929
---

# Dependency Audit and Security Analysis

Analyze project dependencies for vulnerabilities, licensing issues, and outdated packages.

## Context
This command helps you analyze project dependencies to identify security vulnerabilities, licensing conflicts, and maintenance risks. It works with any technology stack.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check for Dependency Files

First, search for dependency management files in the codebase:
- Look for package manifests (package.json, requirements.txt, Gemfile, pom.xml, go.mod, Cargo.toml, etc.)
- Look for lock files (package-lock.json, yarn.lock, Pipfile.lock, etc.)
- Identify the project's technology stack and package managers
- If no dependency files are found, inform the user that there's nothing to audit

### Step 2: Dependency Discovery

**Identify Dependency Files**
- Package manifest files (package.json, requirements.txt, Gemfile, etc.)
- Lock files (package-lock.json, yarn.lock, Pipfile.lock, etc.)
- Build configuration (pom.xml, build.gradle, Cargo.toml, etc.)
- Project configuration files

**Inventory Dependencies**
- Direct dependencies (explicitly declared)
- Transitive dependencies (dependencies of dependencies)
- Development dependencies
- Optional dependencies
- Peer dependencies

### 2. Vulnerability Scanning

**Known Vulnerabilities**
- CVE database checking
- Security advisory monitoring
- Exploit availability assessment
- Severity rating (Critical, High, Medium, Low)
- CVSS score analysis

**Vulnerability Sources**
- National Vulnerability Database (NVD)
- GitHub Security Advisories
- Package ecosystem advisories (npm, PyPI, RubyGems, etc.)
- Vendor security bulletins
- Security research disclosures

**Impact Assessment**
- Exploitability assessment
- Attack vector analysis
- Impact scope (confidentiality, integrity, availability)
- Affected functionality
- Exposure risk

### 3. Version Analysis

**Outdated Packages**
- Current version vs latest version
- Major version lag
- Minor version lag
- Patch version lag
- End-of-life status

**Update Safety**
- Breaking changes identification
- Deprecation warnings
- Migration guides availability
- Community adoption of new versions
- Stability assessment

### 4. License Compliance

**License Detection**
- Direct dependency licenses
- Transitive dependency licenses
- License compatibility matrix
- Copyleft licenses (GPL, LGPL, etc.)
- Permissive licenses (MIT, Apache, BSD)
- Commercial licenses
- Unknown or missing licenses

**Compliance Issues**
- Incompatible license combinations
- Restrictive license requirements
- Attribution requirements
- Distribution restrictions
- Patent clauses

### 5. Supply Chain Security

**Package Integrity**
- Package signature verification
- Checksum validation
- Maintainer reputation
- Package age and stability
- Download statistics

**Suspicious Indicators**
- Typosquatting attempts
- Recently created packages
- Unusual update patterns
- Obfuscated code
- Suspicious dependencies
- Maintainer account compromises

### 6. Maintenance Risk Assessment

**Package Health**
- Last update date
- Release frequency
- Open issues count
- Unresolved security issues
- Maintainer activity
- Community size and engagement
- Fork and star count

**Deprecation Status**
- Officially deprecated
- No longer maintained
- Archived repositories
- Migration paths available
- Alternative packages

### 7. Dependency Analysis

**Dependency Tree**
- Visualize dependency relationships
- Identify deep dependency chains
- Find duplicate dependencies (different versions)
- Locate circular dependencies
- Map dependency depth

**Bloat Detection**
- Unused dependencies
- Redundant functionality
- Alternative lighter packages
- Bundle size impact
- Load time impact

### 8. Remediation Strategies

**Update Recommendations**
- Safe updates (patch versions)
- Minor version updates with testing
- Major version updates with migration
- Alternative package suggestions
- Removal of unused dependencies

**Vulnerability Fixes**
- Direct updates to patched versions
- Workarounds for unpatched vulnerabilities
- Dependency pinning to safe versions
- Compensating security controls
- Vendor patches or backports

**License Remediation**
- Replace incompatible licenses
- Obtain commercial licenses
- Refactor to remove dependencies
- Implement alternative solutions
- Legal review recommendations

### 9. Automation

**Automated Scanning**
- CI/CD integration
- Pre-commit hooks
- Scheduled audits
- Pull request checks
- Real-time monitoring

**Automated Updates**
- Automated patch updates
- Dependabot/Renovate configuration
- Update grouping strategies
- Auto-merge safe updates
- Testing requirements

### 10. Reporting

**Audit Reports**
- Vulnerability summary (counts by severity)
- Outdated packages list
- License compliance report
- Supply chain risk assessment
- Remediation priority list

**Metrics**
- Total dependency count
- Vulnerability count by severity
- Average dependency age
- Update lag metrics
- License distribution

### 11. Best Practices

**Dependency Management**
- Use lock files for reproducibility
- Pin exact versions in production
- Regular dependency audits
- Minimize dependency count
- Vet new dependencies before adding
- Document dependency decisions

**Security Hygiene**
- Enable automated security alerts
- Review security advisories
- Update dependencies regularly
- Remove unused dependencies
- Use private package registries for sensitive code

**License Management**
- Maintain license inventory
- Define acceptable licenses
- Review new dependency licenses
- Document license compliance
- Legal team consultation for unclear cases

## Output Format

1. **Executive Summary**: High-level findings and risk assessment
2. **Vulnerability Report**: Detailed security vulnerabilities with CVEs
3. **Outdated Packages**: List of packages needing updates
4. **License Report**: License compliance analysis
5. **Supply Chain Assessment**: Package integrity and maintenance risks
6. **Remediation Plan**: Prioritized action items with commands
7. **Automated Fix Scripts**: Commands to update dependencies
8. **Metrics Dashboard**: Key metrics and trends
9. **Best Practices**: Recommendations for ongoing management

Focus on actionable insights that can be immediately implemented to improve dependency security and compliance.
