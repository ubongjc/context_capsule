import Foundation

enum APIError: Error {
    case invalidURL
    case unauthorized
    case notFound
    case serverError(String)
    case decodingError
    case networkError(Error)
    case unknown
}

class APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession

    private init() {
        // TODO: Read from configuration
        self.baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:3000"
        self.session = URLSession.shared
    }

    var authToken: String?

    // MARK: - Generic Request

    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        headers: [String: String]? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add custom headers
        headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }

        if let body = body {
            request.httpBody = body
        }

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }

            switch httpResponse.statusCode {
            case 200...299:
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(T.self, from: data)
            case 401:
                throw APIError.unauthorized
            case 404:
                throw APIError.notFound
            case 400...599:
                if let errorMessage = String(data: data, encoding: .utf8) {
                    throw APIError.serverError(errorMessage)
                }
                throw APIError.unknown
            default:
                throw APIError.unknown
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Health

    func checkHealth() async throws -> HealthResponse {
        return try await request(endpoint: "/api/health")
    }

    // MARK: - Capsules

    func createCapsule(request: CreateCapsuleRequest) async throws -> Capsule {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let body = try encoder.encode(request)

        return try await self.request(
            endpoint: "/api/capsule",
            method: "POST",
            body: body
        )
    }

    func getCapsules(limit: Int = 10, offset: Int = 0) async throws -> CapsuleListResponse {
        return try await request(endpoint: "/api/capsule?limit=\(limit)&offset=\(offset)")
    }

    func getCapsule(id: String) async throws -> Capsule {
        return try await request(endpoint: "/api/capsule/\(id)")
    }

    func deleteCapsule(id: String) async throws -> SuccessResponse {
        return try await request(
            endpoint: "/api/capsule/\(id)",
            method: "DELETE"
        )
    }

    func restoreCapsule(id: String) async throws -> RestoreResponse {
        return try await request(
            endpoint: "/api/restore/\(id)",
            method: "POST"
        )
    }

    // MARK: - Upload

    func getUploadURL(fileName: String, contentType: String) async throws -> UploadURLResponse {
        let requestBody = [
            "fileName": fileName,
            "contentType": contentType
        ]
        let body = try JSONSerialization.data(withJSONObject: requestBody)

        return try await request(
            endpoint: "/api/upload",
            method: "POST",
            body: body
        )
    }
}

// MARK: - Response Models

struct HealthResponse: Codable {
    let status: String
    let timestamp: String
    let services: [String: String]
}

struct SuccessResponse: Codable {
    let success: Bool
}

struct RestoreResponse: Codable {
    let capsule: CapsuleMetadata
    let artifacts: [Artifact]
}

struct CapsuleMetadata: Codable {
    let id: String
    let title: String
    let description: String?
    let snapshotMeta: [String: AnyCodable]?
}

struct UploadURLResponse: Codable {
    let uploadUrl: String
    let storageKey: String
    let expiresIn: Int
}
