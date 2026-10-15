# ConstructERP — Decision Log

## DEC-001: Frontend-First Implementation
- **Decision**: Implement full frontend with realistic mock data before backend
- **Rationale**: Allows UI/UX validation, workflow testing, and stakeholder review
- **Date**: 2026-01-28
- **Status**: Active

## DEC-002: Indian Locale Defaults
- **Decision**: Default timezone Asia/Kolkata, currency INR with Indian digit grouping
- **Rationale**: All operations are in India; statutory compliance requires Indian formatting
- **Date**: 2026-01-28
- **Status**: Active

## DEC-003: Status Workflow Enforcement
- **Decision**: All operational records follow draft → submitted → pending_approval → approved/rejected
- **Rationale**: Maker-checker controls required for audit compliance
- **Date**: 2026-01-28
- **Status**: Active

## DEC-004: Factual Language in Exceptions
- **Decision**: System describes deviations factually, never labels persons
- **Rationale**: Legal protection, professional standards, Indian labour law compliance
- **Example**: "Unexplained variance of 18 L" not "Possible fuel theft by operator"
- **Date**: 2026-01-28
- **Status**: Active

## DEC-005: Integration Transparency
- **Decision**: Mark unavailable integrations clearly; never simulate success
- **Rationale**: Principle 10 from Part 00; prevents false confidence in data
- **Date**: 2026-01-28
- **Status**: Active
