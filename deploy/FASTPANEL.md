# FastPanel deployment: booking.saitbusmap.site

The FastPanel address `46.28.44.184:8888` is only the control panel. Public application traffic must use HTTPS on `booking.saitbusmap.site`.

## Build and run

```bash
npm ci
npm run build
cd server
npm ci
npm run build
cd ..
cp deploy/.env.production.example server/.env
# Replace SESSION_SECRET in server/.env before starting.
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Copy the location blocks from `deploy/booking.saitbusmap.site.nginx.conf` into the domain's HTTPS Nginx configuration in FastPanel. Adjust the `root` path to the repository's actual absolute path, then validate and reload Nginx.

```bash
nginx -t
systemctl reload nginx
curl http://127.0.0.1:3001/health
curl https://booking.saitbusmap.site/health
```

Ensure the DNS A record for `booking.saitbusmap.site` points to `46.28.44.184`, enable a Let's Encrypt certificate in FastPanel, and keep port `3001` private. Only ports 80 and 443 need to be public for the website.
