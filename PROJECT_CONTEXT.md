# Project Context

## Authentication Test Results

Based on running test-auth.js, the authentication system appears to be working correctly:

### Registration Flow
- Valid registration succeeds (returns access token)
- Duplicate email correctly returns 409 with message "Email is already in use"
- Invalid email correctly returns 422 with validation error "Invalid email address"
- Weak password correctly returns 422 with validation error "Password must be at least 8 characters"

### Login Flow
- Valid credentials login succeeds
- Wrong password correctly returns 401 with message "Invalid credentials"
- Non-existent email correctly returns 401 with message "Invalid credentials"

### Protected Routes
- GET /me with valid token works correctly
- GET /me without token correctly returns 401 with message "Not authenticated"
- GET /me with invalid token correctly returns 401 with message "Invalid or expired access token"

### Token Refresh & Logout
- Refresh token works via cookie-based authentication
- Logout works and clears refresh token cookie

### Summary
All 12 test cases passed. The authentication system is functional and properly handles:
- User registration with validation
- User login with credential verification
- Token-based authentication for protected routes
- Token refresh mechanism
- Session logout

The tests demonstrate that the JWT-based authentication system is working as expected, including proper error handling and security validations.