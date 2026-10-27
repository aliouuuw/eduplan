# Invitation System Documentation

## Overview

The EduPlan system uses an **invitation-based registration** system to ensure secure and controlled user onboarding. Public registration is disabled, and all users must receive an invitation to create an account.

## User Flow

### 1. Superadmin Setup (Initial Bootstrap)

**Create Superadmin Account:**
```bash
bun run seed:superadmin
```

**Default Credentials:**
- Email: `superadmin@eduplan.com`
- Password: `Admin@123`
- **Important:** Change this password after first login!

### 2. Superadmin → Creates Schools

1. Login as superadmin at `/login`
2. Navigate to "Schools" in the sidebar
3. Click "Add School"
4. Fill in school details:
   - School Name (required)
   - Address, Phone, Email (optional)
   - **Admin Email (optional but recommended)** - If provided, an invitation will be automatically generated
5. Submit the form
6. If admin email was provided:
   - A toast notification will show the invitation link
   - Copy the link and send it to the school administrator

### 3. School Admin → Accepts Invitation

1. School admin receives invitation link (e.g., `https://yourapp.com/invite/abc123xyz`)
2. Click the link → arrives at invitation page
3. See invitation details:
   - Email
   - Role (admin)
   - School name
   - School code
4. Fill in account details:
   - Full Name
   - Password
   - Confirm Password
5. Submit → Account is created with proper schoolId and role
6. Login at `/login` with new credentials

### 4. School Admin → Invites Staff/Parents/Students

1. Login as school admin
2. Navigate to "Invitations" in the sidebar
3. Click "New Invitation"
4. Fill in invitation form:
   - Email address
   - Role (admin, teacher, parent, or student)
5. Submit → Invitation is created
6. Copy the invitation link from the toast notification
7. Send the link to the user

### 5. Users → Accept Invitations

1. User receives invitation link
2. Follow the same process as school admin (step 3 above)
3. Login with new credentials
4. Access role-specific dashboard

## API Endpoints

### Create Invitation
```
POST /api/invitations
Authorization: Required (admin or superadmin)

Body:
{
  "email": "user@example.com",
  "role": "teacher",
  "schoolId": "school-id" (optional - superadmin only)
}

Response:
{
  "message": "Invitation created successfully",
  "invitation": {
    "id": "invitation-id",
    "email": "user@example.com",
    "role": "teacher",
    "invitationLink": "https://app.com/invite/token",
    "expiresAt": "2025-10-17T..."
  }
}
```

### List Invitations
```
GET /api/invitations
Authorization: Required (admin or superadmin)

Response:
{
  "invitations": [
    {
      "id": "...",
      "email": "...",
      "role": "...",
      "token": "...",
      "expiresAt": "...",
      "usedAt": null | "...",
      "createdAt": "..."
    }
  ]
}
```

### Verify Invitation (Public)
```
GET /api/invitations/[token]
Authorization: None (public route)

Response:
{
  "valid": true,
  "invitation": {
    "email": "...",
    "role": "...",
    "schoolName": "...",
    "schoolCode": "...",
    "expiresAt": "..."
  }
}
```

### Accept Invitation (Public)
```
POST /api/invitations/accept
Authorization: None (public route)

Body:
{
  "token": "invitation-token",
  "name": "Full Name",
  "password": "password123"
}

Response:
{
  "message": "Account created successfully",
  "userId": "...",
  "email": "...",
  "role": "..."
}
```

### Delete/Revoke Invitation
```
DELETE /api/invitations?id=invitation-id
Authorization: Required (admin or superadmin)

Response:
{
  "message": "Invitation deleted successfully"
}
```

## Invitation Lifecycle

1. **Created** - Invitation is generated with a unique token
2. **Pending** - Invitation is active and waiting to be accepted
3. **Expired** - Invitation passed expiry date (7 days by default)
4. **Accepted** - User created account using the invitation
5. **Revoked** - Admin deleted the invitation before it was used

## Security Features

- **Unique tokens**: Each invitation has a cryptographically secure random token
- **Expiration**: Invitations expire after 7 days by default
- **Single-use**: Once accepted, invitations cannot be reused
- **School isolation**: School admins can only create invitations for their school
- **Role-based access**: Only admins and superadmins can create invitations
- **Email validation**: Prevents duplicate invitations for the same email + school

## Database Schema

### Invitations Table
```sql
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL, -- 'admin', 'teacher', 'parent', 'student'
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_by TEXT NOT NULL, -- User ID who created the invitation
  used_at INTEGER, -- NULL if not used yet
  created_at INTEGER NOT NULL
);
```

### Schools Table (Updated)
```sql
CREATE TABLE schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school_code TEXT NOT NULL UNIQUE, -- e.g., "DAKAR-A1B2-2025"
  address TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## Configuration

### Invitation Expiry
Default: 7 days from creation

To customize:
```typescript
// src/lib/invitations.ts
export function getDefaultInvitationExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // Change this number
  return expiryDate;
}
```

### School Code Format
Default: `FIRSTWORD-XXXX-YEAR`

Example: `DAKAR-A1B2-2025`

To customize:
```typescript
// src/lib/invitations.ts
export function generateSchoolCode(schoolName: string): string {
  // Customize format here
}
```

## Testing the Flow

1. **Start the dev server:**
   ```bash
   bun run dev
   ```

2. **Seed superadmin:**
   ```bash
   bun run seed:superadmin
   ```

3. **Test complete flow:**
   - Login as superadmin: `superadmin@eduplan.com` / `Admin@123`
   - Create a school with admin email
   - Copy invitation link
   - Open invitation link in incognito/private window
   - Create admin account
   - Login as school admin
   - Navigate to Invitations
   - Create invitation for a teacher
   - Copy invitation link
   - Accept invitation
   - Login as teacher

## Troubleshooting

### "Invalid invitation token"
- Token may have expired (check `expiresAt`)
- Token may have already been used (check `usedAt`)
- Token may not exist in database

### "An active invitation already exists for this email"
- Delete/revoke the existing invitation first
- Or use a different email address

### Invitation link not working
- Ensure `NEXTAUTH_URL` is set correctly in `.env`
- Check that the full URL is being copied (including protocol)

## Future Enhancements (Post-MVP)

- [ ] Email integration (automatically send invitation emails)
- [ ] Invitation expiry reminders
- [ ] Bulk invitation import (CSV upload)
- [ ] Resend invitation functionality
- [ ] Custom invitation messages
- [ ] Invitation analytics/tracking
- [ ] Role-specific invitation templates

