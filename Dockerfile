# 使用官方 Node.js 18 镜像作为基础镜像
FROM docker.1ms.run/node:18-alpine as builder
# 设置工作目录
WORKDIR /app
# 复制 package.json 和 package-lock.json
COPY package*.json ./
# 安装生产依赖
RUN npm install --production
# 复制项目文件
COPY . .
# 构建 Next.js 应用
RUN npm run build

# 运行阶段
FROM docker.1ms.run/node:18-alpine
# 设置工作目录
WORKDIR /app
# 复制生产依赖
COPY --from=builder /app/node_modules ./node_modules
# 复制构建好的应用
COPY --from=builder /app/.next ./.next
# 复制公共文件
COPY --from=builder /app/public ./public
# 复制 package.json
COPY --from=builder /app/package.json ./package.json
# 暴露端口
EXPOSE 3000
# 启动应用
CMD ["npm", "start"]    