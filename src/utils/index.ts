const defaultDomain = "beforegolive.com";
export function replaceDomain(
  url: string,
  targetDomain: string = defaultDomain
) {
  try {
    // 创建 URL 对象
    const parsedUrl = new URL(url);

    // 替换域名（包括端口号，如果有的话）
    const domainParts = targetDomain.split(":");
    parsedUrl.hostname = domainParts[0];

    // 如果目标域名包含端口号，则设置端口
    if (domainParts.length > 1) {
      parsedUrl.port = domainParts[1];
    } else {
      // 如果目标域名不包含端口，且原 URL 有默认端口以外的端口，需要清空
      if (parsedUrl.port) {
        // 检查原协议的默认端口
        const defaultPorts: any = {
          "http:": "80",
          "https:": "443",
          "ftp:": "21",
          "ws:": "80",
          "wss:": "443",
        };
        if (parsedUrl.port !== defaultPorts[parsedUrl.protocol]) {
          parsedUrl.port = "";
        }
      }
    }

    return parsedUrl.toString();
  } catch (error) {
    console.error("无效的 URL:", error);
    return url; // 出错时返回原 URL
  }
}

export const isEmpty = (val: any) => {
  if (val === null || val === undefined || val === "") {
    return true;
  }

  if (Array.isArray(val) && val.length === 0) {
    return true;
  }

  if (typeof val === "object" && Object.keys(val).length === 0) {
    return true;
  }

  return false;
};

// // 示例用法
// console.log(replaceDomain("https://example.com/path?query=1", "newdomain.com"));
// // 输出: https://newdomain.com/path?query=1

// console.log(
//   replaceDomain("http://user:pass@old.com:8080/page", "secure.com:443")
// );
// 输出: http://user:pass@secure.com:443/page

/**
 * 精灵图帧信息
 */
type SpriteFrameInfo = {
  frameSize: number; // 单个帧的尺寸（正方形边长）
  totalFrames: number; // 总帧数
  cols: number; // 列数
  rows: number; // 行数
};

/**
 * 计算精灵图的帧信息，支持两种优化策略：
 * 1. 当提供检测值时，寻找最接近检测尺寸的解
 * 2. 未提供检测值时，寻找总帧数最大的解
 * @param W - 图片总宽度（像素）
 * @param H - 图片总高度（像素）
 * @param maxFrames - 最大允许的帧数（默认30）
 * @param detectedWidth - 程序自动检测的帧宽度（可选）
 * @param detectedHeight - 程序自动检测的帧高度（可选）
 * @returns 返回最优解，包含帧尺寸、总帧数和行列数；若无解返回null
 */
export function calculateSpriteFrames(
  W: number,
  H: number,
  maxFrames: number = 30,
  detectedWidth?: number,
  detectedHeight?: number
): SpriteFrameInfo | null {
  // 计算最大公约数
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const GCD = gcd(W, H);

  // 获取所有约数（降序排列）
  const getDivisors = (num: number): number[] => {
    const divisors: number[] = [];
    for (let i = 1; i <= Math.sqrt(num); i++) {
      if (num % i === 0) {
        divisors.push(i);
        if (i !== num / i) divisors.push(num / i);
      }
    }
    return divisors.sort((a, b) => b - a); // 降序排列
  };
  const divisors = getDivisors(GCD);

  // 策略1：使用检测值，寻找最接近的解
  if (detectedWidth !== undefined && detectedHeight !== undefined) {
    const targetFrameSize = Math.round((detectedWidth + detectedHeight) / 2);
    let bestSolution: SpriteFrameInfo | null = null;
    let minDifference = Infinity;

    for (const S of divisors) {
      const n = W / S;
      const m = H / S;
      const F = n * m;
      const difference = Math.pow(S - targetFrameSize, 2);

      if (F <= maxFrames && difference < minDifference) {
        minDifference = difference;
        bestSolution = { frameSize: S, totalFrames: F, cols: n, rows: m };
      }
    }

    return bestSolution;
  }

  // 策略2：未提供检测值，寻找总帧数最大的解
  let bestSolution: SpriteFrameInfo | null = null;

  for (const S of divisors) {
    const n = W / S;
    const m = H / S;
    const F = n * m;

    if (F <= maxFrames && (!bestSolution || F > bestSolution.totalFrames)) {
      bestSolution = { frameSize: S, totalFrames: F, cols: n, rows: m };
    }
  }

  return bestSolution;
}

/**
 * 将图像轮廓顶点转换为 Phaser Matter 引擎可用的顶点格式
 * @param contour 图像轮廓顶点数组（相对于图像左上角）
 * @param imageWidth 图像宽度
 * @param imageHeight 图像高度
 * @param scale 缩放因子（可选，默认为 1）
 * @returns Matter 引擎可用的顶点数组（相对于物体中心）
 */
export function convertToMatterVertices(
  contour: Array<{ x: number; y: number }>,
  imageWidth: number,
  imageHeight: number,
  scale: number = 1
) {
  // 验证输入参数
  if (!contour || contour.length < 3) {
    throw new Error("轮廓顶点数量不足，至少需要3个点");
  }
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("图像尺寸必须为正数");
  }

  // 计算图像中心
  const centerX = imageWidth / 2;
  const centerY = imageHeight / 2;

  // 转换顶点坐标
  return contour.map((point) => ({
    x: (point.x - centerX) * scale,
    y: (point.y - centerY) * scale,
  }));
}
