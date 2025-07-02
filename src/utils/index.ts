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

// 示例用法
console.log(replaceDomain("https://example.com/path?query=1", "newdomain.com"));
// 输出: https://newdomain.com/path?query=1

console.log(
  replaceDomain("http://user:pass@old.com:8080/page", "secure.com:443")
);
// 输出: http://user:pass@secure.com:443/page
