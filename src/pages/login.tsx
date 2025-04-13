// src/pages/login.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

const LoginPage: React.FC = () => {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    // 阻止表单的默认提交行为
    event.preventDefault();

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 登录成功，设置 token 到 cookie
        const token = "your_generated_token";
        Cookies.set("token", token, { path: "/", expires: 1 });
        // 跳转到主页
        router.push("/");
      } else {
        // 登录失败，显示错误信息
        setError(data.message || "登录失败，请检查账号密码");
      }
    } catch (error) {
      console.error("登录出错:", error);
      setError("登录出错，请稍后重试");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-1/2 p-8 bg-white shadow-md rounded-md">
        <h2 className="text-2xl font-bold mb-4 text-center">登录</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              用户名
            </label>
            <input
              type="text"
              id="username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              密码
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {/* 在按钮上方显示错误信息 */}
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
