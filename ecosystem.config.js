module.exports = {
  apps: [
    {
      name: "BE Waffle Test",
      script: "index.js",

      cwd: "/var/www/bewaffle/current",
      error_file: "/var/www/bewaffle/logs/web.err.log",
      out_file: "/var/www/bewaffle/logs/web.out.log",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],

  deploy: {
    production: {
      user: "phro",
      host: "deploy.philipwhite.dev",
      port: "2222",
      ref: "origin/main",
      repo: "git@github.com:Null-Cat/Waffle-Test-BE.git",
      fetch: "all",
      path: "/var/www/bewaffle",
      "post-setup": "ls -la",
      "post-deploy":
        "sudo npm install && sudo pm2 reload ecosystem.config.js --env production",
    },
  },
};
