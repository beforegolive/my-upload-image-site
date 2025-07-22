// src/pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import COS from 'cos-nodejs-sdk-v5'
import sharp from 'sharp'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { isEmpty } from '@/utils'

const cos = new COS({
  SecretId: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_ID,
  SecretKey: process.env.NEXT_PUBLIC_TENCENT_CLOUD_SECRET_KEY,
})

// 配置 multer 中间件
const upload = multer({ dest: 'uploads/' })

// 处理多个文件上传
const uploadMiddleware = upload.array('files')

// 定义允许的文件类型列表
const allowedFileTypes = [
  // 原有的文件类型
  'image/jpeg',
  'image/png',
  'audio/mpeg',
  // 新增 .json 对应的 MIME 类型
  'application/json',
  // 新增 .xml 对应的 MIME 类型
  'text/xml',
]

export const config = {
  api: {
    bodyParser: false,
  },
}

// MIME类型映射表
const mimeTypeMap = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.xml': 'application/xml',
}

/**
 * 根据文件扩展名获取MIME类型
 * @param {string} filePath - 文件路径
 * @returns {string} - MIME类型
 */
function getMimeType(filePath: string) {
  const ext: string = path.extname(filePath).toLowerCase()
  // @ts-ignore
  return mimeTypeMap[ext] || 'application/octet-stream'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await new Promise((resolve, reject) => {
      // @ts-expect-error 类型不匹配
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve(null)
        }
      })
    })

    const bucket = process.env.NEXT_PUBLIC_TENCENT_CLOUD_BUCKET || ''
    const region = process.env.NEXT_PUBLIC_TENCENT_CLOUD_REGION || ''
    const compress = req.body.compress === 'true'
    const preDefinedNames = req.body.preDefinedNames?.split('|') || []
    const uploadedImages = []

    // @ts-expect-error 类型不匹配
    if (req.files) {
      // @ts-expect-error 类型不匹配
      const files = req.files as Express.Multer.File[]
      for (const [index, file] of files.entries()) {
        // 检查文件类型
        if (!allowedFileTypes.includes(file.mimetype)) {
          return res.status(400).json({ error: '不支持的文件类型' })
        }

        const filePath = file.path
        let size = file.size // 初始化尺寸为原始尺寸

        if (compress) {
          try {
            let compressedImage
            if (file.originalname.endsWith('.png')) {
              // 针对 PNG 图片的压缩方法
              compressedImage = await sharp(filePath)
                .png({ quality: 80, compressionLevel: 9 })
                .toBuffer()
            } else if (file.originalname.endsWith('.jpg') || file.originalname.endsWith('.jpeg')) {
              // 针对 JPG 图片的压缩方法
              compressedImage = await sharp(filePath).jpeg({ quality: 70 }).toBuffer()
            }

            if (compressedImage) {
              fs.writeFileSync(filePath, compressedImage)
              // 获取压缩后的文件大小
              const stats = fs.statSync(filePath)
              size = stats.size
            }
          } catch (error) {
            console.error('图片压缩出错:', error)
          }
        }

        const originalMimeType = getMimeType(file?.originalname)

        const curPreDefinedName = preDefinedNames[index]
        const key = isEmpty(curPreDefinedName)
          ? `uploads/${Date.now()}-${file.originalname}`
          : curPreDefinedName
        const putObjectParams = {
          Bucket: bucket,
          Region: region,
          Key: key,
          Body: fs.createReadStream(filePath),
          ContentType: originalMimeType,
        }

        await new Promise((resolve, reject) => {
          cos.putObject(putObjectParams, (err, data) => {
            if (err) {
              reject(err)
            } else {
              resolve(data)
            }
          })
        })

        const url = `https://${bucket}.cos-website.${region}.myqcloud.com/${key}`
        let width = 0
        let height = 0
        try {
          const metadata = await sharp(filePath).metadata()
          width = metadata.width || 0
          height = metadata.height || 0
        } catch (error) {
          console.warn(`文件 ${key} 不是有效的图片格式，跳过读取宽高信息。error: ${error}`)
        }

        const response = await fetch(url, { method: 'HEAD' }) // 发送 HEAD 请求，只获取响应头
        const mimeType = response.headers.get('Content-Type') || ''

        uploadedImages.push({
          url,
          size,
          Key: key,
          originalName: file.originalname,
          uploadTime: new Date().toISOString(),
          width,
          height,
          mimeType,
        })

        // 删除临时文件
        fs.unlinkSync(filePath)
      }
    }

    res.status(200).json({
      imageUrls: uploadedImages,
      totalCount: uploadedImages.length,
    })
  } catch (error) {
    console.error('上传图片出错:', error)
    res.status(500).json({ error: '上传图片出错' })
  }
}
