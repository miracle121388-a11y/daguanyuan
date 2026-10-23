# Deployment

Production: https://daguanyuan.inspiralai.com/
- Alibaba Cloud profile: elsewhere-hk
- Region / ECS: cn-hongkong / i-j6c3egnl5bzb0itdjs7d
- Public IP: 8.218.221.59
- Compose root / container: /srv/daguanyuan / daguanyuan
- Runtime config: deploy/aliyun/compose.yaml
- Shared edge: elsewhere-edge; retain its other sites and containers.

See docs/DEPLOYMENT.md for deployment, rollback and browser-save migration. The Zeabur Hong Kong service is only a temporary legacy migration entry (project 6ac7c8653913920b91cae35c, service 6ac7cb8b3913920b91cae4bc, environment 6ac7c86589c17dc8a99e6a7d). Do not deploy the application there again. Preserve unrelated Zeabur services and servers. Develop directly on main. Never commit private credentials, albums or literary source files.
