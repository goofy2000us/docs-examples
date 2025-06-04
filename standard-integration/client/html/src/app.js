// Render PayPal button (default)
window.paypal
  .Buttons({
    style: {
      shape: "rect",
      layout: "vertical",
      color: "gold",
      label: "paypal",
    },
    message: {
      amount: 100,
    },

    async createOrder() {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cart: [
              {
                id: "YOUR_PRODUCT_ID",
                quantity: "YOUR_PRODUCT_QUANTITY",
              },
            ],
          }),
        });

        const orderData = await response.json();

        if (orderData.id) {
          return orderData.id;
        }
        const errorDetail = orderData?.details?.[0];
        const errorMessage = errorDetail
          ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
          : JSON.stringify(orderData);

        throw new Error(errorMessage);
      } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      }
    },

    async onApprove(data, actions) {
      try {
        const response = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const orderData = await response.json();

        const errorDetail = orderData?.details?.[0];

        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          return actions.restart();
        } else if (errorDetail) {
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
            orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
          resultMessage(
            `Transaction ${transaction.status}: ${transaction.id}<br>
          <br>See console for all available details`
          );
          console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2)
          );
        }
      } catch (error) {
        console.error(error);
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`
        );
      }
    },
  })
  .render("#paypal-button-container");

// Render Trustly Payment Mark
if (window.paypal && window.paypal.Marks && window.paypal.FUNDING.TRUSTLY) {
  window.paypal.Marks({
    fundingSource: window.paypal.FUNDING.TRUSTLY,
  }).render("#trustly-mark");
}

// Render Trustly Payment Fields
if (window.paypal && window.paypal.PaymentFields && window.paypal.FUNDING.TRUSTLY) {
  window.paypal.PaymentFields({
    fundingSource: window.paypal.FUNDING.TRUSTLY,
    style: {
      variables: {},
      rules: {},
    },
    onInit: (data, actions) => {
      const form = document.querySelector("form.paypal-payment-form");
      if (form) {
        form.addEventListener("submit", (e) => {
          const formData = new FormData(form);
          const paymentSource = formData.get("payment-option");
          if (paymentSource === window.paypal.FUNDING.TRUSTLY) {
            e.preventDefault();
            actions.validate().then((valid) => {
              if (valid) {
                window.location.href = `/second-page.html?payment-option=${window.paypal.FUNDING.TRUSTLY}`;
              }
            });
          }
        });
      }
    },
    fields: {
      name: {
        value: "John Doe",
      },
    },
  }).render("#trustly-container");
}

// Render Trustly Button
if (window.paypal && window.paypal.FUNDING && window.paypal.FUNDING.TRUSTLY) {
  window.paypal.Buttons({
    fundingSource: window.paypal.FUNDING.TRUSTLY,
    style: {
      label: "pay",
    },
    async createOrder() {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart: [
            {
              id: "YOUR_PRODUCT_ID",
              quantity: "YOUR_PRODUCT_QUANTITY",
            },
          ],
          payment_source: {
            trustly: {},
          },
        }),
      });
      const order = await response.json();
      return order.id;
    },
    onApprove(data) {
      // Show a thank you message or redirect
      const element = document.getElementById('trustly-btn');
      if (element) {
        element.innerHTML = '<h3>Thank you for your payment!</h3>';
      }
    },
    onCancel(data, actions) {
      console.log(`Order Canceled - ID: ${data.orderID}`);
    },
    onError(err) {
      console.error(err);
    }
  }).render("#trustly-btn");
}

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  container.innerHTML = message;
}
