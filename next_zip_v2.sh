#!/bin/bash

# 定义项目根目录
PROJECT_ROOT="."

# 构建 Next.js 项目
echo "开始构建 Next.js 项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "构建 Next.js 项目时出错，退出脚本。"
    exit 1
fi
echo "Next.js 项目构建成功。"

# 定义要包含在 ZIP 文件中的目录和文件
INCLUDE_DIRS=(".next")
# 假设云函数入口文件为 index.js，可按需修改
INCLUDE_FILES=("package.json" "package-lock.json" "index.js" "scf_bootstrap") 

# 创建 ZIP 文件
ZIP_FILENAME="nextjs_project_v2.zip"


# 初始化 ZIP 文件
if [ -f "$ZIP_FILENAME" ]; then
    rm "$ZIP_FILENAME"
fi

# 添加目录到 ZIP 文件
for dir in "${INCLUDE_DIRS[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        zip -r "$ZIP_FILENAME" "$PROJECT_ROOT/$dir"
    fi
done

# 添加文件到 ZIP 文件
for file in "${INCLUDE_FILES[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        zip "$ZIP_FILENAME" "$PROJECT_ROOT/$file"
    fi
done

echo "已成功将项目打包为 $ZIP_FILENAME"
    