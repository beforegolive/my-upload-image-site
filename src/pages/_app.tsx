// // src/pages/_app.tsx
// import "@/styles/globals.css";
// import type { AppProps } from "next/app";
// import { SnackbarProvider } from "notistack";

// export default function App({ Component, pageProps }: AppProps) {
//   return (
//     <SnackbarProvider
//       maxSnack={3}
//       anchorOrigin={{
//         vertical: "top", // 垂直方向：顶部
//         horizontal: "center", // 水平方向：居中
//       }}
//       autoHideDuration={2000} // 设置默认显示时间为 50000 毫秒（即 50 秒）
//     >
//       <Component {...pageProps} />
//     </SnackbarProvider>
//   );
// }

import React from "react";
import { ConfigProvider } from "antd";
import type { AppProps } from "next/app";
import "@/styles/globals.css";
// import { SnackbarProvider } from "notistack";

// import theme from "./theme/themeConfig";

const App = ({ Component, pageProps }: AppProps) => (
  // <ConfigProvider theme={theme}>
  <ConfigProvider>
    {/* <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: "top", // 垂直方向：顶部
        horizontal: "center", // 水平方向：居中
      }}
      autoHideDuration={2000} // 设置默认显示时间为 50000 毫秒（即 50 秒）
    > */}
    <Component {...pageProps} />
    {/* </SnackbarProvider> */}
  </ConfigProvider>
);

export default App;
