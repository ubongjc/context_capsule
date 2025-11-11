import SwiftUI

struct CapsuleListView: View {
    @EnvironmentObject var capsuleManager: CapsuleManager
    @State private var showingCreateSheet = false

    var body: some View {
        NavigationView {
            ZStack {
                if capsuleManager.capsules.isEmpty && !capsuleManager.isLoading {
                    // Empty state
                    VStack(spacing: 16) {
                        Image(systemName: "brain.head.profile")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)

                        Text("No Capsules Yet")
                            .font(.title2)
                            .fontWeight(.semibold)

                        Text("Save your brain state by creating your first capsule")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)

                        Button(action: { showingCreateSheet = true }) {
                            Label("Create Capsule", systemImage: "plus.circle.fill")
                                .fontWeight(.semibold)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                        .padding(.top, 16)
                    }
                } else {
                    List {
                        ForEach(capsuleManager.capsules) { capsule in
                            NavigationLink(destination: CapsuleDetailView(capsule: capsule)) {
                                CapsuleRowView(capsule: capsule)
                            }
                        }
                        .onDelete(perform: deleteCapsules)
                    }
                    .refreshable {
                        await capsuleManager.fetchCapsules()
                    }
                }

                if capsuleManager.isLoading {
                    ProgressView()
                }
            }
            .navigationTitle("Capsules")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingCreateSheet = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateSheet) {
                CreateCapsuleView()
            }
            .task {
                if capsuleManager.capsules.isEmpty {
                    await capsuleManager.fetchCapsules()
                }
            }
        }
    }

    private func deleteCapsules(at offsets: IndexSet) {
        for index in offsets {
            let capsule = capsuleManager.capsules[index]
            Task {
                try? await capsuleManager.deleteCapsule(capsule)
            }
        }
    }
}

struct CapsuleRowView: View {
    let capsule: Capsule

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(capsule.title)
                .font(.headline)

            if let description = capsule.description, !description.isEmpty {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            HStack {
                if let artifacts = capsule.artifacts {
                    Label("\(artifacts.count) items", systemImage: "doc.on.doc")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text(capsule.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    CapsuleListView()
        .environmentObject(CapsuleManager())
}
