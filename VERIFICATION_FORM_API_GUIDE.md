# 🔐 Verification Form API Guide

## Overview
This guide covers the new verification form validation endpoints that provide real-time validation for the freelancer verification form. The API ensures all form fields meet the specified requirements before allowing submission.

## 🎯 API Endpoints

### 1. Validate Form Data
**Endpoint**: `POST /api/verification-form/validate-form`  
**Authentication**: Required (JWT Token)  
**Role**: Freelancer only

#### Request Body
```json
{
  "fullName": "John Doe Smith",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "address": "123 Main Street, Apartment 4B, Near Central Park",
  "pincode": "110001"
}
```

#### Response (Valid Data)
```json
{
  "success": true,
  "data": {
    "canSubmit": true,
    "errors": []
  }
}
```

#### Response (Invalid Data)
```json
{
  "success": true,
  "data": {
    "canSubmit": false,
    "errors": [
      {
        "field": "fullName",
        "message": "Please enter your full name (first and last name)"
      },
      {
        "field": "pincode",
        "message": "Please enter a valid 6-digit pincode"
      }
    ]
  }
}
```

---

### 2. Submit Verification Form
**Endpoint**: `POST /api/verification-form/submit-verification`  
**Authentication**: Required (JWT Token)  
**Role**: Freelancer only

#### Request Body
```json
{
  "fullName": "John Doe Smith",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "address": "123 Main Street, Apartment 4B, Near Central Park",
  "pincode": "110001"
}
```

#### Response (Success)
```json
{
  "success": true,
  "message": "Verification form submitted successfully. Your profile is now pending approval.",
  "data": {
    "profile": {
      "id": "68ba951edca2b993cc54594b",
      "fullName": "John Doe Smith",
      "verificationStatus": "pending",
      "isProfileComplete": true,
      "submittedAt": "2025-09-05T07:45:34.937Z"
    },
    "nextAction": "show_pending_modal",
    "modalMessage": "Your verification is pending. Please wait for approval."
  }
}
```

---

### 3. Get Real-time Validation Status
**Endpoint**: `GET /api/verification-form/validation-status`  
**Authentication**: Required (JWT Token)  
**Role**: Freelancer only

#### Query Parameters
- `fullName` (string): Full name to validate
- `dateOfBirth` (string): Date of birth in ISO format
- `gender` (string): Gender selection
- `address` (string): Address text
- `pincode` (string): 6-digit pincode

#### Example Request
```
GET /api/verification-form/validation-status?fullName=John%20Doe&dateOfBirth=1990-05-15&gender=male&address=123%20Main%20St&pincode=110001
```

#### Response
```json
{
  "success": true,
  "data": {
    "canSubmit": true,
    "errors": []
  }
}
```

---

## 🔍 Validation Rules

### Full Name
- **Required**: Yes
- **Length**: 2-50 characters
- **Format**: Must contain at least 2 words (first and last name)
- **Characters**: Only letters and spaces allowed
- **Error Messages**:
  - "Full name must be between 2 and 50 characters"
  - "Please enter your full name (first and last name)"
  - "Full name should contain only letters"

### Date of Birth
- **Required**: Yes
- **Format**: ISO 8601 date format (YYYY-MM-DD)
- **Age Range**: 18-100 years old
- **Error Messages**:
  - "Please enter a valid date of birth"
  - "You must be at least 18 years old"
  - "Please enter a valid date of birth"

### Gender
- **Required**: Yes
- **Options**: "male" or "female" only
- **Error Message**: "Please select your gender (Male or Female)"

### Address
- **Required**: Yes
- **Length**: 10-200 characters
- **Error Message**: "Address must be between 10 and 200 characters"

### Pincode
- **Required**: Yes
- **Format**: Exactly 6 digits
- **Pattern**: Must start with 1-9, followed by 5 digits (0-9)
- **Error Message**: "Please enter a valid 6-digit pincode"

---

## 🎨 Frontend Integration Guide

### Real-time Validation
Use the validation status endpoint to provide real-time feedback:

```javascript
const validateForm = async (formData) => {
  const queryParams = new URLSearchParams(formData);
  const response = await fetch(`/api/verification-form/validation-status?${queryParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  
  // Update UI based on validation results
  setCanSubmit(data.canSubmit);
  setErrors(data.errors);
  
  // Update submit button state
  setSubmitButtonDisabled(!data.canSubmit);
  setSubmitButtonOpacity(data.canSubmit ? 1.0 : 0.5);
};
```

### Submit Button State Management
```javascript
const [canSubmit, setCanSubmit] = useState(false);
const [submitButtonOpacity, setSubmitButtonOpacity] = useState(0.5);

// Update button style based on validation
const buttonStyle = {
  opacity: submitButtonOpacity,
  disabled: !canSubmit
};
```

### Form Submission
```javascript
const submitForm = async (formData) => {
  if (!canSubmit) return;
  
  const response = await fetch('/api/verification-form/submit-verification', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Show success modal or navigate
    showPendingModal(result.data);
  }
};
```

---

## 🧪 Testing Examples

### Test Case 1: Valid Data
```bash
curl -X POST http://localhost:3000/api/verification-form/validate-form \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe Smith",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "address": "123 Main Street, Apartment 4B, Near Central Park",
    "pincode": "110001"
  }'
```

### Test Case 2: Invalid Full Name (Single Word)
```bash
curl -X POST http://localhost:3000/api/verification-form/validate-form \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "address": "123 Main Street, Apartment 4B, Near Central Park",
    "pincode": "110001"
  }'
```

### Test Case 3: Invalid Pincode
```bash
curl -X POST http://localhost:3000/api/verification-form/validate-form \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe Smith",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "address": "123 Main Street, Apartment 4B, Near Central Park",
    "pincode": "123"
  }'
```

### Test Case 4: Underage User
```bash
curl -X POST http://localhost:3000/api/verification-form/validate-form \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe Smith",
    "dateOfBirth": "2010-05-15",
    "gender": "male",
    "address": "123 Main Street, Apartment 4B, Near Central Park",
    "pincode": "110001"
  }'
```

---

## 🔄 Integration with Existing Flow

The verification form endpoints integrate seamlessly with the existing verification flow:

1. **Authentication**: User authenticates via Firebase/OTP
2. **Status Check**: Call `/api/freelancer/verification-status`
3. **Form Validation**: Use `/api/verification-form/validate-form` for real-time validation
4. **Form Submission**: Use `/api/verification-form/submit-verification` to submit
5. **Status Updates**: Continue using existing verification status endpoints

---

## 🚀 Production Deployment

The verification form API is ready for production deployment and includes:

- ✅ Comprehensive validation rules
- ✅ Real-time validation support
- ✅ Proper error handling
- ✅ Authentication and authorization
- ✅ Integration with existing verification flow
- ✅ Database schema updates
- ✅ API documentation

All endpoints are production-ready and follow the existing API patterns and security measures.
