/**
 * Phaser Box2D 物理形状预览组件
 * 使用 Phaser 3 进行可视化渲染 (参考 phaser-box2d 官方插件风格)
 * https://github.com/phaserjs/phaser-box2d
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { PhysicsAnalysisResult } from '@/utils/physicsAnalyzer'

// 动态导入 Phaser 以避免 SSR 问题
let Phaser: any = null

interface PhaserBox2DPreviewProps {
  physicsResult: PhysicsAnalysisResult | null
  imageUrl?: string
  width?: number
  height?: number
  showDebug?: boolean
  enablePhysics?: boolean
}

const PhaserBox2DPreview: React.FC<PhaserBox2DPreviewProps> = ({
  physicsResult,
  imageUrl,
  width = 500,
  height = 500,
  showDebug = true,
  enablePhysics = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [phaserLoaded, setPhaserLoaded] = useState(false)

  // 加载 Phaser 模块
  useEffect(() => {
    const loadPhaser = async () => {
      try {
        const phaserModule = await import('phaser')
        Phaser = phaserModule.default || phaserModule
        setPhaserLoaded(true)
      } catch (err) {
        console.error('Failed to load Phaser:', err)
        setError('无法加载 Phaser 引擎')
        setIsLoading(false)
      }
    }
    loadPhaser()
  }, [])

  // 绘制物理形状到场景
  const drawPhysicsShapes = useCallback((scene: any, polygons: any[], img?: HTMLImageElement) => {
    const PTM_RATIO = 50 // pixels to meters

    // 物理坐标转像素坐标 (Box2D: Y轴向上为正)
    const toPixel = (v: { x: number; y: number }) => ({
      x: width / 2 + v.x * PTM_RATIO,
      y: height / 2 - v.y * PTM_RATIO
    })

    // 绘制背景网格
    const gridGraphics = scene.add.graphics()
    gridGraphics.lineStyle(1, 0x808080, 0.15)
    const gridSize = 32

    for (let x = 0; x <= width; x += gridSize) {
      gridGraphics.moveTo(x, 0)
      gridGraphics.lineTo(x, height)
    }
    for (let y = 0; y <= height; y += gridSize) {
      gridGraphics.moveTo(0, y)
      gridGraphics.lineTo(width, y)
    }
    gridGraphics.strokePath()

    // 绘制坐标轴
    const axisGraphics = scene.add.graphics()
    axisGraphics.lineStyle(1, 0x646464, 0.4)
    axisGraphics.lineBetween(0, height / 2, width, height / 2)
    axisGraphics.lineBetween(width / 2, 0, width / 2, height)

    // 绘制图片
    if (img) {
      const scale = Math.min(width / img.width, height / img.height) * 0.9
      const imgWidth = img.width * scale
      const imgHeight = img.height * scale
      const imgX = (width - imgWidth) / 2
      const imgY = (height - imgHeight) / 2

      scene.add.image(imgX + imgWidth / 2, imgY + imgHeight / 2, 'uploadedImage')
        .setAlpha(0.25)
        .setDisplaySize(imgWidth, imgHeight)
    }

    // 绘制多边形 - 模拟 CreatePhysicsEditorShape 的渲染效果
    const colors = [
      { fill: 0x007bff, stroke: '#007bff' },
      { fill: 0x28a745, stroke: '#28a745' },
      { fill: 0xffc107, stroke: '#ffc107' },
      { fill: 0xdc3545, stroke: '#dc3545' },
      { fill: 0x6f42c1, stroke: '#6f42c1' },
      { fill: 0x17a2b8, stroke: '#17a2b8' },
      { fill: 0xfd7e14, stroke: '#fd7e14' },
      { fill: 0x6c757d, stroke: '#6c757d' },
    ]

    polygons.forEach((poly: any[], idx: number) => {
      if (poly.length < 3) return

      const color = colors[idx % colors.length]
      const pixelPoly = poly.map(toPixel)

      // 创建多边形顶点数组
      const points = pixelPoly.map(p => ({ x: p.x, y: p.y }))

      // 绘制填充
      const graphics = scene.add.graphics()
      graphics.fillStyle(color.fill, 0.35)
      graphics.beginPath()
      graphics.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y)
      }
      graphics.closePath()
      graphics.fillPath()

      // 描边
      graphics.lineStyle(2, parseInt(color.stroke.replace('#', '0x')), 1)
      graphics.strokePath()

      // 绘制顶点
      if (showDebug) {
        points.forEach((p: { x: number; y: number }, vIdx: number) => {
          // 顶点圆圈
          graphics.fillStyle(0xffffff, 1)
          graphics.fillCircle(p.x, p.y, 5)
          graphics.lineStyle(1.5, 0x000000, 1)
          graphics.strokeCircle(p.x, p.y, 5)

          // 顶点编号
          if (poly.length <= 8) {
            scene.add.text(p.x + 8, p.y - 8, `${idx + 1}.${vIdx + 1}`, {
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#000000',
              fontStyle: 'bold'
            })
          }
        })
      }
    })

    // 绘制原点标记
    const origin = toPixel({ x: 0, y: 0 })
    const originGraphics = scene.add.graphics()
    originGraphics.fillStyle(0xff0000, 0.3)
    originGraphics.fillCircle(origin.x, origin.y, 8)
    originGraphics.lineStyle(2, 0xff0000, 1)
    originGraphics.strokeCircle(origin.x, origin.y, 8)
    originGraphics.fillStyle(0xff0000, 1)
    originGraphics.fillCircle(origin.x, origin.y, 4)
    scene.add.text(origin.x + 12, origin.y - 12, '(0,0)', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ff0000',
      fontStyle: 'bold'
    })

    // 绘制锚点
    if (physicsResult) {
      const anchor = physicsResult.body.anchorPoint
      const anchorX = (anchor.x - 0.5) * 2 * (physicsResult.body.boundingBox.width / 2)
      const anchorY = (0.5 - anchor.y) * 2 * (physicsResult.body.boundingBox.height / 2)
      const anchorPixel = toPixel({ x: anchorX, y: anchorY })

      const anchorGraphics = scene.add.graphics()
      anchorGraphics.fillStyle(0xffff00, 0.5)
      anchorGraphics.fillCircle(anchorPixel.x, anchorPixel.y, 6)
      anchorGraphics.lineStyle(2, 0xffff00, 1)
      anchorGraphics.strokeCircle(anchorPixel.x, anchorPixel.y, 6)
      scene.add.text(anchorPixel.x + 10, anchorPixel.y + 4, '锚点', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#ffff00',
        fontStyle: 'bold'
      })
    }
  }, [physicsResult, width, height, showDebug])

  // 初始化 Phaser 游戏
  useEffect(() => {
    if (!phaserLoaded || !physicsResult || !containerRef.current) return

    setIsLoading(true)
    setError(null)

    const destroyGame = () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }

    destroyGame()

    // 解析物理编辑器数据
    const { body } = physicsResult
    const polygons = body.polygons.map(poly =>
      poly.vertices.map(v => ({ x: v.x, y: -v.y }))
    )

    // 加载图片
    let img: HTMLImageElement | undefined
    const loadImage = () => {
      return new Promise<void>((resolve) => {
        if (!imageUrl) {
          resolve()
          return
        }
        img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve()
        img.onerror = () => resolve() // 图片加载失败也继续
        img.src = imageUrl
      })
    }

    loadImage().then(() => {
      class GameScene extends Phaser.Scene {
        constructor() {
          super({ key: 'GameScene' })
        }

        preload() {
          if (img) {
            this.textures.addImage('uploadedImage', img!)
          }
        }

        create() {
          drawPhysicsShapes(this, polygons, img)
        }

        update() {
          // 如果启用物理，每帧更新
        }
      }

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width,
        height,
        backgroundColor: '#ffffff',
        scene: GameScene,
        physics: enablePhysics ? {
          default: 'matter',
          matter: {
            gravity: { y: 1 },
            debug: showDebug
          }
        } : undefined
      }

      try {
        gameRef.current = new Phaser.Game(config)
        gameRef.current.events.once('ready', () => {
          setIsLoading(false)
        })
      } catch (err) {
        console.error('Failed to create Phaser game:', err)
        setError('无法创建 Phaser 游戏')
        setIsLoading(false)
      }
    })

    return () => {
      destroyGame()
    }
  }, [phaserLoaded, physicsResult, imageUrl, width, height, showDebug, enablePhysics, drawPhysicsShapes])

  if (!physicsResult) {
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
          minHeight: 200,
        }}
      >
        <span style={{ color: '#999' }}>请先分析图片以生成物理形状</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          border: '1px solid #1890ff',
          borderRadius: 6,
          maxWidth: '100%',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
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
            background: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
          }}
        >
          <span>正在初始化 Phaser 物理预览...</span>
        </div>
      )}
      {error && (
        <div style={{ color: '#ff4d4f', marginTop: 8 }}>{error}</div>
      )}
      <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 4, fontSize: 12 }}>
        <div style={{ marginBottom: 4 }}>
          <strong>Phaser Box2D 风格预览</strong> - 参考官方 phaser-box2d 插件渲染方式
        </div>
        <div style={{ color: '#666' }}>
          多边形数量: {physicsResult.body.polygons.length} |
          锚点: ({physicsResult.body.anchorPoint.x.toFixed(2)}, {physicsResult.body.anchorPoint.y.toFixed(2)})
        </div>
        <div style={{ color: '#888', marginTop: 4 }}>
          蓝色区域: 物理碰撞形状 | 红色点: 坐标原点 (0,0) | 黄色点: 锚点位置 | 1.N: 多边形.顶点索引
        </div>
      </div>
    </div>
  )
}

export default PhaserBox2DPreview
