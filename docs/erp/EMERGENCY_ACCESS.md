# Emergency Access Procedure (Break-Glass)

**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Classification:** CONFIDENTIAL — Security Critical

---

## Overview

This document defines the emergency access (break-glass) procedure for the ConstructERP system. Emergency access is a last-resort mechanism to regain administrative control when normal access methods are unavailable.

**Purpose:** Provide secure, audited, time-limited emergency access to the platform when all Website Administrators are locked out or unavailable.

**Scope:** This procedure applies to all production environments of the ConstructERP system.

---

## When to Use Emergency Access

Emergency access should **ONLY** be used in the following scenarios:

1. **All Website Administrators are unavailable** (e.g., simultaneous illness, vacation, termination)
2. **MFA devices are lost or compromised** for all administrative accounts
3. **System lockout** due to failed login attempts or security incident
4. **Critical system failure** requiring immediate administrative intervention
5. **Disaster recovery** situations where normal access is impossible

**DO NOT use emergency access for:**
- Routine administrative tasks
- Convenience (e.g., forgot password)
- Bypassing normal approval workflows
- Testing or development purposes

---

## Emergency Access Credentials

### Storage Location

Emergency access credentials are stored in **TWO separate secure locations**:

#### Location 1: Physical Safe
- **Location:** Company headquarters, Executive Director's office safe
- **Access:** Executive Director + CFO (dual control required)
- **Contents:**
  - Sealed envelope with emergency username
  - Sealed envelope with emergency password
  - Hardware security key (YubiKey or similar)
  - Printed copy of this procedure

#### Location 2: Digital Vault
- **Location:** Company password manager (e.g., 1Password, Bitwarden)
- **Access:** Emergency access group (3 designated individuals)
- **Contents:**
  - Emergency username
  - Emergency password (encrypted)
  - Recovery codes for MFA
  - Digital copy of this procedure

### Credential Rotation

Emergency access credentials **MUST** be rotated:
- **Every 90 days** (scheduled rotation)
- **Immediately after any use** (post-incident rotation)
- **When any authorized person leaves the company**
- **If compromise is suspected**

**Rotation Procedure:**
1. Generate new credentials using cryptographically secure random generator
2. Update both physical and digital storage locations
3. Notify all authorized individuals of the change
4. Test new credentials in a controlled manner
5. Document rotation in the audit log

---

## Emergency Access Activation Procedure

### Step 1: Authorization (5 minutes)

**Required Approvals:**
- Executive Director OR
- CFO OR
- CTO (in absence of above)

**Process:**
1. Contact the approver via phone (documented call)
2. Explain the emergency situation and why normal access is unavailable
3. Obtain verbal authorization
4. Document the authorization:
   - Approver name and title
   - Time of authorization
   - Reason for emergency access
   - Expected duration of access

### Step 2: Retrieve Credentials (5 minutes)

**From Physical Safe:**
1. Two authorized individuals must be present (dual control)
2. Open safe and retrieve sealed envelope
3. Open envelope in front of witness
4. Record credential retrieval in physical logbook:
   - Date and time
   - Names of individuals present
   - Envelope seal number (verify intact)

**From Digital Vault:**
1. Access password manager with personal credentials
2. Navigate to "Emergency Access" folder
3. Retrieve emergency credentials
4. System automatically logs access

### Step 3: Initiate Emergency Session (2 minutes)

1. Navigate to ConstructERP login page
2. Enter emergency username
3. Enter emergency password
4. When prompted for MFA, use hardware security key OR enter recovery code
5. System will display warning: "EMERGENCY ACCESS SESSION - ALL ACTIONS AUDITED"
6. Acknowledge warning to proceed

### Step 4: Perform Emergency Actions (Variable)

**Allowed Actions:**
- Reset user passwords
- Disable/enable user accounts
- Modify security settings
- Access system configuration
- View audit logs
- Perform system backups/restores

**Required Documentation:**
For EACH action performed:
1. Record action in emergency session log
2. Document reason for action
3. Note any affected users/systems
4. Capture screenshots if applicable

**Time Limit:**
- Emergency sessions automatically expire after **60 minutes**
- System will display countdown warning at 15, 5, and 1 minute marks
- All actions after expiration will be blocked

### Step 5: Session Termination (2 minutes)

**Automatic Termination:**
- Session expires after 60 minutes
- All active connections are terminated
- Emergency credentials are automatically invalidated

**Manual Termination:**
- Click "End Emergency Session" button
- Confirm termination
- System logs termination event

### Step 6: Post-Access Review (Within 24 hours)

**Mandatory Review Meeting:**
- Attendees: Executive Director, CFO, CTO, IT Security Manager
- Agenda:
  1. Review all actions taken during emergency session
  2. Verify all actions were necessary and appropriate
  3. Identify any security concerns or policy violations
  4. Document lessons learned
  5. Approve credential rotation

**Review Documentation:**
- Meeting minutes
- Action log review
- Security assessment
- Recommendations for process improvement

### Step 7: Credential Rotation (Within 48 hours)

**Rotation Procedure:**
1. Generate new emergency credentials
2. Update physical safe (new sealed envelope)
3. Update digital vault
4. Invalidate old credentials in system
5. Test new credentials
6. Notify all authorized individuals
7. Document rotation in audit log

---

## Audit and Compliance

### Audit Trail

Every emergency access session generates a comprehensive audit trail:

**Session-Level Audit:**
- Session ID
- Start time and end time
- User who initiated access
- Authorization details
- All actions performed (timestamped)
- Session termination method

**Action-Level Audit:**
- Action type
- Target entity (user, config, etc.)
- Previous values (if applicable)
- New values (if applicable)
- Reason provided
- IP address and device information

### Audit Log Retention

- **Emergency access audit logs:** Retained for **7 years** (regulatory compliance)
- **Logs stored in:** Immutable audit storage (write-once, read-many)
- **Access to logs:** Restricted to IT Security Manager, CFO, Executive Director
- **Backup:** Daily backup to offsite secure location

### Compliance Reporting

**Quarterly Report:**
- Number of emergency access sessions
- Reasons for emergency access
- Actions performed
- Review meeting outcomes
- Credential rotation status

**Annual Audit:**
- Full review of all emergency access events
- Compliance with procedure
- Security assessment
- Procedure update recommendations

---

## Security Controls

### Multi-Factor Authentication

Emergency access requires **TWO factors**:
1. **Something you know:** Emergency password
2. **Something you have:** Hardware security key OR recovery code

**Hardware Security Key:**
- Stored in physical safe with credentials
- FIDO2/WebAuthn compliant (e.g., YubiKey 5)
- Tamper-evident packaging
- Replaced during credential rotation

**Recovery Codes:**
- 10 single-use recovery codes
- Stored in digital vault (encrypted)
- Each code valid for one emergency session
- Regenerated during credential rotation

### Network Restrictions

Emergency access is restricted to:
- **Corporate network:** Company VPN or office network
- **IP allowlist:** Pre-approved IP addresses only
- **Geographic restrictions:** Access only from approved countries

**Blocked Scenarios:**
- Public Wi-Fi networks
- Foreign IP addresses
- Tor/VPN services (except corporate VPN)
- Mobile networks (unless corporate-managed)

### Session Security

**Session Characteristics:**
- **Duration:** Maximum 60 minutes (hard limit)
- **Idle timeout:** 10 minutes of inactivity
- **Single session:** Only one emergency session active at a time
- **Concurrent access:** Blocked (other admins notified)

**Security Monitoring:**
- Real-time alerting to IT Security Manager
- Session activity logged every 30 seconds
- Anomaly detection (unusual actions, rapid changes)
- Automatic session termination on suspicious activity

### Credential Security

**Password Requirements:**
- Minimum 32 characters
- Cryptographically random generation
- No dictionary words or patterns
- Stored as salted hash (bcrypt, cost factor 12)

**Encryption:**
- Credentials encrypted at rest (AES-256)
- Encryption keys stored in HSM (Hardware Security Module)
- Key rotation every 90 days

---

## Roles and Responsibilities

### Executive Director
- **Approve** emergency access requests
- **Conduct** post-access review meetings
- **Ensure** procedure compliance
- **Authorize** credential rotation

### CFO
- **Approve** emergency access (backup to Executive Director)
- **Participate** in post-access reviews
- **Monitor** compliance and audit logs
- **Authorize** physical safe access

### CTO
- **Approve** emergency access (if Executive Director and CFO unavailable)
- **Lead** technical aspects of emergency response
- **Conduct** post-incident analysis
- **Update** emergency procedures as needed

### IT Security Manager
- **Maintain** emergency access credentials
- **Monitor** emergency access sessions in real-time
- **Conduct** post-access security assessments
- **Manage** audit log retention and access
- **Coordinate** credential rotation

### Website Administrators
- **Follow** emergency access procedure if activated
- **Document** all actions during emergency session
- **Participate** in post-access reviews
- **Report** any security concerns immediately

---

## Training and Drills

### Initial Training

All authorized individuals must complete:
1. **Procedure review:** Read and understand this document
2. **Hands-on training:** Practice emergency access in test environment
3. **Security awareness:** Understand risks and mitigation strategies
4. **Compliance training:** Regulatory requirements and audit expectations

**Training Frequency:**
- **Initial:** Before being added to authorized list
- **Annual:** Refresher training for all authorized individuals
- **Post-incident:** After any emergency access use

### Quarterly Drills

**Drill Scenario:**
1. Simulate system lockout (test environment)
2. Execute emergency access procedure
3. Perform sample administrative actions
4. Terminate session and conduct review
5. Document lessons learned

**Drill Objectives:**
- Validate procedure effectiveness
- Test credential retrieval process
- Practice authorization workflow
- Identify process improvements

**Drill Documentation:**
- Drill date and participants
- Scenario description
- Actions performed
- Time to complete each step
- Issues encountered
- Recommendations

---

## Incident Response

### During Emergency Access

**If security breach is suspected:**
1. **Immediately terminate** emergency session
2. **Notify** IT Security Manager and CTO
3. **Preserve** all audit logs and evidence
4. **Activate** incident response plan
5. **Document** timeline of events

**If system instability occurs:**
1. **Stop** all administrative actions
2. **Assess** system state
3. **Rollback** changes if necessary
4. **Notify** relevant stakeholders
5. **Document** incident and resolution

### Post-Incident

**Within 24 hours:**
- Conduct post-incident review meeting
- Analyze audit logs for suspicious activity
- Assess security impact
- Document lessons learned

**Within 72 hours:**
- Complete security assessment
- Implement corrective actions
- Update procedures if needed
- Report to executive leadership

**Within 30 days:**
- Complete full incident report
- Conduct tabletop exercise
- Update training materials
- Schedule follow-up review

---

## Procedure Updates

### Review Schedule

- **Quarterly:** Review procedure effectiveness
- **Annually:** Comprehensive procedure update
- **Post-incident:** Update based on lessons learned
- **Regulatory change:** Update to maintain compliance

### Change Management

**Proposed changes must:**
1. Be documented in writing
2. Be reviewed by IT Security Manager
3. Be approved by Executive Director
4. Be communicated to all authorized individuals
5. Be reflected in updated training materials

**Version control:**
- All procedure versions archived
- Change log maintained
- Old versions marked as "SUPERSEDED"
- Current version clearly identified

---

## Contact Information

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Executive Director | [Name] | [Phone] | [Email] |
| CFO | [Name] | [Phone] | [Email] |
| CTO | [Name] | [Phone] | [Email] |
| IT Security Manager | [Name] | [Phone] | [Email] |

### After-Hours Support

- **IT Security Hotline:** [Phone number]
- **Executive On-Call:** [Phone number]
- **External Security Consultant:** [Company, Phone]

---

## Appendix A: Emergency Access Log Template

```
EMERGENCY ACCESS LOG
====================

Session ID: [Auto-generated]
Date: [YYYY-MM-DD]
Start Time: [HH:MM:SS]
End Time: [HH:MM:SS]

Authorization:
- Approver: [Name, Title]
- Time: [HH:MM:SS]
- Reason: [Detailed explanation]

Credentials Retrieved:
- Location: [Physical Safe / Digital Vault]
- Retrieved By: [Name]
- Witness: [Name]
- Time: [HH:MM:SS]

Actions Performed:
1. [HH:MM:SS] - [Action] - [Target] - [Reason]
2. [HH:MM:SS] - [Action] - [Target] - [Reason]
3. [HH:MM:SS] - [Action] - [Target] - [Reason]

Session Termination:
- Method: [Automatic / Manual]
- Time: [HH:MM:SS]
- Terminated By: [System / Name]

Post-Access Review:
- Review Date: [YYYY-MM-DD]
- Reviewers: [Names]
- Findings: [Summary]
- Recommendations: [List]

Credential Rotation:
- Rotated: [Yes / No]
- Rotation Date: [YYYY-MM-DD]
- Performed By: [Name]

Signatures:
- Session Initiator: _________________ Date: _______
- Authorizer: _________________ Date: _______
- Reviewer: _________________ Date: _______
```

---

## Appendix B: Checklist for Emergency Access

### Pre-Access
- [ ] Authorization obtained from Executive Director/CFO/CTO
- [ ] Reason documented
- [ ] Two authorized individuals present (if physical safe)
- [ ] Credentials retrieved and verified
- [ ] IT Security Manager notified

### During Access
- [ ] Warning acknowledged
- [ ] All actions documented
- [ ] Time monitored (60-minute limit)
- [ ] No unauthorized actions performed
- [ ] Session terminated properly

### Post-Access
- [ ] Review meeting scheduled (within 24 hours)
- [ ] Audit logs reviewed
- [ ] Credentials rotated (within 48 hours)
- [ ] Incident report completed (if applicable)
- [ ] Procedure updated (if needed)

---

## Appendix C: Quick Reference Card

**EMERGENCY ACCESS - QUICK REFERENCE**

**Step 1:** Get authorization (Executive Director/CFO/CTO)  
**Step 2:** Retrieve credentials (Physical safe or digital vault)  
**Step 3:** Login with emergency username + password + MFA  
**Step 4:** Perform necessary actions (document everything)  
**Step 5:** End session (automatic after 60 minutes)  
**Step 6:** Conduct review meeting (within 24 hours)  
**Step 7:** Rotate credentials (within 48 hours)

**Emergency Contacts:**
- Executive Director: [Phone]
- CFO: [Phone]
- CTO: [Phone]
- IT Security: [Phone]

**CRITICAL REMINDERS:**
- ALL actions are audited
- Session expires in 60 minutes
- Credentials must be rotated after use
- Review meeting is mandatory

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Executive Director | | | |
| CFO | | | |
| CTO | | | |
| IT Security Manager | | | |

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial version |

---

**Next Review Date:** April 28, 2026
