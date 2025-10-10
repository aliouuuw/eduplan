# Password Reset System

## Overview

The EduPlan system includes a comprehensive password reset functionality that allows users to request password resets without requiring email services. The system is managed by superadmins who review and approve password reset requests.

## Architecture

The password reset system consists of two main components:

### 1. Password Reset Requests (User-Initiated)
- Users can submit password reset requests through the login page
- Requests are stored and reviewed by superadmins
- Superadmins can approve or reject requests from the dashboard

### 2. Password Reset Links (Admin-Generated)
- Superadmins can generate password reset links directly for users
- Reset links expire after 24 hours
- Links can only be used once

## User Flow

### For Users:

1. **Forgot Password Page** (`/forgot-password`)
   - User navigates from login page
   - Enters their email address
   - Submits request
   - Receives confirmation (regardless of whether email exists - security measure)

2. **Password Reset Page** (`/reset-password/[token]`)
   - User receives reset link from administrator
   - Clicks link and enters new password
   - Password is updated and user can log in

### For Superadmins:

1. **Password Reset Requests Dashboard** (`/dashboard/superadmin/password-resets`)
   - View all pending password reset requests
   - See user information (name, role, account status)
   - Approve requests to generate reset links
   - Reject requests with optional notes
   - Copy generated reset links to share with users

2. **Direct Reset from Users Page** (`/dashboard/superadmin/users`)
   - Generate password reset links directly for any active user
   - Useful for immediate password reset needs
   - Bypasses the request system

## Database Schema

### `password_reset_requests` Table
```sql
- id: text (primary key)
- email: text (email address from request)
- userId: text (nullable - matched user ID if found)
- status: enum ('pending', 'approved', 'rejected')
- approvedBy: text (nullable - superadmin who processed)
- notes: text (nullable - admin notes)
- createdAt: timestamp
- updatedAt: timestamp
```

### `password_resets` Table
```sql
- id: text (primary key)
- userId: text (user receiving reset link)
- email: text (user's email)
- token: text (unique reset token)
- expiresAt: timestamp (24 hours from creation)
- createdBy: text (superadmin who created link)
- usedAt: timestamp (nullable - when link was used)
- createdAt: timestamp
```

## API Routes

### Password Reset Requests

#### `POST /api/password-reset-requests`
- **Public endpoint** - no authentication required
- Create a new password reset request
- Request body: `{ email: string }`
- Always returns success to prevent email enumeration

#### `GET /api/password-reset-requests`
- **Superadmin only**
- Get all password reset requests with user information
- Returns list of requests sorted by creation date (newest first)

#### `PUT /api/password-reset-requests/[id]`
- **Superadmin only**
- Approve or reject a password reset request
- Request body: `{ action: 'approve' | 'reject', notes?: string }`
- On approval: generates password reset link
- Returns reset link in response

#### `DELETE /api/password-reset-requests/[id]`
- **Superadmin only**
- Delete a password reset request
- Used to clean up old/processed requests

### Password Resets

#### `POST /api/password-resets`
- **Superadmin only**
- Manually generate a password reset link for a user
- Request body: `{ userId: string }`
- Returns reset link in response

#### `GET /api/password-resets`
- **Superadmin only**
- Get all password reset links (active and used)

#### `GET /api/password-resets/[token]`
- **Public endpoint**
- Verify if a password reset token is valid
- Returns user information if valid

#### `POST /api/password-resets/reset`
- **Public endpoint**
- Reset password using a valid token
- Request body: `{ token: string, newPassword: string }`
- Marks token as used after successful reset

## Security Features

1. **Email Enumeration Protection**
   - System always returns success when user submits reset request
   - Prevents attackers from discovering valid email addresses

2. **Token Expiration**
   - All reset links expire after 24 hours
   - Reduces window for potential abuse

3. **Single Use Tokens**
   - Each reset link can only be used once
   - Prevents replay attacks

4. **Admin Review**
   - All user-initiated requests must be approved by superadmin
   - Provides control and prevents automated attacks

5. **Account Status Checks**
   - Reset links can only be generated for active users
   - Prevents password resets for deactivated accounts

## UI Components

### Login Page
- Added "Request a reset link" link to `/forgot-password`
- Removed old passive message

### Forgot Password Page
- Clean, user-friendly form
- Email input with validation
- Success confirmation screen

### Password Reset Page
- Token verification with loading state
- Password change form with confirmation
- Error handling for invalid/expired tokens
- Success state with redirect to login

### Superadmin Dashboard
- New "Password Resets" navigation item
- Pending requests section with approve/reject actions
- Processed requests history
- Statistics cards (pending, approved, rejected)
- Copy-to-clipboard functionality for reset links

### Users Page Enhancement
- Added "Reset Password" button for each user
- Direct password reset link generation
- Disabled for inactive users

## Best Practices

1. **For Superadmins:**
   - Review password reset requests promptly
   - Verify user identity before approving requests
   - Add notes when rejecting requests for audit trail
   - Share reset links securely (via official channels)

2. **Security Considerations:**
   - Reset links should only be shared through secure channels
   - Monitor for unusual patterns in password reset requests
   - Regularly clean up old processed requests
   - Keep reset link expiration time reasonable (24 hours)

3. **User Support:**
   - Inform users about the 24-hour expiration
   - Provide alternative contact methods for urgent cases
   - Document the password reset process for users

## Future Enhancements

Potential improvements for Phase 2:

1. **Email Integration**
   - Automatic email notifications when request is processed
   - Email delivery of reset links
   - Request status notifications

2. **Rate Limiting**
   - Limit password reset requests per email/IP
   - Prevent abuse and spam

3. **Multi-Factor Authentication**
   - Additional verification for password resets
   - SMS/TOTP verification options

4. **Audit Logging**
   - Detailed logs of all password reset activities
   - Track who approved/rejected requests

5. **Admin Notifications**
   - Alert superadmins of new password reset requests
   - Dashboard badge/counter for pending requests

## Testing Checklist

- [ ] User can submit password reset request
- [ ] Invalid email shows success message (security)
- [ ] Superadmin can view pending requests
- [ ] Superadmin can approve request and get reset link
- [ ] Superadmin can reject request with notes
- [ ] Reset link works within 24 hours
- [ ] Reset link expires after 24 hours
- [ ] Reset link can only be used once
- [ ] User can successfully reset password
- [ ] Inactive users cannot have passwords reset
- [ ] Direct password reset from users page works
- [ ] Navigation and UI work correctly

## Troubleshooting

### User Cannot Submit Request
- Check network connectivity
- Verify API endpoint is accessible
- Check browser console for errors

### Superadmin Cannot See Requests
- Verify superadmin role is correctly set
- Check authentication session
- Verify database connection

### Reset Link Not Working
- Verify link hasn't expired (24 hours)
- Check if link was already used
- Ensure URL is complete and unmodified

### Password Reset Fails
- Verify user account is active
- Check password meets minimum requirements (6 characters)
- Verify token hasn't expired or been used

