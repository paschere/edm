import http from "http";
import https from "https";
import { createInterface } from "readline";

const SHOP = "edmco.myshopify.com";
const SCOPES = "read_orders,read_customers,read_products";
const REDIRECT_URI = "http://localhost:4000/callback";

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("Client ID: ", (clientId) => {
  rl.question("Client Secret: ", (clientSecret) => {
    rl.close();

    const authUrl =
      `https://${SHOP}/admin/oauth/authorize` +
      `?client_id=${clientId}` +
      `&scope=${SCOPES}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=edm-dashboard`;

    console.log("\n Abre esta URL en el browser (logueado en Shopify):\n");
    console.log(authUrl);
    console.log("\nEsperando callback en http://localhost:4000 ...\n");

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost:4000");
      const code = url.searchParams.get("code");

      if (!code) {
        res.end("No code recibido");
        return;
      }

      const body = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      });

      const options = {
        hostname: SHOP,
        path: "/admin/oauth/access_token",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => (data += chunk));
        apiRes.on("end", () => {
          console.log("\nRespuesta de Shopify:", data.slice(0, 500));
          try {
            const json = JSON.parse(data);
            if (json.access_token) {
              console.log("\n✓ ACCESS TOKEN OBTENIDO:\n");
              console.log(`SHOPIFY_ADMIN_ACCESS_TOKEN=${json.access_token}\n`);
              console.log("Cópialo a .env.local y a Vercel.\n");
              res.end("Token obtenido. Puedes cerrar esta pestaña.");
            } else {
              console.log("Error JSON:", json);
              res.end("Error. Revisa la consola.");
            }
          } catch {
            console.log("\nShopify devolvió HTML — posible causa: client_secret incorrecto o app no instalada.");
            res.end("Error. Revisa la consola.");
          }
          server.close();
        });
      });

      apiReq.write(body);
      apiReq.end();
    });

    server.listen(4000);
  });
});
