import Foundation
import CryptoKit

enum EncryptionError: Error {
    case encryptionFailed
    case decryptionFailed
    case keyGenerationFailed
    case invalidData
}

class EncryptionManager {
    static let shared = EncryptionManager()

    private init() {}

    // MARK: - Key Management

    /// Generate a new symmetric key for encryption
    func generateKey() -> SymmetricKey {
        return SymmetricKey(size: .bits256)
    }

    /// Store encryption key securely in Keychain
    func storeKey(_ key: SymmetricKey, identifier: String) throws {
        let keyData = key.withUnsafeBytes { Data($0) }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: identifier,
            kSecValueData as String: keyData,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        SecItemDelete(query as CFDictionary) // Delete existing
        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw EncryptionError.keyGenerationFailed
        }
    }

    /// Retrieve encryption key from Keychain
    func retrieveKey(identifier: String) throws -> SymmetricKey {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: identifier,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let keyData = result as? Data else {
            throw EncryptionError.keyGenerationFailed
        }

        return SymmetricKey(data: keyData)
    }

    /// Delete key from Keychain
    func deleteKey(identifier: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: identifier
        ]

        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Encryption/Decryption

    /// Encrypt data using AES-GCM
    func encrypt(data: Data, using key: SymmetricKey) throws -> Data {
        do {
            let sealedBox = try AES.GCM.seal(data, using: key)

            guard let combined = sealedBox.combined else {
                throw EncryptionError.encryptionFailed
            }

            return combined
        } catch {
            throw EncryptionError.encryptionFailed
        }
    }

    /// Encrypt string using AES-GCM
    func encrypt(string: String, using key: SymmetricKey) throws -> String {
        guard let data = string.data(using: .utf8) else {
            throw EncryptionError.invalidData
        }

        let encryptedData = try encrypt(data: data, using: key)
        return encryptedData.base64EncodedString()
    }

    /// Decrypt data using AES-GCM
    func decrypt(data: Data, using key: SymmetricKey) throws -> Data {
        do {
            let sealedBox = try AES.GCM.SealedBox(combined: data)
            let decryptedData = try AES.GCM.open(sealedBox, using: key)
            return decryptedData
        } catch {
            throw EncryptionError.decryptionFailed
        }
    }

    /// Decrypt string using AES-GCM
    func decrypt(string: String, using key: SymmetricKey) throws -> String {
        guard let data = Data(base64Encoded: string) else {
            throw EncryptionError.invalidData
        }

        let decryptedData = try decrypt(data: data, using: key)

        guard let decryptedString = String(data: decryptedData, encoding: .utf8) else {
            throw EncryptionError.decryptionFailed
        }

        return decryptedString
    }

    // MARK: - Convenience Methods

    /// Encrypt artifact blob for storage
    func encryptArtifactBlob(_ blob: String) throws -> String {
        // Get or create user's encryption key
        let keyIdentifier = "com.contextcapsule.userkey"

        let key: SymmetricKey
        do {
            key = try retrieveKey(identifier: keyIdentifier)
        } catch {
            // Generate new key if not found
            key = generateKey()
            try storeKey(key, identifier: keyIdentifier)
        }

        return try encrypt(string: blob, using: key)
    }

    /// Decrypt artifact blob from storage
    func decryptArtifactBlob(_ encryptedBlob: String) throws -> String {
        let keyIdentifier = "com.contextcapsule.userkey"
        let key = try retrieveKey(identifier: keyIdentifier)
        return try decrypt(string: encryptedBlob, using: key)
    }

    // MARK: - Hashing

    /// Generate SHA-256 hash of data
    func hash(data: Data) -> String {
        let digest = SHA256.hash(data: data)
        return digest.compactMap { String(format: "%02x", $0) }.joined()
    }

    /// Generate SHA-256 hash of string
    func hash(string: String) -> String {
        guard let data = string.data(using: .utf8) else {
            return ""
        }
        return hash(data: data)
    }
}
