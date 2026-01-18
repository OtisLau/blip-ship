'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const [checkoutState, setCheckoutState] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
  const [shippingInfo, setShippingInfo] = useState({ name: '', email: '', address: '', city: '', zip: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = () => {
    setCheckoutState('shipping');
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutState('payment');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessing(false);
    setCheckoutState('success');
    clearCart();
  };

  const handleClose = () => {
    closeCart();
    setTimeout(() => {
      setCheckoutState('cart');
      setShippingInfo({ name: '', email: '', address: '', city: '', zip: '' });
    }, 300);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 100,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          maxWidth: '100vw',
          backgroundColor: 'white',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {checkoutState === 'cart' && 'Cart'}
              {checkoutState === 'shipping' && 'Shipping'}
              {checkoutState === 'payment' && 'Payment'}
              {checkoutState === 'success' && 'Confirmed'}
            </h2>
            {checkoutState === 'cart' && items.length > 0 && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                {items.reduce((sum, i) => sum + i.quantity, 0)} items
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#111',
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {checkoutState === 'success' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
            }}>
              <svg style={{ width: '32px', height: '32px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#111' }}>Thank you</h3>
            <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '4px', fontSize: '14px' }}>
              Your order has been placed successfully.
            </p>
            <p style={{ color: '#9ca3af', textAlign: 'center', marginBottom: '24px', fontSize: '13px' }}>
              Confirmation sent to {shippingInfo.email || 'your email'}
            </p>
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#fafafa',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Number</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#111', fontFamily: 'monospace' }}>
                #UT-{Math.random().toString(36).substring(2, 8).toUpperCase()}
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                padding: '14px 32px',
                backgroundColor: '#111',
                color: 'white',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Continue Shopping
            </button>
          </div>
        )}

        {/* Shipping Form */}
        {checkoutState === 'shipping' && (
          <form onSubmit={handleShippingSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.name}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                    placeholder="John Doe"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
                  <input
                    type="email"
                    required
                    value={shippingInfo.email}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                    placeholder="john@example.com"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Street Address</label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                    placeholder="123 Main Street"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>City</label>
                    <input
                      type="text"
                      required
                      value={shippingInfo.city}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                      placeholder="New York"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={shippingInfo.zip}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, zip: e.target.value })}
                      placeholder="10001"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#111',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Continue to Payment
              </button>
              <button
                type="button"
                onClick={() => setCheckoutState('cart')}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Back to Cart
              </button>
            </div>
          </form>
        )}

        {/* Payment Form */}
        {checkoutState === 'payment' && (
          <form onSubmit={handlePayment} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expiry Date</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#111', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CVC</label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      maxLength={4}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                backgroundColor: '#fafafa',
                border: '1px solid #e5e7eb',
              }}>
                <h4 style={{ fontSize: '11px', fontWeight: 600, color: '#111', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Order Summary
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Subtotal</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>${totalPrice.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Shipping</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>$9.99</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>Tax</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>${(totalPrice * 0.08).toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '14px',
                  borderTop: '1px solid #e5e7eb',
                  marginTop: '10px',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#111' }}>Total</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#111' }}>
                    ${(totalPrice + 9.99 + totalPrice * 0.08).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: isProcessing ? '#9ca3af' : '#111',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {isProcessing ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Processing
                  </span>
                ) : (
                  `Pay $${(totalPrice + 9.99 + totalPrice * 0.08).toFixed(2)}`
                )}
              </button>
              <button
                type="button"
                onClick={() => setCheckoutState('shipping')}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Back to Shipping
              </button>
              <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure payment powered by Stripe
              </p>
            </div>
          </form>
        )}

        {/* Cart Items */}
        {checkoutState === 'cart' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', paddingTop: '60px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <svg
                      style={{ width: '28px', height: '28px', color: '#9ca3af' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>Your cart is empty</p>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>Add some items to get started</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '14px',
                        backgroundColor: '#fafafa',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={80}
                        height={100}
                        style={{
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px', color: '#111' }}>
                            {item.name}
                          </h3>
                          <p style={{ fontSize: '14px', color: '#111', fontWeight: 600 }}>
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid #e5e7eb',
                            backgroundColor: 'white',
                          }}>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              style={{
                                width: '32px',
                                height: '32px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '16px',
                                color: '#374151',
                              }}
                            >
                              −
                            </button>
                            <span style={{
                              width: '32px',
                              textAlign: 'center',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#111',
                            }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              style={{
                                width: '32px',
                                height: '32px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '16px',
                                color: '#374151',
                              }}
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#6b7280',
                              cursor: 'pointer',
                              fontSize: '12px',
                              textDecoration: 'underline',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 500, fontSize: '14px', color: '#374151' }}>Subtotal</span>
                  <span style={{ fontWeight: 600, fontSize: '18px', color: '#111' }}>${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#111',
                    color: 'white',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Checkout
                </button>
                <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '12px' }}>
                  Free shipping on orders over $100
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
