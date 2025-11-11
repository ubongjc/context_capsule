import SwiftUI

struct CreateCapsuleView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var capsuleManager: CapsuleManager

    @State private var title = ""
    @State private var description = ""
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Capsule Details")) {
                    TextField("Title", text: $title)
                        .textContentType(.none)

                    TextField("Description (Optional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                        .textContentType(.none)
                }

                Section(header: Text("Quick Capture")) {
                    Button(action: captureCurrentState) {
                        Label("Capture Current State", systemImage: "camera.fill")
                    }

                    Text("This will capture your current device state as artifacts")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("New Capsule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        createCapsule()
                    }
                    .disabled(title.isEmpty || isCreating)
                }
            }
            .overlay {
                if isCreating {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()

                        ProgressView("Creating...")
                            .padding()
                            .background(Color(.systemBackground))
                            .cornerRadius(10)
                    }
                }
            }
        }
    }

    private func captureCurrentState() {
        // TODO: Implement actual state capture
        // For now, just generate sample artifacts
        let sampleNote = """
        Sample note captured at \(Date().formatted())
        This is a placeholder for actual content capture.
        """

        title = "Capsule \(Date().formatted(date: .abbreviated, time: .shortened))"
        description = "Auto-captured state"
    }

    private func createCapsule() {
        isCreating = true
        errorMessage = nil

        // Create sample artifacts (in a real app, these would come from actual captures)
        let artifacts: [CreateArtifactRequest] = [
            CreateArtifactRequest(
                kind: .note,
                title: "Sample Note",
                encryptedBlob: "This is sample content to be encrypted",
                metadata: ["timestamp": AnyCodable(Date().timeIntervalSince1970)],
                storageUrl: nil
            )
        ]

        Task {
            do {
                _ = try await capsuleManager.createCapsule(
                    title: title,
                    description: description.isEmpty ? nil : description,
                    artifacts: artifacts
                )

                await MainActor.run {
                    isCreating = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isCreating = false
                }
            }
        }
    }
}

#Preview {
    CreateCapsuleView()
        .environmentObject(CapsuleManager())
}
