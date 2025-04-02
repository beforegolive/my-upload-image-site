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
  try {
    const { page = 1, limit = 20 } = req.query;
    const bucket = process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || "";
    const region = process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || "";

    // 先获取存储桶中所有对象
    const allObjects = await new Promise<{
      Contents: { Key: string; LastModified: string }[];
    }>((resolve, reject) => {
      cos.getBucket(
        {
          Bucket: bucket,
          Region: region,
          Prefix: "",
          MaxKeys: 1000, // 可根据实际情况调整
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(
              data as { Contents: { Key: string; LastModified: string }[] }
            );
          }
        }
      );
    });

    const { Contents = [] } = allObjects;

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

    const imageUrls = paginatedContents.map((item) => {
      return `https://${bucket}.cos.${region}.myqcloud.com/${item.Key}`;
    });

    res.status(200).json({ imageUrls, totalCount: sortedContents.length });
  } catch (error) {
    console.error("获取图片列表出错:", error);
    res.status(500).json({ error: "获取图片列表出错" });
  }
}
