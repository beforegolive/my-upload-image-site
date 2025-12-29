/**
 * Phaser 物理形状预览组件
 * 使用 Phaser + box2d 展示物理碰撞形状
 */

import React, { useEffect, useRef, useState } from 'react'
import { PhysicsVertex } from '@/utils/physicsAnalyzer'

interface PhaserPhysicsPreviewProps {
  polygons: PhysicsVertex[][]
  imageUrl?: string
  width?: number
  height?: number
  showDebug?: boolean
}

const PhaserPhysicsPreview: React.FC<PhaserPhysicsPreviewProps> = ({
  polygons,
  imageUrl,
  width = 400,
  height = 400,
  showDebug = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 像素到物理单位的转换比例
  const PTM_RATIO = 128 // pixels to meters

  useEffect(() => {
    if (!canvasRef.current || polygons.length === 0) return

    setIsLoading(true)
    setError(null)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('无法获取 canvas 上下文')
      setIsLoading(false)
      return
    }

    // 绘制函数
    const draw = () => {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制背景网格
      ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)'
      ctx.lineWidth = 0.5
      const gridSize = 32
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // 绘制坐标轴
      ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])

      // X轴
      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()

      // Y轴
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2, 0)
      ctx.lineTo(canvas.width / 2, canvas.height)
      ctx.stroke()

      ctx.setLineDash([])

      // 物理坐标转像素坐标
      const toPixel = (v: PhysicsVertex) => ({
        x: canvas.width / 2 + v.x * PTM_RATIO,
        y: canvas.height / 2 - v.y * PTM_RATIO
      })

      // 绘制图片（如果提供）
      if (imageUrl) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.globalAlpha = 0.3
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8
          const imgWidth = img.width * scale
          const imgHeight = img.height * scale
          const imgX = (canvas.width - imgWidth) / 2
          const imgY = (canvas.height - imgHeight) / 2
          ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight)
          ctx.globalAlpha = 1
        }
        img.src = imageUrl
      }

      // 绘制多边形
      const colors = [
        'rgba(0, 123, 255, 0.4)',
        'rgba(40, 167, 69, 0.4)',
        'rgba(255, 193, 7, 0.4)',
        'rgba(220, 53, 69, 0.4)',
        'rgba(111, 66, 193, 0.4)',
        'rgba(23, 162, 184, 0.4)',
      ]

      polygons.forEach((poly, idx) => {
        if (poly.length < 3) return

        const color = colors[idx % colors.length]
        const pixelPoly = poly.map(toPixel)

        // 填充
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(pixelPoly[0].x, pixelPoly[0].y)
        for (let i = 1; i < pixelPoly.length; i++) {
          ctx.lineTo(pixelPoly[i].x, pixelPoly[i].y)
        }
        ctx.closePath()
        ctx.fill()

        // 描边
        ctx.strokeStyle = colors[idx % colors.length].replace('0.4', '1')
        ctx.lineWidth = 2
        ctx.stroke()

        // 绘制顶点
        if (showDebug) {
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 1
          pixelPoly.forEach((p, vIdx) => {
            ctx.beginPath()
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            // 顶点编号
            ctx.fillStyle = '#000'
            ctx.font = '10px monospace'
            ctx.fillText(`${idx + 1}.${vIdx + 1}`, p.x + 6, p.y - 6)
            ctx.fillStyle = '#fff'
          })
        }
      })

      // 绘制原点标记
      const origin = toPixel({ x: 0, y: 0 })
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2)
      ctx.fill()

      // 原点标签
      ctx.fillStyle = '#000'
      ctx.font = 'bold 12px monospace'
      ctx.fillText('(0,0)', origin.x + 8, origin.y - 8)

      setIsLoading(false)
    }

    // 立即绘制
    draw()

  }, [polygons, imageUrl, width, height, showDebug])

  if (polygons.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          border: '1px dashed #d9d9d9',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
        }}
      >
        <span style={{ color: '#999' }}>暂无物理形状数据</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
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
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          加载中...
        </div>
      )}
      {error && (
        <div style={{ color: 'red', marginTop: 8 }}>{error}</div>
      )}
      <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
        蓝色区域: 物理碰撞形状 | 红色点: 坐标原点 (图片中心) | 1.N: 多边形.顶点索引
      </div>
    </div>
  )
}

export default PhaserPhysicsPreview
