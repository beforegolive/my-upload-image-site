// src/types.ts
export interface Image {
  url: string;
  size: number;
  Key: string;
  uploadTime: string;
  width: number; // 新增字段
  height: number; // 新增字段
  // 添加 mimeType 属性
  mimeType: string;
}
