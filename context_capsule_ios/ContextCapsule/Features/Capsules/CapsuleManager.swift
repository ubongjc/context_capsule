import Foundation
import Combine

class CapsuleManager: ObservableObject {
    @Published var capsules: [Capsule] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared
    private let encryptionManager = EncryptionManager.shared

    // MARK: - Fetch Capsules

    func fetchCapsules() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        do {
            let response = try await apiClient.getCapsules(limit: 50, offset: 0)

            await MainActor.run {
                self.capsules = response.capsules
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to fetch capsules: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }

    // MARK: - Create Capsule

    func createCapsule(
        title: String,
        description: String?,
        artifacts: [CreateArtifactRequest]
    ) async throws -> Capsule {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        do {
            // Encrypt artifact blobs before sending
            var encryptedArtifacts = artifacts
            for i in 0..<encryptedArtifacts.count {
                if let blob = encryptedArtifacts[i].encryptedBlob {
                    let encrypted = try encryptionManager.encryptArtifactBlob(blob)
                    encryptedArtifacts[i] = CreateArtifactRequest(
                        kind: encryptedArtifacts[i].kind,
                        title: encryptedArtifacts[i].title,
                        encryptedBlob: encrypted,
                        metadata: encryptedArtifacts[i].metadata,
                        storageUrl: encryptedArtifacts[i].storageUrl
                    )
                }
            }

            let request = CreateCapsuleRequest(
                title: title,
                description: description,
                snapshotMeta: [
                    "device": AnyCodable("iOS"),
                    "timestamp": AnyCodable(Date().timeIntervalSince1970)
                ],
                artifacts: encryptedArtifacts
            )

            let capsule = try await apiClient.createCapsule(request: request)

            await MainActor.run {
                self.capsules.insert(capsule, at: 0)
                self.isLoading = false
            }

            return capsule
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to create capsule: \(error.localizedDescription)"
                self.isLoading = false
            }
            throw error
        }
    }

    // MARK: - Delete Capsule

    func deleteCapsule(_ capsule: Capsule) async throws {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        do {
            _ = try await apiClient.deleteCapsule(id: capsule.id)

            await MainActor.run {
                self.capsules.removeAll { $0.id == capsule.id }
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to delete capsule: \(error.localizedDescription)"
                self.isLoading = false
            }
            throw error
        }
    }

    // MARK: - Restore Capsule

    func restoreCapsule(_ capsule: Capsule) async throws -> RestoreResponse {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        do {
            let response = try await apiClient.restoreCapsule(id: capsule.id)

            // Decrypt artifact blobs
            var decryptedArtifacts = response.artifacts
            for i in 0..<decryptedArtifacts.count {
                if let encryptedBlob = decryptedArtifacts[i].encryptedBlob {
                    let decrypted = try encryptionManager.decryptArtifactBlob(encryptedBlob)
                    decryptedArtifacts[i].encryptedBlob = decrypted
                }
            }

            await MainActor.run {
                self.isLoading = false
            }

            return RestoreResponse(
                capsule: response.capsule,
                artifacts: decryptedArtifacts
            )
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to restore capsule: \(error.localizedDescription)"
                self.isLoading = false
            }
            throw error
        }
    }
}
