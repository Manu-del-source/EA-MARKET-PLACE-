# Security Specification & Test Suite Details

This document covers the security analysis, data invariants, threat model, and "Dirty Dozen" invalid payloads designed to verify our zero-trust security configuration.

## 1. Data Invariants

1. **User Invariants**:
   - Every user profile must match the authenticating Firebase UID. A user cannot create or update a profile mapping to another user's UID.
   - User database balances must remain above or equal to 0.

2. **EA Bot Invariants**:
   - An EA Bot can only be created by an authenticated user with a verified email address.
   - The bot's `ownerId` must strictly equal the creator's UID.
   - Initial listings of EA Bots must start with 0 downloads and a rating of 0 to prevent artificial reputation injection.
   - When updating the EA Bot description or price, the `ownerId` and `createdAt` fields must be completely immutable.

3. **Purchase Invariants**:
   - A Purchase record is strictly immutable. No modifications or deletions are allowed after creation.
   - The buyer can only create a purchase where `buyerId` matches their authenticated UID.
   - The purchase date must be matched synchronously to `request.time` (the server value).

4. **Review Invariants**:
   - Reviews are limited to authenticated and verified users.
   - A user can only write reviews under their own authenticated identity. The `userId` must equal the writer's Firebase user ID.

---

## 2. The "Dirty Dozen" Payloads (Red Team Test Scenarios)

These payloads are designed to attempt breaking the system's security logic, forcing a block.

1. **Spoofed User Creation** (`users/hacker123`):
   - Hacker authenticated as `victim789` attempts to write profile data to `users/hacker123` with high balance.
   - **Expectation**: `PERMISSION_DENIED` due to UID mismatch.

2. **Ghost-Field Injection** (`users/myuid`):
   - Adding a shadow field `isAdmin: true` into the user document.
   - **Expectation**: `PERMISSION_DENIED` since keys must match the schema and cannot contain arbitrary keys.

3. **Spoofed Bot Creator** (`bots/bot999`):
   - Hacker creates a bot with `ownerId` set to a famous developer (`dev456`).
   - **Expectation**: `PERMISSION_DENIED` because the ownerId field in the request must match `request.auth.uid`.

4. **Self-Rated High Reputation on Listing** (`bots/bot222`):
   - Developer list a newly created bot claiming `rating: 5.0` and `downloads: 5000` to spoof marketplace reviews.
   - **Expectation**: `PERMISSION_DENIED` as initial downloads and ratings must be validated to be 0 or empty is required on creation.

5. **Malicious ID Injection** (`bots/malicious_sql_inj_or_long_string_junk`):
   - Hacker attempts to inject a huge string (2KB) as a document ID to crash parsing services.
   - **Expectation**: `PERMISSION_DENIED` because IDs are strictly validated to be size <= 128 characters and match alphanumeric standard via `isValidId()`.

6. **Immortal Field Tampering** (`bots/bot123`):
   - Updating the bot's `createdAt` timestamp to list it as "Brand New".
   - **Expectation**: `PERMISSION_DENIED` because `createdAt` must match original `existing().createdAt`.

7. **The Drift Attack (Client Timestamp)** (`bots/bot456`):
   - Setting a future timestamp `updatedAt: 2040-01-01` to lock listings.
   - **Expectation**: `PERMISSION_DENIED` since `updatedAt` must equal `request.time`.

8. **Unverified Email Listing**:
   - A user with an unverified email address attempts to publish a bot on the marketplace.
   - **Expectation**: `PERMISSION_DENIED` because the rules require `request.auth.token.email_verified == true` for standard actions.

9. **Purchase Hijacking**:
   - Hacker attempts to create a purchase record where `buyerId` is set to `victim789`.
   - **Expectation**: `PERMISSION_DENIED` because `incoming().buyerId` must match the authenticated UID.

10. **Purchase Modification**:
    - Hacker tries to update a purchase record to change the purchase price to 0.
    - **Expectation**: `PERMISSION_DENIED` because purchases are immutable (`allow update: if false;`).

11. **Spoofed Reviewer**:
    - Creating a Review where the `userName` is a regular user, but the `userId` is set to another user.
    - **Expectation**: `PERMISSION_DENIED` because `userId` must match `request.auth.uid`.

12. **Blind Scraping via General Queries (Query Scraping)**:
    - Attempting to run a list query on `/purchases` without filtering by `buyerId == request.auth.uid`.
    - **Expectation**: `PERMISSION_DENIED` because the `allow list` rule explicitly restricts query results to items belonging to the active user.

---

## 3. Test Runner Definition

The verification test suite resides in our application testing setup or local dev validation server. We will ensure all Firestore accesses are secure and error handlers are configured in compliance with the guidelines.
