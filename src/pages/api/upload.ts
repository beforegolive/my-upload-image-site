import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import COS from "cos-nodejs-sdk-v5";

const cos = new COS({
  SecretId: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_ID,
  SecretKey: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_KEY,
});

// 配置 multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = upload.single("file");

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error("Multer 错误:", err);
        return res.status(500).json({ error: "文件处理出错" });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "未提供文件" });
      }
      const decodedFileName = decodeURIComponent(file.originalname);
      let fileName = `${Date.now()}-${decodedFileName}`;
      const isDirectoryUpload = req.body.isDirectoryUpload === "true";
      if (isDirectoryUpload) {
        const directoryPrefix = "directory/"; // 统一前缀
        fileName = `${directoryPrefix}${fileName}`;
      }
      try {
        const result = await new Promise((resolve, reject) => {
          cos.putObject(
            {
              Bucket: process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || "",
              Region: process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || "",
              Key: fileName,
              StorageClass: "STANDARD",
              Body: file.buffer,
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
        const imageUrl = `https://${process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET}.cos.${process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION}.myqcloud.com/${fileName}`;
        res.status(200).json({ imageUrl });
      } catch (error) {
        console.error("图片上传失败:", error);
        res.status(500).json({ error: "上传到腾讯云出错" });
      }
    });
  } else {
    res.status(405).json({ error: "方法不允许" });
  }
};

export default handler;
