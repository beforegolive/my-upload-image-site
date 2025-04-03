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

    let marker = "";
    if (parseInt(page as string, 10) > 1) {
      // 计算前一页的最后一个对象的 Key 作为 Marker
      // 这里简化处理，实际应用中需要递归调用 getBucket 获取
      // 假设我们已经知道前一页的最后一个对象的 Key
      // marker = "previous_page_last_key";
      // 以下是一种可能的实现思路
      const previousPage = parseInt(page as string, 10) - 1;
      const previousResult = await new Promise((resolve, reject) => {
        const previousParams = {
          Bucket: bucket,
          Region: region,
          Prefix: "",
          MaxKeys: previousPage * parseInt(limit as string, 10),
          Marker: "",
        };
        cos.getBucket(previousParams, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
      const { Contents = [] } = previousResult as {
        Contents: { Key: string; LastModified: string; Size: number }[];
      };
      if (Contents.length > 0) {
        marker = Contents[Contents.length - 1].Key;
      }
    }

    const listObjectsParams = {
      Bucket: bucket,
      Region: region,
      Prefix: "",
      MaxKeys: parseInt(limit as string, 10),
      Marker: marker,
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

    const imageUrlsWithSize = sortedContents.map((item) => {
      const url = `https://${bucket}.cos.${region}.myqcloud.com/${item.Key}`;
      return {
        url,
        size: item.Size,
        Key: item.Key,
      };
    });

    // 获取存储桶中对象的总数
    const totalCountResult = await new Promise((resolve, reject) => {
      const totalCountParams = {
        Bucket: bucket,
        Region: region,
        Prefix: "",
      };
      cos.getBucket(totalCountParams, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Contents.length);
        }
      });
    });

    res.status(200).json({
      imageUrls: imageUrlsWithSize,
      totalCount: totalCountResult as number,
    });
  } catch (error) {
    console.error("获取图片列表出错:", error);
    res.status(500).json({ error: "获取图片列表出错" });
  }
}
