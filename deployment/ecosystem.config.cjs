module.exports = {
  apps: [
    {
      name: "supabase-projects-alive",
      cwd: "/var/www/supabase-projects-alive",
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 1209",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "1209"
      },
      max_memory_restart: "300M",
      autorestart: true
    }
  ]
};
