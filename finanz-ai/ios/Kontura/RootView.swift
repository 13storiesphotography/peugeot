import SwiftUI

struct RootView: View {
  @State private var unlocked = false
  @State private var unlocking = false
  @State private var errorText: String?
  @Environment(\.scenePhase) private var scenePhase

  /// Production/staging URL — override in Info.plist `KonturaServerURL`
  private var serverURL: URL {
    if let raw = Bundle.main.object(forInfoDictionaryKey: "KonturaServerURL") as? String,
       let url = URL(string: raw), !raw.isEmpty {
      return url
    }
    return URL(string: "http://127.0.0.1:3001")!
  }

  var body: some View {
    ZStack {
      Color(red: 0.06, green: 0.15, blue: 0.23).ignoresSafeArea()

      if unlocked {
        WebContainer(url: serverURL)
          .ignoresSafeArea(edges: .bottom)
      } else {
        VStack(spacing: 24) {
          Text("Kontura")
            .font(.system(size: 42, weight: .bold, design: .rounded))
            .foregroundStyle(.white)

          Text("Finanzen im Klarblick — geschützt mit \(BiometricAuth.biometryLabel).")
            .multilineTextAlignment(.center)
            .foregroundStyle(.white.opacity(0.75))
            .padding(.horizontal, 32)

          Button {
            Task { await unlock() }
          } label: {
            Text(unlocking ? "Prüfe…" : "Mit \(BiometricAuth.biometryLabel) öffnen")
              .fontWeight(.semibold)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
              .background(Color(red: 0.06, green: 0.48, blue: 0.42))
              .foregroundStyle(.white)
              .clipShape(RoundedRectangle(cornerRadius: 10))
          }
          .disabled(unlocking)
          .padding(.horizontal, 40)

          if let errorText {
            Text(errorText)
              .font(.footnote)
              .foregroundStyle(.red.opacity(0.9))
          }
        }
      }
    }
    .task {
      await unlock()
    }
    .onChange(of: scenePhase) { _, phase in
      if phase == .background {
        unlocked = false
      }
    }
  }

  private func unlock() async {
    unlocking = true
    errorText = nil
    let ok = await BiometricAuth.unlock()
    unlocking = false
    if ok {
      unlocked = true
    } else {
      errorText = "Authentifizierung fehlgeschlagen."
    }
  }
}
