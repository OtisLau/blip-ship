---
model: claude-sonnet-4-5-20250929
---

# Code Migration Assistant

Help migrate code between technologies, upgrade frameworks, or modernize legacy systems.

## Context
This command helps you migrate code from one technology to another - whether upgrading frameworks, porting to a different language, updating deprecated APIs, or modernizing legacy systems. It works with any codebase.

## Requirements
$ARGUMENTS

## Instructions

### Step 1: Check Current Codebase

First, identify what exists in the codebase:
- Search for the code/files/modules that need to be migrated
- Identify the current technology stack (frameworks, versions, dependencies)
- If the code doesn't exist or location is unclear, ask the user for clarification
- Review the project structure to understand the scope

### Step 2: Migration Analysis

**Assess Current State**
- Identify source technology (language, framework, version)
- Identify target technology (language, framework, version)
- Catalog all dependencies and their versions
- Map deprecated/removed features
- Identify breaking changes
- Assess code complexity and size

**Compatibility Assessment**
- Feature parity analysis
- API mapping (old → new)
- Pattern equivalents
- Performance implications
- Security considerations
- Community support and resources

### 2. Migration Strategy

**Approach Selection**
- **Big Bang**: Complete migration at once (small codebases)
- **Incremental**: Gradual module-by-module migration
- **Strangler Pattern**: New system alongside old, gradual replacement
- **Adapter Layer**: Compatibility layer during transition

**Risk Assessment**
- Business continuity risks
- Data migration risks
- Performance regression risks
- Security vulnerability risks
- Team knowledge gaps

**Rollback Plan**
- Version control strategy
- Feature flags for gradual rollout
- Backup and restore procedures
- Rollback triggers and criteria

### 3. Migration Plan

**Phase 1: Preparation**
- Set up new environment
- Install target framework/language
- Configure build tools
- Set up testing infrastructure
- Create migration branch
- Backup existing code and data

**Phase 2: Dependencies**
- Update package manager files
- Migrate to new package versions
- Replace deprecated libraries
- Resolve dependency conflicts
- Update build scripts
- Test dependency installation

**Phase 3: Code Migration**
- Identify migration patterns
- Create conversion scripts where possible
- Migrate configuration files
- Update imports/includes
- Migrate data models/schemas
- Update business logic
- Migrate tests
- Update documentation

**Phase 4: Testing**
- Unit test validation
- Integration test updates
- End-to-end testing
- Performance testing
- Security scanning
- User acceptance testing

**Phase 5: Deployment**
- Staging environment deployment
- Production deployment plan
- Monitoring and alerting
- Rollback procedures
- Post-deployment validation

### 4. Common Migration Patterns

**API Modernization**
- Callback → Promise → Async/Await
- Imperative → Declarative
- Monolith → Microservices
- REST → GraphQL
- Sync → Async

**Framework Upgrades**
- Update syntax for breaking changes
- Replace removed features
- Adopt new best practices
- Update configuration format
- Migrate to new APIs

**Language Porting**
- Type system differences
- Null handling variations
- Error handling patterns
- Concurrency models
- Memory management approaches
- Standard library equivalents

### 5. Code Conversion

**Automated Conversion**
- Use migration tools/codemods when available
- Write custom scripts for repetitive patterns
- Validate automated conversions
- Manual review of critical sections

**Manual Conversion**
- Complex logic requiring redesign
- Performance-critical sections
- Security-sensitive code
- Business-critical functionality
- Intricate algorithms

**Pattern Mapping**
- Document common pattern conversions
- Create conversion guide for team
- Maintain consistency across migration
- Use idiomatic patterns in target technology

### 6. Testing Strategy

**Parallel Testing**
- Run old and new versions side-by-side
- Compare outputs for equivalence
- Monitor performance differences
- Validate business logic parity

**Regression Testing**
- Comprehensive test suite execution
- Edge case validation
- Error scenario testing
- Integration point testing
- Load and performance testing

**User Testing**
- Beta testing with subset of users
- Feedback collection
- Issue tracking and resolution
- Gradual rollout

### 7. Data Migration

If applicable:

**Schema Migration**
- Map old schema to new
- Handle data type changes
- Preserve relationships
- Maintain constraints
- Update indexes

**Data Transfer**
- Extract from old system
- Transform to new format
- Load into new system
- Validate data integrity
- Handle migration failures

### 8. Documentation

**Migration Documentation**
- Decision records
- Pattern conversion guide
- Breaking changes list
- Known issues and workarounds
- Performance comparisons
- Security improvements

**Developer Guide**
- Setup instructions for new stack
- Coding standards for new technology
- Common patterns and examples
- Troubleshooting guide
- FAQ

### 9. Team Enablement

**Knowledge Transfer**
- Training on new technology
- Pair programming sessions
- Code review guidelines
- Best practices documentation
- Resource recommendations

**Ongoing Support**
- Migration progress tracking
- Issue escalation process
- Expert consultation availability
- Community resources

## Output Format

1. **Migration Assessment**: Current state, target state, and gap analysis
2. **Migration Strategy**: Chosen approach with justification
3. **Detailed Plan**: Phase-by-phase breakdown with timelines
4. **Code Mappings**: Pattern conversions and equivalents
5. **Migrated Code**: Complete, functional implementation
6. **Test Results**: Validation and comparison metrics
7. **Documentation**: Updated guides and references
8. **Rollback Plan**: Procedures if migration issues occur

Focus on safe, incremental migration with comprehensive testing and clear rollback procedures to minimize risk.
