import SwiftUI

struct CapsuleDetailView: View {
    let capsule: Capsule
    @EnvironmentObject var capsuleManager: CapsuleManager
    @State private var isRestoring = false
    @State private var showingRestoreAlert = false
    @State private var restoredData: RestoreResponse?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(capsule.title)
                        .font(.title)
                        .fontWeight(.bold)

                    if let description = capsule.description {
                        Text(description)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Label(
                            capsule.createdAt.formatted(date: .abbreviated, time: .shortened),
                            systemImage: "clock"
                        )
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                }
                .padding()

                Divider()

                // Artifacts
                VStack(alignment: .leading, spacing: 12) {
                    Text("Artifacts")
                        .font(.headline)
                        .padding(.horizontal)

                    if let artifacts = capsule.artifacts, !artifacts.isEmpty {
                        ForEach(artifacts) { artifact in
                            ArtifactRowView(artifact: artifact)
                                .padding(.horizontal)
                        }
                    } else {
                        Text("No artifacts")
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                    }
                }

                Divider()

                // Actions
                VStack(spacing: 12) {
                    Button(action: { restoreCapsule() }) {
                        HStack {
                            Image(systemName: "arrow.clockwise.circle.fill")
                            Text("Restore Capsule")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isRestoring)

                    if isRestoring {
                        ProgressView()
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .alert("Capsule Restored", isPresented: $showingRestoreAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            if let data = restoredData {
                Text("Successfully restored \(data.artifacts.count) artifacts")
            }
        }
    }

    private func restoreCapsule() {
        isRestoring = true

        Task {
            do {
                let response = try await capsuleManager.restoreCapsule(capsule)
                await MainActor.run {
                    restoredData = response
                    showingRestoreAlert = true
                    isRestoring = false
                }
            } catch {
                await MainActor.run {
                    isRestoring = false
                }
            }
        }
    }
}

struct ArtifactRowView: View {
    let artifact: Artifact

    var body: some View {
        HStack {
            Image(systemName: iconForArtifactKind(artifact.kind))
                .foregroundColor(.blue)
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text(artifact.title ?? artifact.kind.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if artifact.encryptedBlob != nil {
                    Text("Encrypted")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }

    private func iconForArtifactKind(_ kind: ArtifactKind) -> String {
        switch kind {
        case .tab:
            return "safari"
        case .note:
            return "note.text"
        case .file:
            return "doc"
        case .selection:
            return "selection.pin.in.out"
        case .scrollPosition:
            return "arrow.up.arrow.down"
        }
    }
}

#Preview {
    NavigationView {
        CapsuleDetailView(
            capsule: Capsule(
                id: "1",
                userId: "1",
                title: "Work Session",
                description: "Important project work",
                snapshotMeta: nil,
                createdAt: Date(),
                updatedAt: Date(),
                artifacts: []
            )
        )
        .environmentObject(CapsuleManager())
    }
}
