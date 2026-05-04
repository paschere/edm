import { register } from "@shopify/web-pixels-extension";

// Cambia esta URL por la URL de producción del dashboard
const ENDPOINT = "https://edmco.vercel.app/api/pixel/events";

register(({ analytics }) => {
  const send = (eventType, payload) =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, ...payload }),
      keepalive: true,
    }).catch(() => {});

  analytics.subscribe("page_viewed", (e) =>
    send("page_viewed", { url: e.context.document.location.href })
  );

  analytics.subscribe("product_viewed", (e) =>
    send("product_viewed", {
      url: e.context.document.location.href,
      productId: e.data.productVariant?.product?.id,
    })
  );

  analytics.subscribe("product_added_to_cart", (e) =>
    send("product_added_to_cart", {
      productId: e.data.cartLine?.merchandise?.product?.id,
    })
  );

  analytics.subscribe("checkout_started", (e) =>
    send("checkout_started", {
      cartTotal: e.data.checkout?.totalPrice?.amount,
    })
  );

  analytics.subscribe("checkout_completed", (e) =>
    send("checkout_completed", {
      orderId: e.data.checkout?.order?.id,
      cartTotal: e.data.checkout?.totalPrice?.amount,
    })
  );
});
