import LocalAuthentication
import Foundation

enum BiometricAuth {
  static var biometryLabel: String {
    let context = LAContext()
    var error: NSError?
    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
      return "Gerätecode"
    }
    switch context.biometryType {
    case .faceID: return "Face ID"
    case .touchID: return "Touch ID"
    case .opticID: return "Optic ID"
    @unknown default: return "Biometrie"
    }
  }

  static func unlock(reason: String = "Kontura entsperren") async -> Bool {
    let context = LAContext()
    context.localizedCancelTitle = "Abbrechen"
    var error: NSError?

    // Prefer biometrics; fall back to device passcode.
    let policy: LAPolicy =
      context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
      ? .deviceOwnerAuthenticationWithBiometrics
      : .deviceOwnerAuthentication

    guard context.canEvaluatePolicy(policy, error: &error) else {
      return false
    }

    do {
      return try await context.evaluatePolicy(policy, localizedReason: reason)
    } catch {
      return false
    }
  }
}
