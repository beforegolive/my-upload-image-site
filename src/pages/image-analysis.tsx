import React, { useState, useRef, useEffect } from 'react'
import { Button, Upload, message, Card, Space, Typography, Spin, Collapse, Tabs, Table, CollapseProps, Switch, Slider } from 'antd'
import { UploadOutlined, FileImageOutlined, DownloadOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import JsonEditorModal from '@/components/JsonEditorModal'
import { calculateSpriteFrames, getFileInfo } from '@/utils'
import { analyzeImagePhysics, exportToPhysicsEditorXML, PhysicsAnalysisResult, PhysicsVertex } from '@/utils/physicsAnalyzer'

const { Title, Text } = Typography

// 可视化配置
interface VisualConfig {
  showOriginal: boolean
  showContour: boolean
  showConvexHull: boolean
  showPolygons: boolean
  showVertices: boolean
  opacity: number
  lineWidth: number
}

// 可视化组件
const PhysicsVisualizer: React.FC<{
  imageUrl: string
  contour: PhysicsVertex[]
  convexHull: PhysicsVertex[]
  polygons: PhysicsVertex[][]
  width: number
  height: number
  config: VisualConfig
}> = ({ imageUrl, contour, convexHull, polygons, width, height, config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // 加载图片
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImageLoaded(true)
      imgRef.current = img
    }
    img.src = imageUrl
  }, [imageUrl])

  // 绘制
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制原图
    if (config.showOriginal && imageLoaded && imgRef.current) {
      ctx.globalAlpha = config.opacity
      ctx.drawImage(imgRef.current, 0, 0)
      ctx.globalAlpha = 1
    }

    // 坐标转换：将物理坐标转换回像素坐标
    // 物理坐标原点在图片中心，Y轴向上
    // 像素坐标原点在左上角，Y轴向下
    const toPixel = (v: PhysicsVertex) => ({
      x: width / 2 + v.x * 128,
      y: height / 2 - v.y * 128
    })

    // 绘制轮廓点
    if (config.showContour) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const p of contour) {
        const { x, y } = toPixel(p)
        if (contour.indexOf(p) === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.stroke()
      ctx.fill()
    }

    // 绘制凸包
    if (config.showConvexHull && convexHull.length > 0) {
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = config.lineWidth
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      const hullPixel = convexHull.map(toPixel)
      ctx.moveTo(hullPixel[0].x, hullPixel[0].y)
      for (let i = 1; i < hullPixel.length; i++) {
        ctx.lineTo(hullPixel[i].x, hullPixel[i].y)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 绘制凸多边形
    const colors = [
      'rgba(0, 123, 255, 0.3)',
      'rgba(40, 167, 69, 0.3)',
      'rgba(255, 193, 7, 0.3)',
      'rgba(220, 53, 69, 0.3)',
      'rgba(111, 66, 193, 0.3)',
      'rgba(23, 162, 184, 0.3)',
      'rgba(253, 126, 20, 0.3)',
      'rgba(108, 117, 125, 0.3)',
    ]

    if (config.showPolygons) {
      polygons.forEach((poly, idx) => {
        const color = colors[idx % colors.length]
        ctx.strokeStyle = colors[idx % colors.length].replace('0.3', '1')
        ctx.fillStyle = color
        ctx.lineWidth = config.lineWidth

        const pixelPoly = poly.map(toPixel)
        ctx.beginPath()
        ctx.moveTo(pixelPoly[0].x, pixelPoly[0].y)
        for (let i = 1; i < pixelPoly.length; i++) {
          ctx.lineTo(pixelPoly[i].x, pixelPoly[i].y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      })
    }

    // 绘制顶点
    if (config.showVertices) {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1

      const drawVertices = (points: PhysicsVertex[]) => {
        points.forEach((p, idx) => {
          const { x, y } = toPixel(p)
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          // 顶点编号
          ctx.fillStyle = '#000'
          ctx.font = '10px monospace'
          ctx.fillText(String(idx + 1), x + 6, y - 6)
          ctx.fillStyle = '#fff'
        })
      }

      if (config.showPolygons) {
        polygons.forEach((poly, polyIdx) => {
          poly.forEach((p, vIdx) => {
            const { x, y } = toPixel(p)
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, Math.PI * 2)
            ctx.fillStyle = colors[polyIdx % colors.length].replace('0.3', '1')
            ctx.fill()
            ctx.strokeStyle = '#000'
            ctx.stroke()

            // 顶点编号 (多边形索引.顶点索引)
            ctx.fillStyle = '#000'
            ctx.font = '10px monospace'
            ctx.fillText(`${polyIdx + 1}.${vIdx + 1}`, x + 6, y - 6)
          })
        })
      }

      if (config.showConvexHull) {
        drawVertices(convexHull)
      }
    }

    // 绘制坐标轴
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 4])

    // X轴
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    // Y轴
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()

    ctx.setLineDash([])
  }, [imageLoaded, contour, convexHull, polygons, width, height, config])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          maxWidth: '100%',
        }}
      />
    </div>
  )
}

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
  const [physicsResult, setPhysicsResult] = useState<PhysicsAnalysisResult | null>(null)
  const [jsonEditorVisible, setJsonEditorVisible] = useState(false)
  const [visualConfig, setVisualConfig] = useState<VisualConfig>({
    showOriginal: true,
    showContour: false,
    showConvexHull: true,
    showPolygons: true,
    showVertices: false,
    opacity: 0.8,
    lineWidth: 2,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState<string>('')

  const analyzeImage = async (file: File) => {
    setAnalyzing(true)
    const url = URL.createObjectURL(file)
    setImageUrl(url)

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
          dominantColors: [],
          hasTransparency: await checkTransparency(file),
          colorCount: 0,
        },
        format: getFileInfo(file.name).extension,
        mimeType: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
      }

      // 精灵图分析
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

      // 物理形状分析
      const img = new Image()
      img.src = URL.createObjectURL(file)
      await new Promise(resolve => { img.onload = resolve })

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const physics = await analyzeImagePhysics(imageData, 128, file.name.split('.')[0])
        setPhysicsResult(physics)
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
    setPhysicsResult(null)
    setImageUrl('')
    setVisualConfig({
      showOriginal: true,
      showContour: false,
      showConvexHull: true,
      showPolygons: true,
      showVertices: false,
      opacity: 0.8,
      lineWidth: 2,
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 更新可视化配置
  const updateVisualConfig = (key: keyof VisualConfig, value: boolean | number) => {
    setVisualConfig(prev => ({ ...prev, [key]: value }))
  }

  const downloadXml = () => {
    if (!physicsResult) return

    const xml = exportToPhysicsEditorXML(physicsResult)
    const blob = new Blob([xml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${physicsResult.body.name}_physics.xml`
    a.click()
    URL.revokeObjectURL(url)
    message.success('XML 文件已下载')
  }

  // 构建物理分析展示的折叠面板
  const physicsCollapseItems: CollapseProps['items'] = physicsResult ? [
    {
      key: 'visualizer',
      label: '可视化预览',
      children: (
        <div>
          <PhysicsVisualizer
            imageUrl={imageUrl}
            contour={physicsResult.originalContour}
            convexHull={physicsResult.convexHull}
            polygons={physicsResult.body.polygons.map(p => p.vertices)}
            width={analysisData?.dimensions.width || 128}
            height={analysisData?.dimensions.height || 128}
            config={visualConfig}
          />
          <div style={{ marginTop: 16, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <Space>
              <span>原图:</span>
              <Switch
                size="small"
                checked={visualConfig.showOriginal}
                onChange={(v) => updateVisualConfig('showOriginal', v)}
                checkedChildren={<EyeOutlined />}
                unCheckedChildren={<EyeInvisibleOutlined />}
              />
            </Space>
            <Space>
              <span>轮廓:</span>
              <Switch
                size="small"
                checked={visualConfig.showContour}
                onChange={(v) => updateVisualConfig('showContour', v)}
              />
            </Space>
            <Space>
              <span>凸包:</span>
              <Switch
                size="small"
                checked={visualConfig.showConvexHull}
                onChange={(v) => updateVisualConfig('showConvexHull', v)}
              />
            </Space>
            <Space>
              <span>多边形:</span>
              <Switch
                size="small"
                checked={visualConfig.showPolygons}
                onChange={(v) => updateVisualConfig('showPolygons', v)}
              />
            </Space>
            <Space>
              <span>顶点:</span>
              <Switch
                size="small"
                checked={visualConfig.showVertices}
                onChange={(v) => updateVisualConfig('showVertices', v)}
              />
            </Space>
            <Space>
              <span>透明度:</span>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={visualConfig.opacity}
                onChange={(v) => updateVisualConfig('opacity', v)}
                style={{ width: 80 }}
              />
            </Space>
          </div>
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Text type="secondary">
              绿色虚线: 凸包 | 彩色填充: 凸多边形 | 红点: 原始轮廓 | 坐标原点: 图片中心
            </Text>
          </div>
        </div>
      ),
    },
    {
      key: 'basic',
      label: '基础信息',
      children: (
        <div>
          <p><Text strong>物体名称：</Text>{physicsResult.body.name}</p>
          <p><Text strong>锚点：</Text>({physicsResult.body.anchorPoint.x.toFixed(4)}, {physicsResult.body.anchorPoint.y.toFixed(4)})</p>
          <p><Text strong>边界框：</Text>{physicsResult.body.boundingBox.width.toFixed(4)} x {physicsResult.body.boundingBox.height.toFixed(4)} m</p>
          <p><Text strong>凸包顶点数：</Text>{physicsResult.convexHull.length}</p>
          <p><Text strong>凸多边形数量：</Text>{physicsResult.body.polygons.length}</p>
          <p><Text strong>原始轮廓点数：</Text>{physicsResult.originalContour.length}</p>
        </div>
      ),
    },
    {
      key: 'polygons',
      label: '多边形顶点数据',
      children: (
        <div>
          {physicsResult.body.polygons.map((poly, idx) => (
            <Card key={idx} size="small" title={`多边形 ${idx + 1} (${poly.vertices.length} 顶点)`} style={{ marginBottom: 8 }}>
              <Table
                size="small"
                pagination={false}
                dataSource={poly.vertices.map((v, i) => ({ key: i, index: i + 1, x: v.x.toFixed(4), y: v.y.toFixed(4) }))}
                columns={[
                  { title: '#', dataIndex: 'index', key: 'index', width: 50 },
                  { title: 'X', dataIndex: 'x', key: 'x' },
                  { title: 'Y', dataIndex: 'y', key: 'y' },
                ]}
              />
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'contour',
      label: '原始轮廓点',
      children: (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <Text type="secondary">共 {physicsResult.originalContour.length} 个点</Text>
          <Table
            size="small"
            pagination={{ pageSize: 20 }}
            dataSource={physicsResult.originalContour.map((v, i) => ({ key: i, index: i + 1, x: v.x.toFixed(4), y: v.y.toFixed(4) }))}
            columns={[
              { title: '#', dataIndex: 'index', key: 'index', width: 60 },
              { title: 'X', dataIndex: 'x', key: 'x' },
              { title: 'Y', dataIndex: 'y', key: 'y' },
            ]}
          />
        </div>
      ),
    },
  ] : []

  // 合并所有数据用于 JSON 查看
  const combinedData = analysisData ? {
    ...analysisData,
    physicsAnalysis: physicsResult ? {
      bodyName: physicsResult.body.name,
      anchorPoint: physicsResult.body.anchorPoint,
      boundingBox: physicsResult.body.boundingBox,
      polygonCount: physicsResult.body.polygons.length,
      polygons: physicsResult.body.polygons.map((p, i) => ({
        index: i,
        vertexCount: p.vertices.length,
        vertices: p.vertices
      })),
    } : null,
  } : {}

  return (
    <div>
      <Title level={2}>图片分析</Title>
      <Text type="secondary">
        上传图片可获取详细的分析数据，包括尺寸、格式、精灵图建议、物理碰撞形状等信息。
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
              查看完整 JSON
            </Button>
            {physicsResult && (
              <Button icon={<DownloadOutlined />} onClick={downloadXml}>
                导出 PhysicsEditor XML
              </Button>
            )}
            <Button onClick={resetAnalysis}>重新上传</Button>
          </Space>

          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
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
                        <p><Text strong>透明通道：</Text>{analysisData.colorInfo.hasTransparency ? '有' : '无'}</p>
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
                ),
              },
              ...(physicsResult ? [{
                key: 'physics',
                label: '物理形状分析',
                children: (
                  <Collapse items={physicsCollapseItems} />
                ),
              }] : []),
            ]}
          />
        </Card>
      )}

      {/* JSON 编辑器弹窗 */}
      <JsonEditorModal
        visible={jsonEditorVisible}
        onCancel={() => setJsonEditorVisible(false)}
        onOk={() => setJsonEditorVisible(false)}
        data={combinedData}
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
