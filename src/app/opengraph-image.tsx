import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Peugeot Control — Peugeot im Browser und auf dem Handy steuern";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(165deg, #08131d 0%, #0a1622 42%, #071018 100%)",
          color: "#eef6f8",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            }}
          />
          <div style={{ display: "flex" }}>Peugeot Control</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            <div style={{ display: "flex" }}>Dein Peugeot.</div>
            <div style={{ display: "flex", color: "#5fe3c0" }}>
              Klar gesteuert.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#8fa8b5",
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            Laden, Vorklima und Fernbedienung im Browser oder auf dem Handy —
            ohne ständiges Neuanmelden.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#8fa8b5",
          }}
        >
          <div style={{ display: "flex" }}>peugeotcontrol.app</div>
          <div style={{ display: "flex", color: "#5fe3c0" }}>
            Getestet am E-3008
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
