# 构建 Docker 镜像
docker build -t nextjs-app .

# 运行 Docker 容器
docker run -p 3000:3000 nextjs-app    