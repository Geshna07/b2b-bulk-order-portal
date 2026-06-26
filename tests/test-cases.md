# Test Cases - B2B Bulk Order Portal

| Test ID | Description | Steps | Expected Result | Actual Result | Pass/Fail |
|---|---|---|---|---|---|
| TC-01 | Customer Login | Enter valid credentials | Redirect to customer dashboard | | |
| TC-02 | Staff Pending Login | Enter valid credentials | Redirect to pending notice | | |
| TC-03 | Staff Approved Login | Enter valid credentials | Redirect to staff dashboard | | |
| TC-04 | Admin Login | Enter valid credentials | Redirect to admin dashboard | | |
| TC-05 | Wrong Password | Enter invalid password | Show error message | | |
| TC-06 | Customer Reg Validation | Submit missing fields | Show validation errors | | |
| TC-07 | Staff Registration | Submit new staff form | Redirect to pending state | | |
| TC-08 | Admin Approve Staff | Click approve on staff request | Staff status updated, WhatsApp prompt | | |
| TC-09 | Admin Reject Staff | Click reject on staff request | Staff account removed, WhatsApp prompt | | |
| TC-10 | Product Browse | Navigate to products | View product list | | |
| TC-11 | Product Search | Type search query | Filter product list | | |
| TC-12 | Bulk Order Min Qty | Add item below min qty | Show min qty error | | |
| TC-13 | Bulk Order Place | Submit valid order | Order placed, WhatsApp sent | | |
| TC-14 | Order Status 1 | Change status to New | Order moves to new, WhatsApp sent | | |
| TC-15 | Order Status 2 | Change status to Processing | Order moves to processing, WhatsApp sent | | |
| TC-16 | Order Status 3 | Change status to Packed | Order moves to packed, stock reduced | | |
| TC-17 | Order Status 4 | Change status to Shipped | Order moves to shipped | | |
| TC-18 | Order Status 5 | Change status to Delivered | Order moves to delivered | | |
| TC-19 | Order Status 6 | Change status to Cancelled | Order moves to cancelled | | |
| TC-20 | Quotation Create | Create new quotation | Quotation saved in DB | | |
| TC-21 | Quotation Send | Send quotation | Status changes, WhatsApp sent | | |
| TC-22 | Quotation Accept | Customer accept quotation | Order auto-created | | |
| TC-23 | Stock Reduction | Pack order | Stock reduced in DB | | |
| TC-24 | Credit Account Update | Order delivered | Credit account updated | | |
| TC-25 | Forgot Password OTP | Request OTP | OTP sent to phone/email | | |
| TC-26 | AI Assistant | Ask question | Relevant answer | | |
| TC-27 | Invoice Download | Click invoice link | PDF downloads | | |
| TC-28 | CSV Export | Click export | CSV downloads | | |
| TC-29 | Staff Access Ctrl | Staff A access Staff B page | Access Denied | | |
| TC-30 | Logout | Click logout | Return to login | | |
