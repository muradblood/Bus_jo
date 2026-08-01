module.exports = {
  apps: [
    {
      name: 'satglobal-bus',
      cwd: `${__dirname}/server`,
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3101,
        CORS_ORIGIN: 'https://satglobal.site',
        ALLOWED_ORIGINS: 'https://satglobal.site,https://www.satglobal.site',
        DATA_DIR: '/var/www/satglobal_si_usr/data/app-data/satglobal-bus',
      },
    },
  ],
};
