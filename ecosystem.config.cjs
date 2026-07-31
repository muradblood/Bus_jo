module.exports = {
  apps: [
    {
      name: 'bus-jo-server',
      cwd: `${__dirname}/server`,
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        CORS_ORIGIN: 'https://booking.saitbusmap.site',
        ALLOWED_ORIGINS: 'https://booking.saitbusmap.site',
      },
    },
  ],
};
