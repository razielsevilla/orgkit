import { FlowLoader } from "@/src/components/workspace/frame/flow-loader";

export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-base)",
      }}
    >
      <FlowLoader />
    </div>
  );
}

