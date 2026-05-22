import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Eos Backoffice — Proposal Generator',
  description: 'Standalone backoffice pra preview e gerac&atilde;o de propostas Eos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
