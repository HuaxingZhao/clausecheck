"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            出了点问题
          </h1>
          <p
            style={{
              color: "#555",
              marginBottom: "24px",
              maxWidth: "400px",
            }}
          >
            页面加载时遇到错误。请重试，如果问题持续存在请联系我们。
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 28px",
              fontSize: "1rem",
              fontWeight: 500,
              color: "#fff",
              background: "#2563eb",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
