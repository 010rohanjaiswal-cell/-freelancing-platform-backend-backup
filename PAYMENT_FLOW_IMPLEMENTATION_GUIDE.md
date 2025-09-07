# 💳 Payment Flow Implementation Guide

## Overview
This guide covers the complete payment flow implementation with PhonePe payment gateway integration. The system handles job completion, payment processing, and order management.

## 🎯 Key Features Implemented

### 1. **Job Status Flow**
- ✅ `assigned` → `waiting_for_payment` → `paid` → `completed`
- ✅ Proper status tracking throughout job lifecycle
- ✅ Button state changes based on job status

### 2. **PhonePe Payment Gateway Integration**
- ✅ Client ID: `TEST-M23OKIGC1N363_25081`
- ✅ Client Secret: `OWFkNzQxNjAtZjQ2Yi00YjRkLWE0ZDMtOWQxMzQ0NWZiMGZm`
- ✅ Sandbox environment: `https://api-preprod.phonepe.com/apis/pg-sandbox`
- ✅ Payment callback handling

### 3. **Complete Payment Flow**
- ✅ Freelancer marks work as done
- ✅ Client pays through PhonePe
- ✅ Payment verification and callback
- ✅ Job completion and order management

## 🔄 Complete Job Flow

```
1. Job Created → Status: "open" → Available Tab
2. Freelancer Applies → Status: "assigned" → Assigned Tab
3. Work Completed → Status: "waiting_for_payment" → Assigned Tab
4. Payment Received → Status: "paid" → Assigned Tab
5. Job Completed → Status: "completed" → Order History
```

## 📊 API Endpoints

### 1. Mark Work as Done (Freelancer)
**Endpoint**: `POST /api/freelancer/jobs/:jobId/work-done`  
**Authentication**: Required (JWT Token)  
**Role**: Freelancer only

#### Request
```json
{
  // No body required
}
```

#### Response
```json
{
  "success": true,
  "message": "Work marked as completed. Waiting for payment.",
  "data": {
    "job": {
      "id": "job_id",
      "status": "waiting_for_payment",
      "workCompletedAt": "2025-09-07T10:30:00.000Z"
    },
    "nextAction": "waiting_for_payment",
    "buttonText": "Waiting for Payment",
    "showSpinner": true
  }
}
```

### 2. Initiate Payment (Client)
**Endpoint**: `POST /api/client/jobs/:jobId/pay-phonepe`  
**Authentication**: Required (JWT Token)  
**Role**: Client only

#### Request
```json
{
  // No body required
}
```

#### Response
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentUrl": "https://mercury.phonepe.com/transact/...",
    "orderId": "ORDER_job_id_timestamp",
    "amount": 2000,
    "jobId": "job_id"
  }
}
```

### 3. Complete Job (Freelancer)
**Endpoint**: `POST /api/freelancer/jobs/:jobId/complete`  
**Authentication**: Required (JWT Token)  
**Role**: Freelancer only

#### Request
```json
{
  // No body required
}
```

#### Response
```json
{
  "success": true,
  "message": "Job marked as completed successfully",
  "data": {
    "job": {
      "id": "job_id",
      "status": "completed",
      "completedAt": "2025-09-07T10:30:00.000Z"
    },
    "nextAction": "navigate_to_orders",
    "message": "Job completed! You can now apply for new jobs."
  }
}
```

### 4. Payment Callback (PhonePe)
**Endpoint**: `POST /api/client/payment/callback`  
**Authentication**: Not required (PhonePe callback)

#### Request (from PhonePe)
```json
{
  "merchantTransactionId": "ORDER_job_id_timestamp",
  "merchantOrderId": "ORDER_job_id_timestamp",
  "amount": 200000,
  "code": "PAYMENT_SUCCESS",
  "message": "Payment successful",
  "checksum": "checksum_hash"
}
```

#### Response
```json
{
  "success": true
}
```

## 🎨 Frontend Integration Guide

### 1. Job Card Button States

#### Freelancer Job Card
```javascript
const FreelancerJobCard = ({ job }) => {
  const getButtonState = (status) => {
    switch (status) {
      case 'assigned':
        return {
          text: 'Work Done',
          onClick: () => markWorkDone(job.id),
          variant: 'primary'
        };
      case 'waiting_for_payment':
        return {
          text: 'Waiting for Payment',
          onClick: null,
          variant: 'secondary',
          showSpinner: true,
          disabled: true
        };
      case 'paid':
        return {
          text: 'Completed',
          onClick: () => markCompleted(job.id),
          variant: 'success'
        };
      case 'completed':
        return {
          text: 'View Details',
          onClick: () => viewOrderDetails(job.id),
          variant: 'outline'
        };
      default:
        return null;
    }
  };

  const buttonState = getButtonState(job.status);

  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>Amount: ₹{job.amount}</p>
      <p>Status: {job.status}</p>
      
      {buttonState && (
        <button
          className={`btn btn-${buttonState.variant}`}
          onClick={buttonState.onClick}
          disabled={buttonState.disabled}
        >
          {buttonState.showSpinner && <Spinner />}
          {buttonState.text}
        </button>
      )}
    </div>
  );
};
```

#### Client Job Card
```javascript
const ClientJobCard = ({ job }) => {
  const getButtonState = (status) => {
    switch (status) {
      case 'waiting_for_payment':
        return {
          text: 'Pay',
          onClick: () => initiatePayment(job.id),
          variant: 'primary'
        };
      case 'paid':
        return {
          text: 'Payment Completed',
          onClick: null,
          variant: 'success',
          disabled: true
        };
      case 'completed':
        return {
          text: 'Job Completed',
          onClick: null,
          variant: 'success',
          disabled: true
        };
      default:
        return null;
    }
  };

  const buttonState = getButtonState(job.status);

  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>Amount: ₹{job.amount}</p>
      <p>Status: {job.status}</p>
      
      {buttonState && (
        <button
          className={`btn btn-${buttonState.variant}`}
          onClick={buttonState.onClick}
          disabled={buttonState.disabled}
        >
          {buttonState.text}
        </button>
      )}
    </div>
  );
};
```

### 2. API Integration Functions

```javascript
// Mark work as done
const markWorkDone = async (jobId) => {
  try {
    const response = await fetch(`/api/freelancer/jobs/${jobId}/work-done`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update UI to show "Waiting for Payment" with spinner
      updateJobStatus(jobId, 'waiting_for_payment');
      showSuccessMessage('Work marked as completed. Waiting for payment.');
    } else {
      showErrorMessage(result.message);
    }
  } catch (error) {
    console.error('Failed to mark work done:', error);
    showErrorMessage('Failed to mark work as done');
  }
};

// Initiate payment
const initiatePayment = async (jobId) => {
  try {
    const response = await fetch(`/api/client/jobs/${jobId}/pay-phonepe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Redirect to PhonePe payment page
      window.location.href = result.data.paymentUrl;
    } else {
      showErrorMessage(result.message);
    }
  } catch (error) {
    console.error('Failed to initiate payment:', error);
    showErrorMessage('Failed to initiate payment');
  }
};

// Mark job as completed
const markCompleted = async (jobId) => {
  try {
    const response = await fetch(`/api/freelancer/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Navigate to order history
      navigateToOrderHistory();
      showSuccessMessage('Job completed successfully!');
    } else {
      showErrorMessage(result.message);
    }
  } catch (error) {
    console.error('Failed to mark job as completed:', error);
    showErrorMessage('Failed to mark job as completed');
  }
};
```

### 3. Payment Status Polling

```javascript
// Poll for payment status updates
const pollPaymentStatus = async (jobId) => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/freelancer/jobs/assigned`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      const job = result.data.jobs.find(j => j._id === jobId);
      
      if (job && job.status === 'paid') {
        clearInterval(pollInterval);
        // Update UI to show "Completed" button
        updateJobStatus(jobId, 'paid');
        showSuccessMessage('Payment received! You can now mark the job as completed.');
      }
    } catch (error) {
      console.error('Failed to poll payment status:', error);
    }
  }, 5000); // Poll every 5 seconds
  
  // Stop polling after 5 minutes
  setTimeout(() => clearInterval(pollInterval), 300000);
};
```

## 🔒 Security Features

### 1. **Authentication & Authorization**
- All endpoints require valid JWT token
- Role-based access control (freelancer/client)
- Proper user validation

### 2. **Payment Security**
- PhonePe checksum verification
- Secure callback handling
- Transaction record keeping
- Wallet balance management

### 3. **Data Validation**
- Input validation for all fields
- Proper error handling
- Consistent API response format

## 🧪 Testing

### Test Cases Covered
- ✅ Work done flow
- ✅ Payment initiation
- ✅ Payment callback handling
- ✅ Job completion flow
- ✅ Status tracking
- ✅ Authentication and authorization

### Production Status
- ✅ **Local Server**: Fully functional with payment integration
- ⏳ **Production Server**: Needs deployment of updated code

## 🚀 Deployment

The payment flow is ready for production deployment. Once deployed, the system will:

1. **Handle job completion flow**
2. **Process PhonePe payments**
3. **Manage payment callbacks**
4. **Track job status changes**
5. **Update freelancer wallets**
6. **Maintain transaction records**

## 📋 Summary

The payment flow system is now fully implemented and tested. It provides:

- ✅ **Complete job lifecycle management**
- ✅ **PhonePe payment gateway integration**
- ✅ **Real-time status updates**
- ✅ **Secure payment processing**
- ✅ **Frontend integration ready**
- ✅ **Production deployment ready**

The system ensures smooth payment processing and proper job completion tracking, improving the overall user experience for both freelancers and clients.
