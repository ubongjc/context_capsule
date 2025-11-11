import Foundation

struct Capsule: Identifiable, Codable {
    let id: String
    let userId: String
    var title: String
    var description: String?
    var snapshotMeta: [String: AnyCodable]?
    let createdAt: Date
    let updatedAt: Date
    var artifacts: [Artifact]?

    enum CodingKeys: String, CodingKey {
        case id, userId, title, description, snapshotMeta, createdAt, updatedAt, artifacts
    }
}

struct Artifact: Identifiable, Codable {
    let id: String
    let capsuleId: String
    let kind: ArtifactKind
    var title: String?
    var encryptedBlob: String?
    var metadata: [String: AnyCodable]?
    var storageUrl: String?
    let createdAt: Date
    let updatedAt: Date
}

enum ArtifactKind: String, Codable {
    case tab = "TAB"
    case note = "NOTE"
    case file = "FILE"
    case selection = "SELECTION"
    case scrollPosition = "SCROLL_POSITION"
}

// Helper for encoding/decoding arbitrary JSON
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let value = try? container.decode(String.self) {
            self.value = value
        } else if let value = try? container.decode(Int.self) {
            self.value = value
        } else if let value = try? container.decode(Double.self) {
            self.value = value
        } else if let value = try? container.decode(Bool.self) {
            self.value = value
        } else if let value = try? container.decode([String: AnyCodable].self) {
            self.value = value.mapValues { $0.value }
        } else if let value = try? container.decode([AnyCodable].self) {
            self.value = value.map { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported type"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let value = value as? String {
            try container.encode(value)
        } else if let value = value as? Int {
            try container.encode(value)
        } else if let value = value as? Double {
            try container.encode(value)
        } else if let value = value as? Bool {
            try container.encode(value)
        } else if let value = value as? [String: Any] {
            let dict = value.mapValues { AnyCodable($0) }
            try container.encode(dict)
        } else if let value = value as? [Any] {
            let array = value.map { AnyCodable($0) }
            try container.encode(array)
        } else {
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(codingPath: [], debugDescription: "Unsupported type")
            )
        }
    }
}

struct CreateCapsuleRequest: Codable {
    let title: String
    let description: String?
    let snapshotMeta: [String: AnyCodable]?
    let artifacts: [CreateArtifactRequest]?
}

struct CreateArtifactRequest: Codable {
    let kind: ArtifactKind
    let title: String?
    let encryptedBlob: String?
    let metadata: [String: AnyCodable]?
    let storageUrl: String?
}

struct CapsuleListResponse: Codable {
    let capsules: [Capsule]
    let pagination: Pagination
}

struct Pagination: Codable {
    let total: Int
    let limit: Int
    let offset: Int
}
