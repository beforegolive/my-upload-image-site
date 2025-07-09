/**
 * 处理SpriteSheet图片，只提取第一帧的轮廓
 * @param imagePath 图片文件路径或URL
 * @param frameWidth 单帧宽度（默认等于图像宽度）
 * @param frameHeight 单帧高度（默认等于图像高度）
 * @returns 第一帧的边缘点数组
 */
export async function extractFirstFrameEdges(
  imageData: ImageData,
  // imageDataSource?: any,
  frameWidth?: number,
  frameHeight?: number
) {
  //   const imageDataSource = imageData;

  try {
    // let imageData;
    let canvasWidth = 0;
    let canvasHeight = 0;
    // imageData=

    canvasWidth = imageData.width;
    canvasHeight = imageData.height;

    // 如果未指定帧尺寸，尝试自动检测
    if (!frameWidth || !frameHeight) {
      const { frameWidth: detectedWidth, frameHeight: detectedHeight } =
        detectSpriteSheetFrames(
          imageData,
          canvasWidth,
          canvasHeight
          // canvas.width,
          // canvas.height
        );

      frameWidth = detectedWidth;
      frameHeight = detectedHeight;
    }

    // 确保帧尺寸不超过图像尺寸
    // frameWidth = Math.min(frameWidth, canvas.width)
    // frameHeight = Math.min(frameHeight, canvas.height)

    frameWidth = Math.min(frameWidth, canvasWidth);
    frameHeight = Math.min(frameHeight, canvasHeight);

    // 创建第一帧的像素数据副本
    const frameData = new ImageData(frameWidth, frameHeight);

    // 复制第一帧的数据
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const srcIdx = (y * canvasWidth + x) * 4;
        const dstIdx = (y * frameWidth + x) * 4;

        frameData.data[dstIdx] = imageData.data[srcIdx]; // R
        frameData.data[dstIdx + 1] = imageData.data[srcIdx + 1]; // G
        frameData.data[dstIdx + 2] = imageData.data[srcIdx + 2]; // B
        frameData.data[dstIdx + 3] = imageData.data[srcIdx + 3]; // A
      }
    }

    const verticesArr = detectEdgesByErosionDilation(
      frameData,
      frameWidth,
      frameHeight
    );
    const simplifiedArr = simplifyVertices(verticesArr, 10);
    console.log("原顶点数组个数:", verticesArr.length);
    console.log("简化后的顶点数组个数:", simplifiedArr.length);
    // 使用之前的边缘检测算法处理第一帧
    return {
      frameWidth: frameWidth,
      frameHeight: frameHeight,
      vertices: simplifiedArr,
      wholeWidth: canvasWidth,
      wholeHeight: canvasHeight,
    };
  } catch (error) {
    console.error("提取第一帧边缘时出错:", error);
    throw error;
  }
}

/**
 * 优化版：检测SpriteSheet的帧尺寸
 * 使用像素分布分析和边缘检测来提高准确性
 * @param imageData 图像像素数据
 * @param width 图像宽度
 * @param height 图像高度
 * @returns 帧尺寸 { frameWidth, frameHeight }
 */
function detectSpriteSheetFrames(
  imageData: ImageData,
  width: number,
  height: number
): { frameWidth: number; frameHeight: number } {
  const { data } = imageData;
  const threshold = 10; // 透明度阈值

  // 1. 分析水平和垂直方向的像素分布
  const horizontalDistribution = new Array(width).fill(0);
  const verticalDistribution = new Array(height).fill(0);

  // 计算每列和每行的非透明像素数量
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > threshold) {
        horizontalDistribution[x]++;
        verticalDistribution[y]++;
      }
    }
  }

  // 2. 寻找可能的分隔线（非透明像素极少的位置）
  // 动态计算分隔线检测阈值，取非透明像素数量的平均值作为参考
  const horizontalAvg =
    horizontalDistribution.reduce((sum, count) => sum + count, 0) / width;
  const verticalAvg =
    verticalDistribution.reduce((sum, count) => sum + count, 0) / height;
  const horizontalDividers = findDividers(
    horizontalDistribution,
    horizontalAvg * 0.2
  );
  const verticalDividers = findDividers(
    verticalDistribution,
    verticalAvg * 0.2
  );

  // 3. 计算可能的帧尺寸
  let frameWidth = width;
  let frameHeight = height;

  // 分析水平分隔线
  if (horizontalDividers.length > 1) {
    // 计算平均间距
    let totalGap = 0;
    for (let i = 1; i < horizontalDividers.length; i++) {
      totalGap += horizontalDividers[i] - horizontalDividers[i - 1];
    }

    frameWidth = Math.round(totalGap / (horizontalDividers.length - 1));
  }

  // 分析垂直分隔线
  if (verticalDividers.length > 1) {
    let totalGap = 0;
    for (let i = 1; i < verticalDividers.length; i++) {
      totalGap += verticalDividers[i] - verticalDividers[i - 1];
    }

    frameHeight = Math.round(totalGap / (verticalDividers.length - 1));
  }

  // 4. 如果没有找到分隔线，尝试基于图像尺寸和可能的帧数估算
  if (horizontalDividers.length <= 1) {
    // 尝试更多列数：2 到 20
    const possibleColumns = Array.from({ length: 19 }, (_, i) => i + 2);
    let bestFit = 1;
    let minRemainder = width;

    for (const cols of possibleColumns) {
      if (width % cols === 0) {
        bestFit = cols;
        break;
      }

      const remainder = width % cols;
      if (remainder < minRemainder) {
        minRemainder = remainder;
        bestFit = cols;
      }
    }

    frameWidth = Math.round(width / bestFit);
  }

  if (verticalDividers.length <= 1) {
    // 尝试更多行数：2 到 20
    const possibleRows = Array.from({ length: 19 }, (_, i) => i + 2);
    let bestFit = 1;
    let minRemainder = height;

    for (const rows of possibleRows) {
      if (height % rows === 0) {
        bestFit = rows;
        break;
      }

      const remainder = height % rows;
      if (remainder < minRemainder) {
        minRemainder = remainder;
        bestFit = rows;
      }
    }

    frameHeight = Math.round(height / bestFit);
  }

  // 5. 确保帧尺寸合理（不小于10像素）
  frameWidth = Math.max(10, frameWidth);
  frameHeight = Math.max(10, frameHeight);

  return { frameWidth, frameHeight };
}

/**
 * 辅助函数：寻找可能的分隔线
 */
function findDividers(distribution: number[], threshold: number): number[] {
  console.log("分隔线检测阈值:", threshold);
  const dividers: any[] = [];

  // 寻找非透明像素数量极少的位置
  for (let i = 0; i < distribution.length; i++) {
    if (distribution[i] < threshold) {
      dividers.push(i);
    }
  }
  console.log("找到的原始分隔线位置:", dividers);

  // 合并相近的分隔线，调整合并间距为帧尺寸的 5%，最小 5 像素
  const mergeThreshold = Math.max(5, distribution.length * 0.05);
  const mergedDividers: any[] = [];
  let currentGroup: number[] = [];

  for (const pos of dividers) {
    if (
      currentGroup.length === 0 ||
      pos - currentGroup[currentGroup.length - 1] < mergeThreshold
    ) {
      currentGroup.push(pos);
    } else {
      // 取组内中间位置作为分隔线
      mergedDividers.push(
        Math.round(
          currentGroup.reduce((sum, p) => sum + p, 0) / currentGroup.length
        )
      );
      currentGroup = [pos];
    }
  }

  if (currentGroup.length > 0) {
    mergedDividers.push(
      Math.round(
        currentGroup.reduce((sum, p) => sum + p, 0) / currentGroup.length
      )
    );
  }
  console.log("合并后的分隔线位置:", mergedDividers);
  return mergedDividers;
}

/**
 * 使用腐蚀膨胀算法检测边缘（只处理非透明区域）
 */
function detectEdgesByErosionDilation(
  imageData: ImageData,
  width: number,
  height: number,
  alphaThreshold: number = 128
): { x: number; y: number }[] {
  const { data } = imageData;
  const edges: { x: number; y: number }[] = [];

  // 创建二值图像（1表示非透明，0表示透明）
  const binary = new Uint8ClampedArray(width * height);

  // 填充二值图像并计算边界框
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const alpha = data[idx * 4 + 3];

      if (alpha >= alphaThreshold) {
        binary[idx] = 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // 扩展边界框以确保有足够空间进行腐蚀膨胀
  minX = Math.max(0, minX - 2);
  maxX = Math.min(width - 1, maxX + 2);
  minY = Math.max(0, minY - 2);
  maxY = Math.min(height - 1, maxY + 2);

  // 创建腐蚀和膨胀后的图像
  const eroded = new Uint8ClampedArray(width * height);
  const dilated = new Uint8ClampedArray(width * height);

  // 腐蚀操作（只在边界框内进行）
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;

      // 如果3x3邻域内所有像素都为1，则当前像素设为1
      let isEroded = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx < 0 ||
            nx >= width ||
            ny < 0 ||
            ny >= height ||
            binary[ny * width + nx] === 0
          ) {
            isEroded = false;
            break;
          }
        }
        if (!isEroded) break;
      }

      eroded[idx] = isEroded ? 1 : 0;
    }
  }

  // 膨胀操作（只在边界框内进行）
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;

      // 如果3x3邻域内有任何一个像素为1，则当前像素设为1
      let isDilated = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < width &&
            ny >= 0 &&
            ny < height &&
            binary[ny * width + nx] === 1
          ) {
            isDilated = true;
            break;
          }
        }
        if (isDilated) break;
      }

      dilated[idx] = isDilated ? 1 : 0;
    }
  }

  // 计算边缘（膨胀 - 腐蚀）
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (dilated[idx] === 1 && eroded[idx] === 0) {
        edges.push({ x, y });
      }
    }
  }

  return edges;
}

/**
 * 简化多边形顶点（减少顶点数量，提高性能）
 * 使用Ramer-Douglas-Peucker算法
 * @param vertices 顶点数组
 * @param tolerance 容差值，越大简化程度越高
 * @returns 简化后的顶点数组
 */
function simplifyVertices(
  vertices: { x: number; y: number }[],
  tolerance: number = 1
): { x: number; y: number }[] {
  if (vertices.length <= 3) return vertices; // 少于3个点无需简化

  return rdpSimplify(vertices, tolerance);
}

/**
 * Ramer-Douglas-Peucker算法实现
 * @param points 顶点数组
 * @param epsilon 容差值
 * @returns 简化后的顶点数组
 */
function rdpSimplify(
  points: { x: number; y: number }[],
  epsilon: number
): { x: number; y: number }[] {
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  // 寻找距离最大的点
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  // 如果最大距离大于阈值，则递归简化
  if (dmax > epsilon) {
    const recResults1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const recResults2 = rdpSimplify(points.slice(index), epsilon);

    return [...recResults1.slice(0, recResults1.length - 1), ...recResults2];
  } else {
    return [points[0], points[end]];
  }
}

/**
 * 计算点到线段的垂直距离
 * @param point 待计算的点
 * @param start 线段起点
 * @param end 线段终点
 * @returns 垂直距离
 */
function perpendicularDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const { x, y } = point;
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx: number, yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

interface SpriteSheetConfig {
  frameWidth: number;
  frameHeight: number;
  rows: number;
  cols: number;
  totalFrames: number;
}

export function calculateSpriteSheetFrames(
  wholeWidth: number,
  wholeHeight: number,
  frameWidthEstimate: number,
  frameHeightEstimate: number
): SpriteSheetConfig {
  // 参数校验
  if (
    wholeWidth <= 0 ||
    wholeHeight <= 0 ||
    frameWidthEstimate <= 0 ||
    frameHeightEstimate <= 0
  ) {
    throw new Error("所有输入参数必须为正数");
  }

  // 计算可能的列数范围（误差±20%）
  const minCols = Math.floor(wholeWidth / (frameWidthEstimate * 1.2));
  const maxCols = Math.ceil(wholeWidth / (frameWidthEstimate * 0.8));

  // 计算可能的行数范围
  const minRows = Math.floor(wholeHeight / (frameHeightEstimate * 1.2));
  const maxRows = Math.ceil(wholeHeight / (frameHeightEstimate * 0.8));

  // 存储所有可能的有效配置
  const validConfigs: SpriteSheetConfig[] = [];

  // 遍历所有可能的列数和行数组合
  for (let cols = minCols; cols <= maxCols; cols++) {
    if (cols === 0) continue; // 跳过无效列数

    for (let rows = minRows; rows <= maxRows; rows++) {
      if (rows === 0) continue; // 跳过无效行数

      // 计算当前组合下的帧尺寸
      const frameWidth = wholeWidth / cols;
      const frameHeight = wholeHeight / rows;

      // 检查帧尺寸是否在估计值的±20%误差范围内
      const widthInRange =
        frameWidth >= frameWidthEstimate * 0.8 &&
        frameWidth <= frameWidthEstimate * 1.2;
      const heightInRange =
        frameHeight >= frameHeightEstimate * 0.8 &&
        frameHeight <= frameHeightEstimate * 1.2;

      // 检查是否能整除（无余数）
      const exactFit =
        Number.isInteger(wholeWidth / cols) &&
        Number.isInteger(wholeHeight / rows);

      if (widthInRange && heightInRange && exactFit) {
        validConfigs.push({
          cols,
          rows,
          frameWidth,
          frameHeight,
          totalFrames: cols * rows,
        });
      }
    }
  }

  // 如果没有找到有效配置，抛出错误
  if (validConfigs.length === 0) {
    throw new Error("无法找到符合条件的帧配置，请检查输入参数或调整误差范围");
  }

  // 选择最接近估计值的配置（通过最小化误差平方和）
  const bestConfig = validConfigs.reduce((best, current) => {
    const currentError =
      Math.pow(
        (current.frameWidth - frameWidthEstimate) / frameWidthEstimate,
        2
      ) +
      Math.pow(
        (current.frameHeight - frameHeightEstimate) / frameHeightEstimate,
        2
      );

    const bestError =
      Math.pow((best.frameWidth - frameWidthEstimate) / frameWidthEstimate, 2) +
      Math.pow(
        (best.frameHeight - frameHeightEstimate) / frameHeightEstimate,
        2
      );

    return currentError < bestError ? current : best;
  }, validConfigs[0]);

  return bestConfig;
}

/**
 * 顶点类型定义
 */
type Vertex = {
  x: number;
  y: number;
};

export function simplifyVerticesV2(
  points: Vertex[],
  targetCount: number = 50
): Vertex[] {
  // 初始阈值
  let epsilon = 1;
  let simplified = [...points];

  // 调整阈值直到达到目标点数
  while (simplified.length > targetCount && epsilon < 100) {
    epsilon += 0.5;
    simplified = douglasPeucker(points, epsilon);
  }

  // 确保至少保留3个点（形成多边形）
  if (simplified.length < 3) {
    return [
      points[0],
      points[Math.floor(points.length / 2)],
      points[points.length - 1],
    ];
  }

  return simplified;
}

/**
 * 道格拉斯-普克算法：简化顶点数组
 * @param points 原始顶点数组
 * @param epsilon 简化阈值（值越大，简化程度越高）
 * @returns 简化后的顶点数组
 */
function douglasPeucker(points: Vertex[], epsilon: number): Vertex[] {
  if (points.length <= 2) {
    return points;
  }

  // 找到距离最大的点
  let dmax = 0;
  let index = 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  // 计算每个点到线段的距离
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToLineDistance(points[i], firstPoint, lastPoint);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  // 如果最大距离大于阈值，递归处理
  if (dmax > epsilon) {
    // 递归简化两部分
    const firstSegment = douglasPeucker(points.slice(0, index + 1), epsilon);
    const secondSegment = douglasPeucker(
      points.slice(index, points.length),
      epsilon
    );

    // 合并结果（去掉重复的中间点）
    return [...firstSegment.slice(0, -1), ...secondSegment];
  } else {
    // 否则只保留首尾点
    return [firstPoint, lastPoint];
  }
}

/**
 * 计算点到线段的垂直距离
 */
function pointToLineDistance(p: Vertex, p1: Vertex, p2: Vertex): number {
  const x = p.x;
  const y = p.y;
  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;

  // 线段长度的平方
  const lineLengthSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);

  // 处理线段长度为0的情况（两点重合）
  if (lineLengthSq === 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }

  // 计算点在线段上的投影位置
  const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lineLengthSq;
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);

  // 计算点到投影点的距离
  return Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
}
