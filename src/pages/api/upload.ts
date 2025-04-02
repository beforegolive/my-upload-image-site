import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import COS from "cos-nodejs-sdk-v5";

const cos = new COS({
  SecretId: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_ID,
  SecretKey: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_KEY,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = upload.array("files");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error("文件解析出错:", err);
        return res.status(500).json({ error: "文件解析出错" });
      }

      const randomFactor = req.body.randomFactor;
      const files = req.files as Express.Multer.File[];

      // 过滤以 . 开头的文件
      const validFiles = files.filter(
        (file) => !file.originalname.startsWith(".")
      );

      if (!validFiles || validFiles.length === 0) {
        return res.status(400).json({ error: "未提供有效文件" });
      }

      const imageUrls: string[] = [];

      for (const file of validFiles) {
        const key = `${randomFactor}/${file.originalname}`;
        try {
          await new Promise((resolve, reject) => {
            cos.putObject(
              {
                Bucket: process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || "",
                Region: process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || "",
                Key: key,
                StorageClass: "STANDARD",
                Body: file.buffer,
              },
              (err, data) => {
                if (err) {
                  console.error("上传文件出错:", err);
                  reject(err);
                } else {
                  const imageUrl = `https://${process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET}.cos.${process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION}.myqcloud.com/${key}`;
                  imageUrls.push(imageUrl);
                  resolve(data);
                }
              }
            );
          });
        } catch (error) {
          console.error("上传文件出错:", error);
        }
      }

      res.status(200).json({ imageUrls });
    });
  } else {
    res.status(405).json({ error: "方法不允许" });
  }
}
