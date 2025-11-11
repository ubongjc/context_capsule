import SwiftUI

@main
struct ContextCapsuleApp: App {
    @StateObject private var authManager = AuthenticationManager()
    @StateObject private var capsuleManager = CapsuleManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(capsuleManager)
        }
    }
}
