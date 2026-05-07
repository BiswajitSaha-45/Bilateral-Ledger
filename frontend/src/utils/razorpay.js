/**
 * Opens the Razorpay checkout popup.
 * Requires the Razorpay JS SDK loaded in index.html.
 */
export function openRazorpayCheckout({ order, userInfo, onSuccess, onDismiss }) {
  if (!window.Razorpay) {
    alert('Payment gateway failed to load. Please refresh and try again.');
    return;
  }

  const options = {
    key: order.key_id,
    amount: order.amount,           // in paise
    currency: order.currency,
    order_id: order.order_id,
    name: 'BiLedger',
    description: `Settle dues with ${order.partner_name}`,
    image: '/logo192.png',
    prefill: {
      name: userInfo?.display_name || userInfo?.username || '',
      email: userInfo?.email || '',
    },
    theme: {
      color: '#7C3AED',
    },
    handler: (response) => {
      // Called on successful payment
      onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      },
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', (response) => {
    console.error('Razorpay payment failed:', response.error);
    if (onDismiss) onDismiss(response.error?.description || 'Payment failed');
  });

  rzp.open();
}
