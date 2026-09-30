'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building,
  Users,
  MessageSquare
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
  }, [isOpen]);

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
      setErrorMessage('You must be logged in to purchase a subscription.');
      setPaymentStatus('failed');
      return;
    }

    try {
      // 1. Create order on backend (server calculates exact amount)
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

      // 2. Load Razorpay Checkout SDK on demand
      setPaymentStatus('processing');
      const Razorpay = await loadRazorpayScript();

      // 3. Configure Razorpay Checkout Options
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'Smart CA Vault',
        description: orderData.description || `CA Plan Upgrade: ${currentPlanConfig.name}`,
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
          color: '#059669' // Emerald-600 Smart CA theme
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

            // 4. Verify Payment Signature Server-Side
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
              throw new Error(verifyData.message || 'Payment signature verification failed');
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
            setErrorMessage(verifyErr.message || 'Payment verification failed. Please contact support.');
            setPaymentStatus('failed');
          }
        }
      };

      const rzpInstance = new Razorpay(options);

      rzpInstance.on('payment.failed', function (resp) {
        console.error('Razorpay payment failed:', resp.error);
        setErrorMessage(resp.error?.description || 'Payment was declined by your bank.');
        setPaymentStatus('failed');
      });

      rzpInstance.open();
    } catch (err) {
      console.error('Subscription checkout error:', err);
      setErrorMessage(err.message || 'Unable to start checkout. Please try again.');
      setPaymentStatus('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-white">Upgrade CA Practice Plan</h3>
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>Razorpay Secured • Instant Activation</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {paymentStatus === 'success' ? (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check size={36} className="stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-2xl text-slate-900">Subscription Active!</h4>
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
                  Your payment for <strong>{currentPlanConfig.name}</strong> was successful. Your firm limits and features have been upgraded immediately.
                </p>
              </div>

              {successData && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-left max-w-md mx-auto space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Ref:</span>
                    <strong className="text-slate-900">{successData.payment?.orderRef}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment ID:</span>
                    <strong className="text-slate-900">{successData.payment?.razorpayPaymentId}</strong>
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

              <div className="pt-3">
                <button
                  onClick={() => {
                    onClose();
                    window.location.reload();
                  }}
                  className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Billing Cycle Toggle */}
              <div className="flex justify-center">
                <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                  {[
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'quarterly', label: 'Quarterly (Save 10%)' },
                    { id: 'annual', label: 'Annual (Save 20% 🎉)' }
                  ].map((cycle) => (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => setBillingCycle(cycle.id)}
                      className={`px-3 sm:px-4 py-1.5 rounded-xl transition cursor-pointer ${
                        billingCycle === cycle.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cycle.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.keys(plans).length > 0 ? (
                  Object.values(plans).map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const price = plan.prices[billingCycle];

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {plan.id === 'Professional' && (
                          <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                            Popular
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="font-extrabold text-slate-900 text-sm">{plan.name}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                            {plan.description}
                          </div>
                          <div className="pt-2">
                            <span className="text-xl font-black text-slate-900">₹{price}</span>
                            <span className="text-[10px] text-slate-500 font-medium">/{billingCycle}</span>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-200/80 space-y-1.5 text-[11px] text-slate-700">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Users size={12} className="text-emerald-600" />
                            <span>{plan.maxSubCas} Sub-CAs</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Building size={12} className="text-emerald-600" />
                            <span>{plan.maxClients} Clients</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center py-4 text-xs text-slate-400">Loading plan tiers...</div>
                )}
              </div>

              {/* Selected Plan Summary & Features */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Included in {currentPlanConfig.name}:
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      All plan upgrades include 24/7 client portal and WhatsApp tax return retrieval.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Total Payable</div>
                    <div className="text-xl font-black text-emerald-700">₹{currentPrice}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-200">
                  {(currentPlanConfig.features || []).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check size={9} className="stroke-[3]" />
                      </div>
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Checkout Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Encrypted 256-Bit SSL Razorpay Gateway</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={paymentStatus === 'creating' || paymentStatus === 'processing'}
                    className="btn-outline px-4 py-2.5 rounded-xl text-xs font-bold w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayNow}
                    disabled={paymentStatus === 'creating' || paymentStatus === 'processing'}
                    className="btn-primary px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer w-full sm:w-auto"
                  >
                    {paymentStatus === 'creating' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Creating Order...</span>
                      </>
                    ) : paymentStatus === 'processing' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Processing Payment...</span>
                      </>
                    ) : paymentStatus === 'failed' ? (
                      <>
                        <span>Try Again • ₹{currentPrice}</span>
                        <ArrowRight size={14} />
                      </>
                    ) : (
                      <>
                        <span>Pay ₹{currentPrice} with Razorpay</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
