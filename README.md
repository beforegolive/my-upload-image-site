====
代码库地址：
git@github.com:beforegolive/my-upload-image-site.git

记忆唤醒：
分析一下当前项目的所有代码内容，弄清楚当前站点所有的功能点，并罗列出来

仔细看下项目的代码，并记住代码实现细节。
项目的主代码在 src 目录中。

前端部分：
图片列表组件是：ImageList.tsx
分页组件：Pagination.tsx
上传组件：UploadButton.tsx
单文件上传组件：SingleFileUploadButton.tsx
目录上传组件：DirectoryUploadButton.tsx
图片预览组件： ImagePreviewModal.tsx
首页：index.tsx

后端部分：
图片上传接口：api/upload.ts
图片列表接口：api/get-images.ts

分页功能：通过腾讯云 COS 中的 marker 功能实现。
