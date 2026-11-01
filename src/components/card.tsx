import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: number | string;
  padding?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({
  maxWidth = 440,
  padding = "40px 36px",
  children,
  style,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`orgkit-card ${className}`}
      style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth,
        borderRadius: 26,
        border: "1px solid #E4E4E7",
        backgroundColor: "#FFFFFF",
        padding,
        boxShadow: "0 20px 50px rgba(24, 24, 27, 0.06)",
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  style,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={className}
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 26,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBadge({
  children,
  size = 66,
  style,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: number }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "rgba(5, 150, 105, 0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  style,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={className}
      style={{
        fontSize: 27,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: "#18181B",
        margin: "0 0 6px 0",
        lineHeight: 1.18,
        ...style,
      }}
      {...props}
    >
      {children}
    </h1>
  );
}

export function CardDescription({
  children,
  style,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={className}
      style={{
        fontSize: 14.5,
        fontWeight: 400,
        color: "#71717A",
        margin: 0,
        lineHeight: 1.45,
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  style,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

