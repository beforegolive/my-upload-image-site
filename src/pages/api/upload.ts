// src/pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import COS from "cos-nodejs-sdk-v5";
import sharp from "sharp";
import multer from "multer";
import fs from "fs"; // 使用 ES6 导入 fs 模块

const cos = new COS({
  SecretId: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_ID,
  SecretKey: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_KEY,
});

// 配置 multer 中间件
const upload = multer({ dest: "uploads/" });

// 处理多个文件上传
const uploadMiddleware = upload.array("files");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(null);
        }
      });
    });

    const bucket = process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || "";
    const region = process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || "";

    const uploadedImages = [];

    if (req.files) {
      const files = req.files as Express.Multer.File[];
      for (const file of files) {
        const key = `uploads/${Date.now()}-${file.originalname}`;
        const putObjectParams = {
          Bucket: bucket,
          Region: region,
          Key: key,
          Body: fs.createReadStream(file.path), // 使用导入的 fs 模块
        };

        await new Promise((resolve, reject) => {
          cos.putObject(putObjectParams, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });

        const url = `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
        let width = 0;
        let height = 0;
        try {
          const metadata = await sharp(file.path).metadata();
          width = metadata.width || 0;
          height = metadata.height || 0;
        } catch (error) {
          console.warn(
            `文件 ${key} 不是有效的图片格式，跳过读取宽高信息。error: ${error}`
          );
        }

        uploadedImages.push({
          url,
          size: file.size,
          Key: key,
          uploadTime: new Date().toISOString(),
          width,
          height,
        });

        // 删除临时文件
        fs.unlinkSync(file.path); // 使用导入的 fs 模块
      }
    }

    res.status(200).json({
      imageUrls: uploadedImages,
      totalCount: uploadedImages.length,
    });
  } catch (error) {
    console.error("上传图片出错:", error);
    res.status(500).json({ error: "上传图片出错" });
  }
}
