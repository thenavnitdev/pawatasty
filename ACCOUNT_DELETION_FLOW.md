# Account Deletion Flow

## Summary

✅ **Account deletion now properly logs out the user and redirects to the login page.**

## Updated Flow

### 1. User Initiates Deletion
- User navigates to Settings → Delete Account
- DeleteAccountModal opens with warning message

### 2. Confirmation and Deletion
When user clicks "Delete Account":

```typescript
1. Sign out from Supabase
   - Triggers auth state change event (SIGNED_OUT)

2. Clear all local storage
   - api_token
   - user_data
   - supabase_token
   - supabase_user

3. Notify parent component (optional callback)
   - onAccountDeleted() if provided

4. Automatic redirect via auth listener
   - App.tsx catches SIGNED_OUT event
   - Clears all user state
   - Redirects to login page

5. Fallback redirect (500ms delay)
   - Forces redirect to '/' if auth listener doesn't fire
```

### 3. Auth State Change Handler (App.tsx)

The existing auth listener in App.tsx handles the SIGNED_OUT event:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear user state
    setUser(null);
    setBookings([]);
    setRestaurants([]);
    setSelectedBooking(null);
    setSelectedRestaurant(null);
    setIsMenuOpen(false);

    // Clear storage
    localStorage.removeItem('api_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('supabase_user');

    // Redirect to login
    setCurrentView('login');
  }
});
```

## Component Updates

### DeleteAccountModal.tsx

**Changes Made:**
1. Added Supabase import for sign out
2. Added optional `onAccountDeleted` callback prop
3. Updated `handleDeleteAccount` to:
   - Call `supabase.auth.signOut()`
   - Clear all auth-related localStorage items
   - Trigger callback if provided
   - Include fallback redirect

**New Interface:**
```typescript
interface DeleteAccountModalProps {
  onClose: () => void;
  userId: string;
  onAccountDeleted?: () => void; // NEW: Optional callback
}
```

## Security Considerations

### Frontend Logout
- ✅ Clears all authentication tokens
- ✅ Removes user data from local storage
- ✅ Signs out from Supabase auth
- ✅ Triggers auth state change listeners

### Backend Considerations
⚠️ **Important**: The actual user data deletion from the database should be handled by the backend API. The current implementation:
- Logs out the user immediately
- Clears client-side session
- Does NOT delete user data from the database

To implement full account deletion:
1. Create a backend API endpoint for account deletion
2. Call that endpoint before signing out
3. Backend should:
   - Mark user as deleted or remove from database
   - Clean up related data (bookings, reviews, etc.)
   - Handle any required retention policies

## User Experience

### Before Deletion
```
Settings → Delete Account → Warning Modal
"By deleting your account, you will automatically
lose access to this application"
```

### During Deletion
```
Button shows: "Deleting Account..."
User cannot click again (disabled state)
```

### After Deletion
```
1. User signed out from Supabase
2. Local storage cleared
3. Redirected to login page
4. Clean slate - no cached data
```

## Testing the Flow

### Manual Test Steps:
1. Log in to the app
2. Navigate to Settings
3. Click "Delete Account"
4. Click "Delete Account" in the modal
5. Verify:
   - ✅ User is logged out
   - ✅ Redirected to login page
   - ✅ Local storage is cleared
   - ✅ No cached user data remains

### Check in DevTools:
```javascript
// Before deletion - should see tokens
localStorage.getItem('supabase_token')
localStorage.getItem('user_data')

// After deletion - should be null
localStorage.getItem('supabase_token')  // null
localStorage.getItem('user_data')       // null
```

## Error Handling

### Supabase Sign Out Fails
- Error logged to console
- Local storage still cleared
- Fallback redirect still fires
- User sees: "Failed to delete account. Please try again or contact support."

### Network Issues
- Error caught and logged
- Alert shown to user
- Button re-enabled for retry
- User remains logged in (safe failure)

## Future Enhancements

### Recommended Improvements:
1. **Backend API Integration**
   - Add proper account deletion endpoint
   - Handle database cleanup
   - Implement retention policies

2. **Confirmation Code**
   - Require user to type "DELETE" to confirm
   - Reduces accidental deletions

3. **Data Export**
   - Offer to export user data before deletion
   - Comply with GDPR requirements

4. **Grace Period**
   - Mark account as "pending deletion"
   - Allow 30-day recovery period
   - Auto-delete after grace period

5. **Email Confirmation**
   - Send confirmation email
   - Require email verification before deletion
   - Extra security layer

## Related Files

- `/src/components/DeleteAccountModal.tsx` - Deletion modal
- `/src/App.tsx` - Auth state listener
- `/src/lib/supabase.ts` - Supabase client
- `/src/services/mobile/client.ts` - API client

## Notes

- The deletion is immediate (no confirmation email)
- User data remains in database (only logout occurs)
- For production, implement proper backend deletion
- Consider adding a "deactivate account" option instead
- Follow data protection regulations (GDPR, CCPA, etc.)
