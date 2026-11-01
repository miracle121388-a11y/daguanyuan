# Production deployment

Production: https://daguanyuan.inspiralai.com/

Current target is defined in deploy/aliyun/target.json: profile miracle6-hk, ECS i-j6c3bjaw8vp6z315yjvj, Hong Kong, 47.238.123.112. Service root /srv/daguanyuan; container daguanyuan.

Use DOCKER_HOST=unix:///run/companion-docker/docker.sock with docker compose. Default Docker/containerd stay disabled. Native Caddy swm-proxy handles HTTPS through /etc/caddy/migrated-projects.caddy; preserve all other projects. Only the garden container may be updated or cleaned.

Zeabur project and migration bridge are deleted. Old ECS 8.218.221.59 is not a deployment target. See docs/DEPLOYMENT.md for current operations. Develop directly on main and push completed changes. Never commit credentials, albums or private literary sources.
