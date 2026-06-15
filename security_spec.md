# Security Specification for Lingua School Management

This document defines the data invariants, malicious "Dirty Dozen" payloads designed to test our protection boundaries, and the validation strategy for Firestore rules.

## 1. Data Invariants
1. **User Identity Invariant**: Users cannot create or modify User Profiles other than their own, unless they are a Directrice (Admin).
2. **Campus Invariant**: Only Directrice (Admin) roles can create or update Campus entities.
3. **Campus-Scoped Secretary Invariant**: A Secretary (`secretaire`) can only write or update entities (Students, Payments, Classes, Waitlist) if they match the secretary's specific `campusId`.
4. **Immutability of Key Fields**: Once created, `createdAt` and `id` keys of any entity cannot be modified.
5. **Finite Capacity Invariant**: Class updates are bound to strict properties, preventing artificial increases of student counts without validation.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` properties must strictly match `request.time`.

---

## 2. The "Dirty Dozen" Payloads (Aesthetic Anti-Bypass Checks)

### Payload 1: Privilege Escalation on User Profile Creation
Malicious user attempts to register as a `directrice` (administrator) role with global access.
```json
{
  "id": "attacker_uid",
  "name": "Attacker",
  "email": "attacker@spam.com",
  "role": "directrice",
  "campusId": null
}
```
*Expected Result:* `PERMISSION_DENIED` - Users cannot self-assign privileged roles.

### Payload 2: Ghost Field Insertion (Shadow Update Attack)
An attacker tries to update a Student profile inserting unvalidated parameters.
```json
{
  "id": "stud_123",
  "firstName": "John",
  "lastName": "Doe",
  "status": "actif",
  "ghost_field": "dangerous_payload"
}
```
*Expected Result:* `PERMISSION_DENIED` - Restrictive keys enforcement checks block unregistered variables.

### Payload 3: Creation with Spoofed ID Size (Denial of Wallet)
An attacker registers an entity with a massive string ID (1.5MB) to blow up indexing size and storage fees.
```json
{
  "id": "extremely_long_id_exceeding_128_characters_..."
}
```
*Expected Result:* `PERMISSION_DENIED` - Checked via `isValidId()` rule limiting key sizing.

### Payload 4: Arbitrary Campus Creation by Secretary
A secretary attempts to create a new school campus center.
*Expected Result:* `PERMISSION_DENIED` - Non-admin writes are strictly blocked.

### Payload 5: Secretary Mutating Student Record on Another Campus
Secretary on 'campus_A' tries to modify details of a student enrolled in 'campus_B'.
```json
{
  "campusId": "campus_B",
  "firstName": "Hacked"
}
```
*Expected Result:* `PERMISSION_DENIED` - Scoped writes must match the authenticated user's `campusId` in their profile.

### Payload 6: Forging Registration Timestamps
An instructor attempts to backdate the `createdAt` timestamp of a new registration manually.
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected Result:* `PERMISSION_DENIED` - Creation timestamps must equal `request.time`.

### Payload 7: Deleting System Transaction/Audit Logs
An employee attempts to delete a Payment logging transaction or Audit line to cover up financial discrepancy.
*Expected Result:* `PERMISSION_DENIED` - Audit logs and Payment receipts are write-only/immutable and cannot be deleted by standard users.

### Payload 8: Corrupting Class Capacity (Negative Count)
A user tries to set the class size to a negative amount to cause application exceptions.
```json
{
  "maxStudents": -10
}
```
*Expected Result:* `PERMISSION_DENIED` - Value bound checking blocks negative metrics.

### Payload 9: Hijacking Waitlist Queue Priority
A user attempts to insert themselves into waitlist position `0` or `-1` bypass.
```json
{
  "position": -1
}
```
*Expected Result:* `PERMISSION_DENIED` - Checked via positive constraints in rules.

### Payload 10: Email Spoofing Admin Request
An unverified Google account attempting to bypass directrice guard.
*Expected Result:* `PERMISSION_DENIED` - Verified check `request.auth.token.email_verified == true` blocks non-validated emails.

### Payload 11: Modifying Immutable Keys during Student Transfer
An apprentice updates a student document changing the fundamental `id` or historical `createdBy` identity.
```json
{
  "id": "new_spoofed_id",
  "createdBy": { "userId": "attacker" }
}
```
*Expected Result:* `PERMISSION_DENIED` - Blocked by custom field change inequality checks in the allow block.

### Payload 12: Overwriting Terminal Status Directly
An expired student has their status changed to active bypassing financial renewal fees.
```json
{
  "status": "actif"
}
```
*Expected Result:* `PERMISSION_DENIED` - Requires transition action checks or admin verification.
