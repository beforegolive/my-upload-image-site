import type { NextApiRequest, NextApiResponse } from "next";
import COS from "cos-nodejs-sdk-v5";

const cos = new COS({
  SecretId: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_ID,
  SecretKey: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const marker = (page - 1) * limit;

      // 先获取所有图片数量以计算总页数
      const allImagesResult = await new Promise((resolve, reject) => {
        cos.getBucket(
          {
            Bucket: process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || "",
            Region: process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || "",
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          }
        );
      });
      const totalImages = (allImagesResult as any).Contents.length;
      const totalPages = Math.ceil(totalImages / limit);

      const result = await new Promise((resolve, reject) => {
        cos.getBucket(
          {
            Bucket: process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || "",
            Region: process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || "",
            Marker: marker.toString(),
            MaxKeys: limit.toString(),
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          }
        );
      });

      const imageUrls = (result as any).Contents.map((item: any) => {
        return `https://${process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET}.cos.${process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION}.myqcloud.com/${item.Key}`;
      });

      res.status(200).json({ imageUrls, totalPages });
    } catch (error) {
      console.error("获取图片列表失败:", error);
      res.status(500).json({ error: "获取图片列表出错" });
    }
  } else {
    res.status(405).json({ error: "方法不允许" });
  }
}
