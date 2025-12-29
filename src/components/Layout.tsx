import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Layout as AntLayout, Menu } from 'antd'
import Cookies from 'js-cookie'

const { Header, Content, Footer } = AntLayout

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter()

  const handleLogout = () => {
    Cookies.remove('token')
    router.push('/login')
  }

  return (
    <AntLayout className="min-h-screen">
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div
          className="logo"
          style={{ marginRight: 24, color: 'white', fontSize: 18, fontWeight: 'bold', whiteSpace: 'nowrap' }}
        >
          文件上传站点
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[router.pathname]}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            {
              key: '/',
              label: <Link href="/">文件管理</Link>,
            },
            {
              key: '/image-analysis',
              label: <Link href="/image-analysis">图片分析</Link>,
            },
          ]}
        />
        <button
          onClick={handleLogout}
          style={{
            background: '#ff4d4f',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: 'pointer',
            marginLeft: 16,
            whiteSpace: 'nowrap',
            height: 40,
            lineHeight: '24px',
          }}
        >
          退出登录
        </button>
      </Header>
      <Content style={{ padding: '24px' }}>
        <div style={{ background: '#fff', padding: 24, minHeight: 280, borderRadius: 8 }}>
          {children}
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        文件上传站点 ©{new Date().getFullYear()} Created
      </Footer>
    </AntLayout>
  )
}

export default Layout
