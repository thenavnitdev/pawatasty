# Link ID System Documentation

## Overview

The Link ID system provides each user with a unique 6-character alphanumeric code for easy user-to-user connections and invitations.

## Features

### Link ID Format
- **Length**: Exactly 6 characters
- **Characters**: Uppercase letters (A-Z) and digits (2-9)
- **Requirements**: Must contain at least one letter AND one number
- **Uniqueness**: Each Link ID is unique across all users
- **Permanence**: Link IDs cannot be changed once assigned

### Excluded Characters
To avoid confusion, the following characters are excluded:
- Letter 'I' (can be confused with number 1)
- Letter 'O' (can be confused with number 0)
- Number '1' (can be confused with letter I)
- Number '0' (can be confused with letter O)

### Valid Examples
- `A4F9B2`
- `9X8Y2Z`
- `K7L3M5`

### Invalid Examples
- `123456` (only numbers)
- `ABCDEF` (only letters)
- `AB12` (too short)
- `AB12CD78` (too long)

## Database Schema

### Table: `users`
- **Column**: `link_id` (text, unique, not null)
- **Index**: `idx_users_link_id` for fast lookups
- **Trigger**: `trigger_set_user_link_id` auto-generates Link ID on user creation

### Functions
1. **`validate_link_id(code text)`**: Validates Link ID format
2. **`generate_unique_link_id()`**: Generates a unique Link ID
3. **`set_user_link_id()`**: Trigger function to auto-assign Link IDs

## API Endpoints

### Get Your Link ID
```
GET /functions/v1/link-id/my-code
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "linkId": "A4F9B2"
}
```

### Lookup User by Link ID
```
POST /functions/v1/link-id/lookup
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "linkId": "A4F9B2"
}
```

**Response (Success):**
```json
{
  "userId": "uuid",
  "fullName": "John Doe",
  "username": "johndoe",
  "profilePicture": "url",
  "linkId": "A4F9B2"
}
```

**Response (Error):**
```json
{
  "error": "User not found with this Link ID"
}
```

## UI Components

### PersonalInformation Component
- Displays user's Link ID in profile view
- Button opens Link ID modal for full functionality

### LinkIdModal Component
Features:
- **Your Link ID**: Display and copy functionality
- **Lookup**: Enter someone else's Link ID to find them
- **Validation**: Real-time input validation
- **User Display**: Shows found user's profile info

## User Flow

### Sharing Link ID
1. User opens their profile
2. Clicks on Link ID button
3. Modal shows their Link ID
4. User copies Link ID to share with friends

### Looking Up Someone
1. User opens Link ID modal
2. Enters friend's 6-character Link ID
3. System validates format
4. If valid, looks up user in database
5. Displays found user's profile information

## Security

### RLS Policies
- Anyone can look up users by Link ID (required for invites)
- Link IDs are read-only (cannot be manually changed)
- Users must be authenticated to use Link ID features

### Validation
- Input is automatically uppercased and sanitized
- Only alphanumeric characters allowed
- Must meet all format requirements
- Cannot use your own Link ID to lookup yourself

## Error Handling

### Common Errors
- "Link ID must be exactly 6 characters"
- "Link ID can only contain letters and numbers"
- "Link ID must contain at least one letter"
- "Link ID must contain at least one number"
- "User not found with this Link ID"
- "You cannot use your own Link ID"

## Implementation Notes

### Auto-Generation
- All new users automatically receive a Link ID on registration
- Existing users were backfilled with Link IDs via migration
- Generation retries up to 100 times if collision occurs

### Case Handling
- User input is normalized to uppercase
- Link IDs are always stored and displayed in uppercase

### Frontend Integration
```typescript
// Import modal
import LinkIdModal from './LinkIdModal';

// Show modal
const [showLinkIdModal, setShowLinkIdModal] = useState(false);

// In JSX
{showLinkIdModal && (
  <LinkIdModal
    onClose={() => setShowLinkIdModal(false)}
    userLinkId={profile?.link_id}
  />
)}
```

## Future Enhancements

Potential features for future development:
- Link ID-based friend requests
- Group invitations using Link ID
- QR code generation for Link IDs
- Link ID-based referral tracking
- Analytics on Link ID usage
