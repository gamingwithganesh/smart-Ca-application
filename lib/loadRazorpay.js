/**
 * Dynamically loads Razorpay checkout.js script on demand
 * Resolves to window.Razorpay or throws error if unavailable
 */
export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Razorpay Checkout can only be loaded in the browser.'));
    }

    if (window.Razorpay) {
      return resolve(window.Razorpay);
    }

    // Check if script element is already added
    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Razorpay));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK.')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error('Razorpay SDK failed to initialize.'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay Checkout script. Check your internet connection.'));
    };

    document.body.appendChild(script);
  });
}
