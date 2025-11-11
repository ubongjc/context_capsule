import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthenticationManager

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Account")) {
                    if let user = authManager.currentUser {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(user.name ?? "User")
                                .font(.headline)
                            Text(user.email)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    Button(action: { authManager.signOut() }) {
                        HStack {
                            Text("Sign Out")
                            Spacer()
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                        }
                        .foregroundColor(.red)
                    }
                }

                Section(header: Text("Security")) {
                    NavigationLink(destination: Text("Security Settings")) {
                        Label("Security & Privacy", systemImage: "lock.shield")
                    }

                    NavigationLink(destination: Text("Passkeys")) {
                        Label("Manage Passkeys", systemImage: "key")
                    }
                }

                Section(header: Text("Data")) {
                    NavigationLink(destination: Text("Export Data")) {
                        Label("Export Data", systemImage: "square.and.arrow.up")
                    }

                    Button(action: {}) {
                        HStack {
                            Label("Delete All Data", systemImage: "trash")
                            Spacer()
                        }
                        .foregroundColor(.red)
                    }
                }

                Section(header: Text("About")) {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    Link(destination: URL(string: "https://contextcapsule.app")!) {
                        HStack {
                            Text("Website")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                        }
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthenticationManager())
}
