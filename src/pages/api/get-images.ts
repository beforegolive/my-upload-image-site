// src/pages/api/get-images.ts
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
        uploadTime: item.LastModified,
      };
    });

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
