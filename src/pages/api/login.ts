// src/pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { username, password } = req.body;

    // 这里可以添加你的验证逻辑，例如查询数据库等
    if (username === "admin" && password === "123456") {
      const token = "my_token";

      // 使用 cookie 库的 serialize 方法设置 cookie
      const serializedCookie = cookie.serialize("token", token, {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24, // 有效期 1 天
      });

      // 设置响应头
      res.setHeader("Set-Cookie", serializedCookie);
      res.status(200).json({ message: "登录成功" });
    } else {
      res.status(401).json({ message: "用户名或密码错误" });
    }
  } else {
    res.status(405).json({ message: "只支持 POST 请求" });
  }
}
