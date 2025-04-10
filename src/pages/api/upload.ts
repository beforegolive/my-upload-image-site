// src/pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import COS from "cos-nodejs-sdk-v5";
import sharp from "sharp";

const cos = new COS({
  SecretId: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_ID,
  SecretKey: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const bucket = process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || "";
    const region = process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || "";

    const listObjectsParams = {
      Bucket: bucket,
      Region: region,
      Prefix: "",
      MaxKeys: parseInt(limit as string, 10),
      Marker: "",
    };

    const result = await new Promise((resolve, reject) => {
      cos.getBucket(listObjectsParams, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    const { Contents = [] } = result as {
      Contents: { Key: string; LastModified: string; Size: number }[];
    };

    // 按上传时间倒序排列
    const sortedContents = Contents.sort((a, b) => {
      const dateA = new Date(a.LastModified);
      const dateB = new Date(b.LastModified);
      return dateB.getTime() - dateA.getTime();
    });

    const startIndex =
      (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const endIndex = startIndex + parseInt(limit as string, 10);
    const paginatedContents = sortedContents.slice(startIndex, endIndex);

    const imageUrlsWithSize = await Promise.all(
      paginatedContents.map(async (item) => {
        const url = `https://${bucket}.cos.${region}.myqcloud.com/${item.Key}`;
        // 获取图片的二进制数据
        const getObjectParams = {
          Bucket: bucket,
          Region: region,
          Key: item.Key,
        };
        const imageData = await new Promise<Buffer>((resolve, reject) => {
          cos.getObject(getObjectParams, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data.Body as Buffer);
            }
          });
        });
        // 读取图片宽高信息
        const metadata = await sharp(imageData).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        return {
          url,
          size: item.Size,
          Key: item.Key,
          uploadTime: item.LastModified,
          width,
          height,
        };
      })
    );

    res.status(200).json({
      imageUrls: imageUrlsWithSize,
      totalCount: sortedContents.length,
    });
  } catch (error) {
    console.error("获取图片列表出错:", error);
    res.status(500).json({ error: "获取图片列表出错" });
  }
}
