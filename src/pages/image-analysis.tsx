import React, { useState, useRef } from 'react'
import { Button, Upload, message, Card, Space, Typography, Spin, Empty } from 'antd'
import { UploadOutlined, FileImageOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import JsonEditorModal from '@/components/JsonEditorModal'
import { calculateSpriteFrames, getFileInfo } from '@/utils'

const { Title, Text } = Typography

interface ImageAnalysisData {
  fileName: string
  fileSize: number
  fileSizeFormatted: string
  dimensions: {
    width: number
    height: number
    aspectRatio: string
    totalPixels: number
  }
  colorInfo: {
    dominantColors: string[]
    hasTransparency: boolean
    colorCount: number
  }
  spriteInfo?: {
    isSpriteSheet: boolean
    suggestedFrameSize: number
    suggestedTotalFrames: number
    suggestedCols: number
    suggestedRows: number
  }
  format: string
  mimeType: string
  lastModified: string
}

const ImageAnalysisPage: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisData, setAnalysisData] = useState<ImageAnalysisData | null>(null)
  const [jsonEditorVisible, setJsonEditorVisible] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const analyzeImage = async (file: File) => {
    setAnalyzing(true)

    try {
      // 获取图片尺寸
      const dimensions = await getImageDimensions(file)

      // 读取文件二进制数据用于颜色分析
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // 基础分析数据
      const data: ImageAnalysisData = {
        fileName: file.name,
        fileSize: file.size,
        fileSizeFormatted: formatFileSize(file.size),
        dimensions: {
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: calculateAspectRatio(dimensions.width, dimensions.height),
          totalPixels: dimensions.width * dimensions.height,
        },
        colorInfo: {
          dominantColors: [], // 简化：暂不提取主色
          hasTransparency: await checkTransparency(file),
          colorCount: 0, // 简化：颜色数量估算
        },
        format: getFileInfo(file.name).extension,
        mimeType: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
      }

      // 尝试精灵图分析
      if (dimensions.width > 0 && dimensions.height > 0) {
        const spriteResult = calculateSpriteFrames(dimensions.width, dimensions.height, 30)
        if (spriteResult) {
          data.spriteInfo = {
            isSpriteSheet: spriteResult.totalFrames > 1,
            suggestedFrameSize: spriteResult.frameSize,
            suggestedTotalFrames: spriteResult.totalFrames,
            suggestedCols: spriteResult.cols,
            suggestedRows: spriteResult.rows,
          }
        }
      }

      setAnalysisData(data)
      message.success('图片分析完成')
    } catch (error) {
      console.error('图片分析出错:', error)
      message.error('图片分析失败')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setFileList([
        {
          uid: file.name,
          name: file.name,
          status: 'done',
          originFileObj: file,
        },
      ])
      await analyzeImage(file)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        setFileList([
          {
            uid: file.name,
            name: file.name,
            status: 'done',
            originFileObj: file,
          },
        ])
        await analyzeImage(file)
      } else {
        message.error('请上传图片文件')
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const resetAnalysis = () => {
    setFileList([])
    setAnalysisData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <Title level={2}>图片分析</Title>
      <Text type="secondary">
        上传图片可获取详细的分析数据，包括尺寸、格式、精灵图建议等信息。
      </Text>

      {/* 上传区域 */}
      <div
        style={{
          marginTop: 24,
          padding: 40,
          border: '2px dashed #d9d9d9',
          borderRadius: 8,
          textAlign: 'center',
          background: '#fafafa',
          cursor: 'pointer',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleUploadClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Space direction="vertical" size="large">
          <Spin spinning={analyzing}>
            <FileImageOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <p style={{ marginTop: 16, marginBottom: 0 }}>
              {analyzing ? '正在分析...' : '点击或拖拽图片到此处进行分析'}
            </p>
          </Spin>
        </Space>
      </div>

      {/* 分析结果展示 */}
      {analysisData && (
        <Card style={{ marginTop: 24 }} title="分析结果">
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" onClick={() => setJsonEditorVisible(true)}>
              查看 JSON
            </Button>
            <Button onClick={resetAnalysis}>重新上传</Button>
          </Space>

          {/* 图片预览和信息 */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* 缩略图 */}
            {fileList[0]?.originFileObj && (
              <div style={{ flex: '0 0 200px' }}>
                <img
                  src={URL.createObjectURL(fileList[0].originFileObj)}
                  alt="预览"
                  style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #d9d9d9' }}
                />
              </div>
            )}

            {/* 基本信息 */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
                <p><Text strong>文件名：</Text>{analysisData.fileName}</p>
                <p><Text strong>文件大小：</Text>{analysisData.fileSizeFormatted}</p>
                <p><Text strong>格式：</Text>{analysisData.format.toUpperCase()}</p>
                <p><Text strong>MIME类型：</Text>{analysisData.mimeType}</p>
              </Card>

              <Card size="small" title="尺寸信息">
                <p><Text strong>宽度：</Text>{analysisData.dimensions.width} px</p>
                <p><Text strong>高度：</Text>{analysisData.dimensions.height} px</p>
                <p><Text strong>宽高比：</Text>{analysisData.dimensions.aspectRatio}</p>
                <p><Text strong>总像素：</Text>{analysisData.dimensions.totalPixels.toLocaleString()}</p>
              </Card>

              {/* 精灵图建议 */}
              {analysisData.spriteInfo && (
                <Card size="small" title="精灵图分析" style={{ marginTop: 16 }}>
                  <p><Text strong>是否为精灵图：</Text>{analysisData.spriteInfo.isSpriteSheet ? '是' : '否'}</p>
                  {analysisData.spriteInfo.isSpriteSheet && (
                    <>
                      <p><Text strong>建议帧尺寸：</Text>{analysisData.spriteInfo.suggestedFrameSize} x {analysisData.spriteInfo.suggestedFrameSize} px</p>
                      <p><Text strong>建议总帧数：</Text>{analysisData.spriteInfo.suggestedTotalFrames}</p>
                      <p><Text strong>建议列数：</Text>{analysisData.spriteInfo.suggestedCols}</p>
                      <p><Text strong>建议行数：</Text>{analysisData.spriteInfo.suggestedRows}</p>
                    </>
                  )}
                </Card>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* JSON 编辑器弹窗 */}
      <JsonEditorModal
        visible={jsonEditorVisible}
        onCancel={() => setJsonEditorVisible(false)}
        onOk={() => setJsonEditorVisible(false)}
        data={analysisData || {}}
        setData={() => {}}
      />
    </div>
  )
}

// 辅助函数：获取图片尺寸
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// 辅助函数：格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 辅助函数：计算宽高比
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

// 辅助函数：检查图片是否有透明度
async function checkTransparency(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        // 检查 alpha 通道
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            resolve(true)
            URL.revokeObjectURL(img.src)
            return
          }
        }
      }
      resolve(false)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => resolve(false)
    img.src = URL.createObjectURL(file)
  })
}

export default ImageAnalysisPage
