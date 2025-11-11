import Foundation
import AuthenticationServices
import Combine

class AuthenticationManager: NSObject, ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var authToken: String?

    private let userDefaults = UserDefaults.standard
    private let tokenKey = "auth_token"
    private let userKey = "current_user"

    override init() {
        super.init()
        loadStoredAuth()
    }

    // MARK: - Passkey Authentication

    func signInWithPasskey(completion: @escaping (Result<Void, Error>) -> Void) {
        let challenge = generateChallenge()

        let publicKeyCredentialProvider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: "contextcapsule.app"
        )

        let assertionRequest = publicKeyCredentialProvider.createCredentialAssertionRequest(
            challenge: challenge
        )

        let authController = ASAuthorizationController(authorizationRequests: [assertionRequest])
        authController.delegate = self
        authController.presentationContextProvider = self
        authController.performRequests()
    }

    func signUpWithPasskey(username: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let challenge = generateChallenge()

        let publicKeyCredentialProvider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: "contextcapsule.app"
        )

        let registrationRequest = publicKeyCredentialProvider.createCredentialRegistrationRequest(
            challenge: challenge,
            name: username,
            userID: Data(UUID().uuidString.utf8)
        )

        let authController = ASAuthorizationController(authorizationRequests: [registrationRequest])
        authController.delegate = self
        authController.presentationContextProvider = self
        authController.performRequests()
    }

    // MARK: - Traditional Authentication (Fallback)

    func signIn(email: String, password: String) async throws {
        // TODO: Implement email/password sign-in via backend
        // For now, this is a placeholder

        // Simulate API call
        try await Task.sleep(nanoseconds: 1_000_000_000)

        // Store auth token
        let mockToken = "mock_token_\(UUID().uuidString)"
        await MainActor.run {
            self.authToken = mockToken
            self.isAuthenticated = true
            self.saveAuth(token: mockToken)
            APIClient.shared.authToken = mockToken
        }
    }

    func signOut() {
        authToken = nil
        currentUser = nil
        isAuthenticated = false
        clearStoredAuth()
        APIClient.shared.authToken = nil
    }

    // MARK: - Storage

    private func saveAuth(token: String) {
        userDefaults.set(token, forKey: tokenKey)
    }

    private func loadStoredAuth() {
        if let token = userDefaults.string(forKey: tokenKey) {
            authToken = token
            isAuthenticated = true
            APIClient.shared.authToken = token
        }
    }

    private func clearStoredAuth() {
        userDefaults.removeObject(forKey: tokenKey)
        userDefaults.removeObject(forKey: userKey)
    }

    // MARK: - Utilities

    private func generateChallenge() -> Data {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes)
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AuthenticationManager: ASAuthorizationControllerDelegate {
    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        switch authorization.credential {
        case let credentialRegistration as ASAuthorizationPlatformPublicKeyCredentialRegistration:
            // Handle registration
            Task {
                await handleRegistration(credentialRegistration)
            }

        case let credentialAssertion as ASAuthorizationPlatformPublicKeyCredentialAssertion:
            // Handle assertion (sign-in)
            Task {
                await handleAssertion(credentialAssertion)
            }

        default:
            break
        }
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        print("Authorization failed: \(error.localizedDescription)")
    }

    private func handleRegistration(
        _ credential: ASAuthorizationPlatformPublicKeyCredentialRegistration
    ) async {
        // TODO: Send credential to backend for registration
        print("Registration successful")

        await MainActor.run {
            let mockToken = "passkey_token_\(UUID().uuidString)"
            self.authToken = mockToken
            self.isAuthenticated = true
            self.saveAuth(token: mockToken)
            APIClient.shared.authToken = mockToken
        }
    }

    private func handleAssertion(
        _ credential: ASAuthorizationPlatformPublicKeyCredentialAssertion
    ) async {
        // TODO: Send credential to backend for verification
        print("Sign-in successful")

        await MainActor.run {
            let mockToken = "passkey_token_\(UUID().uuidString)"
            self.authToken = mockToken
            self.isAuthenticated = true
            self.saveAuth(token: mockToken)
            APIClient.shared.authToken = mockToken
        }
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

extension AuthenticationManager: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Return the main window
        return ASPresentationAnchor()
    }
}

// MARK: - User Model

struct User: Codable {
    let id: String
    let email: String
    let name: String?
}
