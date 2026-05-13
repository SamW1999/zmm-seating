import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'ZMM — Seating Chart',
  description: 'View and request seats at ZMM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: 14,
            },
            success: { iconTheme: { primary: '#3A8F3D', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
