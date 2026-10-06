'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { loadRazorpayScript } from '@/lib/loadRazorpay';

export default function SubscriptionModal({ isOpen, onClose, currentUser, onPaymentSuccess }) {
  const [plans, setPlans] = useState({});
  const [selectedPlan, setSelectedPlan] = useState('Professional');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'creating' | 'processing' | 'success' | 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/config');
      const data = await res.json();
      if (data.plans) {
        setPlans(data.plans);
      }
    } catch (e) {
      console.error('Failed to load pricing config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      if (currentUser?.subscription?.plan) {
        setSelectedPlan(currentUser.subscription.plan);
      }
      setPaymentStatus('idle');
      setErrorMessage('');
      setSuccessData(null);
    }
  }, [isOpen, currentUser?.subscription?.plan]);

  if (!isOpen) return null;

  const currentPlanConfig = plans[selectedPlan] || {
    id: selectedPlan,
    name: selectedPlan,
    prices: { monthly: 2499, quarterly: 6749, annual: 23990 },
    maxSubCas: 5,
    maxClients: 200,
    features: []
  };

  const currentPrice = currentPlanConfig.prices?.[billingCycle] || 2499;

  const handlePayNow = async () => {
    if (paymentStatus === 'creating' || paymentStatus === 'processing') return;

    setErrorMessage('');
    setPaymentStatus('creating');

    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Please login to continue.');
      setPaymentStatus('failed');
      return;
    }

    try {
      // 1. Create order on backend
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          purpose: 'subscription_plan',
          planId: selectedPlan,
          billingCycle
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      // 2. Load Razorpay Checkout SDK
      setPaymentStatus('processing');
      const Razorpay = await loadRazorpayScript();

      // 3. Configure Razorpay Checkout Options
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'Smart CA Vault',
        description: orderData.description || `Plan Upgrade: ${currentPlanConfig.name}`,
        order_id: orderData.orderId,
        prefill: {
          name: currentUser?.name || orderData.customer?.name || '',
          email: currentUser?.email || orderData.customer?.email || '',
          contact: currentUser?.phone || orderData.customer?.phone || ''
        },
        notes: {
          planId: selectedPlan,
          billingCycle,
          orderRef: orderData.orderRef
        },
        theme: {
          color: '#059669'
        },
        modal: {
          ondismiss: () => {
            if (paymentStatus !== 'success') {
              setPaymentStatus('idle');
            }
          }
        },
        handler: async function (response) {
          try {
            setPaymentStatus('processing');

            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderRef: orderData.orderRef,
                paymentMethod: 'Razorpay Checkout'
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || 'Payment verification failed');
            }

            setPaymentStatus('success');
            setSuccessData({
              payment: verifyData.payment,
              activation: verifyData.activation
            });

            if (onPaymentSuccess) {
              onPaymentSuccess(verifyData);
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            setErrorMessage(verifyErr.message || 'Payment verification failed.');
            setPaymentStatus('failed');
          }
        }
      };

      const rzpInstance = new Razorpay(options);

      rzpInstance.on('payment.failed', function (resp) {
        console.error('Razorpay payment failed:', resp.error);
        setErrorMessage(resp.error?.description || 'Payment failed.');
        setPaymentStatus('failed');
      });

      rzpInstance.open();
    } catch (err) {
      console.error('Subscription checkout error:', err);
      setErrorMessage(err.message || 'Unable to start payment.');
      setPaymentStatus('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="font-bold text-lg text-slate-900 tracking-tight">Upgrade Plan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select a subscription plan for your firm.</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {paymentStatus === 'success' ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <Check size={24} className="stroke-[3]" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-slate-900">Plan Activated</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Your subscription to {currentPlanConfig.name} is now active.
                </p>
              </div>

              {successData && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs max-w-sm mx-auto space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plan:</span>
                    <strong className="text-slate-900">{currentPlanConfig.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <strong className="text-emerald-700">₹{successData.payment?.amount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valid Until:</span>
                    <strong className="text-slate-900">
                      {successData.activation?.expiresAt
                        ? new Date(successData.activation.expiresAt).toLocaleDateString()
                        : 'Active'}
                    </strong>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    window.location.reload();
                  }}
                  className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Billing Cycle Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {[
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'quarterly', label: 'Quarterly' },
                  { id: 'annual', label: 'Annual' }
                ].map((cycle) => (
                  <button
                    key={cycle.id}
                    type="button"
                    onClick={() => setBillingCycle(cycle.id)}
                    className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                      billingCycle === cycle.id
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cycle.label}
                  </button>
                ))}
              </div>

              {/* Plan Options */}
              <div className="space-y-2.5">
                {Object.keys(plans).length > 0 ? (
                  Object.values(plans).map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const price = plan.prices[billingCycle];

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{plan.name}</span>
                            {plan.id === 'Professional' && (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Up to {plan.maxSubCas} Sub-CAs • {plan.maxClients} Clients
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm sm:text-base font-extrabold text-slate-900">
                            ₹{price}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            /{billingCycle}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">Loading plans...</div>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={paymentStatus === 'creating' || paymentStatus === 'processing'}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={paymentStatus === 'creating' || paymentStatus === 'processing' || loading}
                  className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {paymentStatus === 'creating' || paymentStatus === 'processing' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Pay ₹{currentPrice}</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
