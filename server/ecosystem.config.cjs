module.exports = {
  apps: [
    {
      name: 'sanate-wa-bot',
      script: 'index.mjs',
      cwd: 'D:\\DescargasWeb\\Paginas2026\\products-web\\server',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'C:\\Users\\sebas\\.pm2\\logs\\sanate-wa-bot-error.log',
      out_file: 'C:\\Users\\sebas\\.pm2\\logs\\sanate-wa-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'sanate-cf-tunnel',
      script: 'tunnel.mjs',
      cwd: 'D:\\DescargasWeb\\Paginas2026\\products-web\\server',
      interpreter: 'node',
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      error_file: 'C:\\Users\\sebas\\.pm2\\logs\\sanate-cf-tunnel-error.log',
      out_file: 'C:\\Users\\sebas\\.pm2\\logs\\sanate-cf-tunnel-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
