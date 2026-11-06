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
        border: "1px solid var(--color-line)",
        backgroundColor: "var(--color-surface)",
        padding,
        boxShadow: "0 20px 50px color-mix(in srgb, var(--color-ink) 6%, transparent)",
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
        backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
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
        color: "var(--color-ink)",
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
        color: "var(--color-muted)",
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

