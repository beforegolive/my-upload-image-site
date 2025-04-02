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
  console.log("接收到 /api/upload 请求");
  if (req.method === "POST") {
    console.log("开始处理 POST 请求");
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error("文件解析出错:", err);
        return res.status(500).json({ error: "文件解析出错" });
      }

      console.log("文件解析成功");
      const randomFactor = req.body.randomFactor;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        console.log("未提供文件");
        return res.status(400).json({ error: "未提供文件" });
      }

      const imageUrls: string[] = [];

      for (const file of files) {
        const key = `${randomFactor}/${file.originalname}`;
        console.log(`开始上传文件: ${key}`);
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
                  console.error("上传文件到 COS 出错:", err);
                  reject(err);
                } else {
                  const imageUrl = `https://${process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET}.cos.${process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION}.myqcloud.com/${key}`;
                  imageUrls.push(imageUrl);
                  console.log(`文件上传成功: ${key}`);
                  resolve(data);
                }
              }
            );
          });
        } catch (error) {
          console.error("上传文件出错:", error);
          return res.status(500).json({ error: "上传文件出错" });
        }
      }

      console.log("所有文件上传完成，发送响应");
      res.status(200).json({ imageUrls });
    });
  } else {
    console.log("不支持的请求方法");
    res.status(405).json({ error: "方法不允许" });
  }
}
