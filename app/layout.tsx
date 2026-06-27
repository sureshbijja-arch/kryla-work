import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/kryla-favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/kryla-favicon.svg" />
        <link rel="apple-touch-icon" href="/kryla-favicon.svg" />
        <title>Kryla.work — Your craft deserves a name online</title>
      </head>
      <body>{children}</body>
    </html>
  )
}
