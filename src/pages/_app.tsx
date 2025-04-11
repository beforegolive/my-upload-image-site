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
    >
      <Component {...pageProps} />
    </SnackbarProvider>
  );
}
