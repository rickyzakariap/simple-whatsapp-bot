// Konfigurasi PM2 buat jalanin bot di server produksi.
// Pakai: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'ongbak-bot',
      script: 'index.js',
      cwd: __dirname,
      // Use Node from PATH unless the deployment specifies another binary.
      interpreter: process.env.NODE_BINARY || 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '30s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      max_memory_restart: '700M',
      kill_timeout: 10000,
      wait_ready: false,
      // Kode 0 dari aplikasi = berhenti normal (misal logout WA, harus pairing ulang),
      // jangan di-restart terus-menerus.
      stop_exit_codes: [0],
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Jakarta'
      },
      error_file: __dirname + '/logs/pm2-error.log',
      out_file: __dirname + '/logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true
    }
  ]
};
