# Manual Test Script for Store Page
**Quick 5-Minute E2E Test**

## Prerequisites
- Development server running on http://localhost:3000
- Browser open with DevTools (F12)

---

## Quick Test (5 minutes)

### 1. Page Load Check (30 seconds)
```
1. Navigate to: http://localhost:3000/store
2. Open Console (F12 → Console tab)
3. Verify: No red errors appear
4. Verify: Page shows Header, Hero, Products, Testimonials, Footer
```
**Expected:** Clean console, all sections visible
**Pass/Fail:** ___

---

### 2. Add to Cart Flow (1 minute)
```
1. Scroll to product grid
2. Hover over first product
3. Verify: "Add to Cart" button appears
4. Click "Add to Cart"
5. Verify: Button turns green, says "Added"
6. Verify: Cart drawer slides in from right
7. Verify: Product appears in cart with image, name, price
8. Verify: Header cart badge shows "1"
```
**Expected:** Drawer opens automatically, item shown correctly
**Pass/Fail:** ___

---

### 3. Cart Quantity Controls (30 seconds)
```
1. In cart drawer, click "+" button
2. Verify: Quantity increases to 2
3. Verify: Subtotal doubles
4. Click "-" button
5. Verify: Quantity decreases to 1
6. Verify: Subtotal goes back to original
```
**Expected:** Quantity and price update correctly
**Pass/Fail:** ___

---

### 4. Multiple Items (1 minute)
```
1. Click anywhere outside cart to close drawer
2. Hover over a DIFFERENT product
3. Click "Add to Cart"
4. Verify: Drawer opens again
5. Verify: Now shows 2 different items
6. Verify: Header badge shows "2"
7. Click "+" on first item
8. Verify: Header badge shows "3"
```
**Expected:** Multiple items tracked, badge updates
**Pass/Fail:** ___

---

### 5. Checkout Flow (2 minutes)
```
1. In cart, click "Checkout" button
2. Verify: Shipping form appears
3. Fill form:
   - Name: Test User
   - Email: test@example.com
   - Address: 123 Main St
   - City: New York
   - ZIP: 10001
4. Click "Continue to Payment"
5. Verify: Payment form appears
6. Verify: Order summary shows subtotal, shipping ($9.99), tax (8%)
7. Fill payment form:
   - Card: 4242 4242 4242 4242
   - Expiry: 12/25
   - CVC: 123
8. Click "Pay $XX.XX" button
9. Verify: "Processing" spinner shows
10. Wait 1.5 seconds
11. Verify: Success screen shows
12. Verify: Order number displayed (format: #UT-XXXXXX)
13. Verify: Header cart badge shows "0"
14. Click "Continue Shopping"
15. Verify: Drawer closes
```
**Expected:** Complete checkout flow, cart cleared
**Pass/Fail:** ___

---

## Console Error Check
Open DevTools Console and verify:
- [ ] Zero errors (red text)
- [ ] No warnings about React hooks
- [ ] No 404 network errors

**Pass/Fail:** ___

---

## Final Verdict

- [ ] All 5 tests passed
- [ ] No console errors
- [ ] Store is fully functional

**Overall Status:** _______________

**Tester Name:** _______________
**Date:** _______________
**Time Taken:** _______________

---

## If Any Test Failed

Document the failure below:

**Test Number:** ___
**What Happened:**
_______________________________________________
_______________________________________________

**Console Error (if any):**
```
[paste error here]
```

**Screenshot Filename:** _______________
