/**
 * 物理形状分析工具
 * 用于从图片中提取物理碰撞形状数据，生成类似 PhysicsEditor 导出的格式
 */

export interface PhysicsVertex {
  x: number
  y: number
}

export interface PhysicsPolygon {
  vertices: PhysicsVertex[]
}

export interface PhysicsBody {
  name: string
  anchorPoint: { x: number; y: number }
  polygons: PhysicsPolygon[]
  boundingBox: {
    width: number
    height: number
    centerX: number
    centerY: number
  }
}

export interface PhysicsAnalysisResult {
  body: PhysicsBody
  originalContour: PhysicsVertex[]
  convexHull: PhysicsVertex[]
  decomposition: PhysicsPolygon[]
}

/**
 * 主分析函数：从图片数据生成物理形状
 */
export async function analyzeImagePhysics(
  imageData: ImageData,
  ptmRatio: number = 128,
  name: string = 'body'
): Promise<PhysicsAnalysisResult> {
  const width = imageData.width
  const height = imageData.height

  // 1. 提取轮廓点
  const contour = extractContour(imageData, 128)

  if (contour.length === 0) {
    throw new Error('No contour found in image')
  }

  // 2. 计算边界框
  const boundingBox = calculateBoundingBox(contour)
  const centerX = boundingBox.left + boundingBox.width / 2
  const centerY = boundingBox.top + boundingBox.height / 2

  // 3. 凸包计算
  const convexHullPoints = convexHull(contour)

  // 4. 凸分解（简化版：使用 ear clipping 或网格化）
  const decomposition = convexDecomposition(contour, boundingBox)

  // 5. 转换为物理坐标
  const physicsPolygons = decomposition.map(poly =>
    poly.map(point => ({
      x: (point.x - centerX) / ptmRatio,
      y: -(point.y - centerY) / ptmRatio // 翻转 Y 轴
    }))
  )

  const body: PhysicsBody = {
    name,
    anchorPoint: { x: centerX / width, y: centerY / height },
    polygons: physicsPolygons.map(v => ({ vertices: v })),
    boundingBox: {
      width: boundingBox.width / ptmRatio,
      height: boundingBox.height / ptmRatio,
      centerX: 0,
      centerY: 0
    }
  }

  // 转换轮廓和凸包为物理坐标
  const physicsContour = contour.map(p => ({
    x: (p.x - centerX) / ptmRatio,
    y: -(p.y - centerY) / ptmRatio
  }))

  const physicsHull = convexHullPoints.map(p => ({
    x: (p.x - centerX) / ptmRatio,
    y: -(p.y - centerY) / ptmRatio
  }))

  return {
    body,
    originalContour: physicsContour,
    convexHull: physicsHull,
    decomposition: physicsPolygons.map(v => ({ vertices: v }))
  }
}

/**
 * 从 ImageData 提取轮廓点
 */
export function extractContour(
  imageData: ImageData,
  threshold: number = 128
): { x: number; y: number }[] {
  const { data, width, height } = imageData
  const points: { x: number; y: number }[] = []

  // 使用边缘追踪算法 (Moore-Neighbor Tracing)
  const visited = new Set<string>()

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const alpha = data[idx + 3]

      // 如果是不透明像素，检查是否为边缘
      if (alpha >= threshold) {
        const key = `${x},${y}`
        if (visited.has(key)) continue

        // 检查是否为边缘点（周围有透明像素）
        if (isEdgePoint(x, y, data, width, height, threshold)) {
          // 使用简单的轮廓追踪
          const contour = traceContour(x, y, data, width, height, threshold)
          for (const p of contour) {
            visited.add(`${p.x},${p.y}`)
            points.push(p)
          }
        }
      }
    }
  }

  return points
}

/**
 * 检查是否为边缘点
 */
function isEdgePoint(
  x: number,
  y: number,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number
): boolean {
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1]
  ]

  for (const [dx, dy] of directions) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      return true
    }
    const idx = (ny * width + nx) * 4 + 3
    if (data[idx] < threshold) {
      return true
    }
  }
  return false
}

/**
 * 简单的轮廓追踪算法
 */
function traceContour(
  startX: number,
  startY: number,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number
): { x: number; y: number }[] {
  const contour: { x: number; y: number }[] = []
  let x = startX
  let y = startY
  let dir = 0 // 起始方向：向右

  // 8 个方向：右、右下、下、左下、左、左上、上、右上
  const directions = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1]
  ]

  const startKey = `${x},${y}`
  let count = 0
  const maxCount = width * height // 防止无限循环

  do {
    contour.push({ x, y })

    // 寻找下一个边缘点
    let found = false
    for (let i = 0; i < 8; i++) {
      const d = (dir + i) % 8
      const [dx, dy] = directions[d]
      const nx = x + dx
      const ny = y + dy

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4 + 3
        if (data[idx] >= threshold) {
          x = nx
          y = ny
          dir = (d + 5) % 8 // 反向，追踪轮廓内侧
          found = true
          break
        }
      }
    }

    if (!found) break
    count++
  } while (count < maxCount && `${x},${y}` !== startKey)

  return contour
}

/**
 * 计算边界框
 */
function calculateBoundingBox(
  points: { x: number; y: number }[]
): { left: number; top: number; width: number; height: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Graham 扫描凸包算法
 */
export function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return [...points]

  // 移除重复点
  const uniquePoints = points.filter((p, i) =>
    points.findIndex(other => other.x === p.x && other.y === p.y) === i
  )

  if (uniquePoints.length <= 2) return uniquePoints

  // 按 x 坐标排序，x 相同按 y 排序
  const sorted = [...uniquePoints].sort((a, b) =>
    a.x - b.x || a.y - b.y
  )

  // 计算叉积
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  // 构建上凸包
  const upper: { x: number; y: number }[] = []
  for (const p of sorted) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) >= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // 构建下凸包
  const lower: { x: number; y: number }[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) >= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  // 合并（去除重复的第一个和最后一个点）
  return [...upper.slice(0, -1), ...lower.slice(0, -1)]
}

/**
 * 凸分解算法
 * 简化版：将复杂多边形分解为多个凸多边形
 */
function convexDecomposition(
  contour: { x: number; y: number }[],
  boundingBox: { left: number; top: number; width: number; height: number }
): { x: number; y: number }[][] {
  if (contour.length < 3) return [contour]

  // 获取凸包作为基础
  const hull = convexHull(contour)

  // 如果凸包顶点数已经很少，直接返回
  if (hull.length <= 8) return [hull]

  // 使用网格化分解
  const gridSize = 32 // 网格大小
  const cols = Math.ceil(boundingBox.width / gridSize)
  const rows = Math.ceil(boundingBox.height / gridSize)

  const grid: boolean[][] = Array(rows).fill(null).map(() => Array(cols).fill(false))

  // 标记被占用的网格
  for (const p of contour) {
    const col = Math.floor((p.x - boundingBox.left) / gridSize)
    const row = Math.floor((p.y - boundingBox.top) / gridSize)
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      grid[row][col] = true
    }
  }

  // 收集每个被占用的网格中的点
  const polygons: { x: number; y: number }[][] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) {
        const polyPoints = contour.filter(p => {
          const col = Math.floor((p.x - boundingBox.left) / gridSize)
          const row = Math.floor((p.y - boundingBox.top) / gridSize)
          return col === c && row === r
        })

        if (polyPoints.length >= 3) {
          // 对该区域进行凸包计算
          const convexPoly = convexHull(polyPoints)
          if (convexPoly.length >= 3) {
            polygons.push(convexPoly)
          }
        }
      }
    }
  }

  // 如果分解失败，返回凸包
  return polygons.length > 0 ? polygons : [hull]
}

/**
 * 顶点简化（Douglas-Peucker 算法）
 */
export function simplifyPolygon(
  points: { x: number; y: number }[],
  tolerance: number = 1
): { x: number; y: number }[] {
  if (points.length <= 2) return [...points]

  let maxDist = 0
  let maxIndex = 0
  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last)
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPolygon(points.slice(0, maxIndex + 1), tolerance)
    const right = simplifyPolygon(points.slice(maxIndex), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [first, last]
}

/**
 * 计算点到线段的垂直距离
 */
function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2))
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)

  let closestX: number, closestY: number
  if (t < 0) {
    closestX = lineStart.x
    closestY = lineStart.y
  } else if (t > 1) {
    closestX = lineEnd.x
    closestY = lineEnd.y
  } else {
    closestX = lineStart.x + t * dx
    closestY = lineStart.y + t * dy
  }

  return Math.sqrt(Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2))
}

/**
 * 生成 PhysicsEditor 格式的 XML 导出
 */
export function exportToPhysicsEditorXML(result: PhysicsAnalysisResult): string {
  const { body } = result

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by Physics Analyzer -->
<bodydef version="1.0">
	<bodies>
		<body name="${body.name}">
            <anchorpoint>${body.anchorPoint.x.toFixed(4)},${body.anchorPoint.y.toFixed(4)}</anchorpoint>
			<fixtures>
				<fixture>
					<density>2</density>
					<friction>0.3</friction>
					<restitution>0.2</restitution>
					<filter_categoryBits>1</filter_categoryBits>
					<filter_groupIndex>0</filter_groupIndex>
					<filter_maskBits>65535</filter_maskBits>
					<fixture_type>POLYGON</fixture_type>
					<polygons>
`

  for (const poly of body.polygons) {
    xml += '            <polygon>'
    for (const v of poly.vertices) {
      xml += `  ${v.x.toFixed(4)},${v.y.toFixed(4)}`
    }
    xml += ' </polygon>\n'
  }

  xml += `					</polygons>
				</fixture>
			</fixtures>
		</body>
	</bodies>
	<metadata>
		<format>1</format>
		<ptm_ratio>128</ptm_ratio>
	</metadata>
</bodydef>`

  return xml
}

/**
 * 转换为 Matter.js 格式
 */
export function convertToMatterVertices(result: PhysicsAnalysisResult) {
  const { body } = result

  return body.polygons.map(poly => ({
    label: `polygon_${body.polygons.indexOf(poly)}`,
    vertices: poly.vertices.map(v => ({
      x: v.x * 100, // 转换为像素单位
      y: v.y * 100
    }))
  }))
}
