"use client";

import Link from "next/link";
import { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
    fontFamily: "system-ui, sans-serif",
  },
  container: {
    display: "flex",
    width: "100%",
    height: "100svh",
    backgroundColor: "black",
    flexFlow: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    gap: 24,
  },
  innerContainer: {
    display: "flex",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  header: {
    fontSize: 30,
    textAlign: "start",
  },
  button: {
    all: "unset",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    whiteSpace: "nowrap",
    transition: "all",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "normal",
    height: 36,
    paddingInline: 16,
    paddingBlock: 2,
    cursor: "pointer",
    border: "1px solid white",
  },
};

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={styles.body}>
        <div style={styles["container"]}>
          <h2 style={styles["header"]}>Critical Error</h2>

          <div style={styles["innerContainer"]}>
            <button
              style={{
                ...styles["button"],
                backgroundColor: "white",
                color: "black",
              }}
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
              }
            >
              Try Again
            </button>
            <Link replace href="/" style={styles["button"]}>
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
