// src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SnackbarProvider } from "notistack";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: "top", // 垂直方向：顶部
        horizontal: "center", // 水平方向：居中
      }}
      autoHideDuration={50000} // 设置默认显示时间为 50000 毫秒（即 50 秒）
    >
      <Component {...pageProps} />
    </SnackbarProvider>
  );
}
