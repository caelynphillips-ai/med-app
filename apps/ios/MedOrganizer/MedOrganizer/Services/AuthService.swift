import FirebaseAuth
import FirebaseCore
import GoogleSignIn
import UIKit

@MainActor
final class AuthService: ObservableObject {
    @Published private(set) var user: User?
    @Published var authError: String?

    private var handle: AuthStateDidChangeListenerHandle?

    func start() {
        guard handle == nil else { return }

        handle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                self?.user = user
            }
        }
    }

    func signIn(presenting controller: UIViewController) async {
        authError = nil

        do {
            guard let clientID = FirebaseApp.app()?.options.clientID else {
                throw AuthFlowError.missingClientId
            }

            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: controller)

            guard let idToken = result.user.idToken?.tokenString else {
                throw AuthFlowError.missingIdToken
            }

            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )
            _ = try await Auth.auth().signIn(with: credential)
        } catch {
            authError = error.localizedDescription
        }
    }

    func signOut() {
        do {
            GIDSignIn.sharedInstance.signOut()
            try Auth.auth().signOut()
        } catch {
            authError = error.localizedDescription
        }
    }
}

enum AuthFlowError: LocalizedError {
    case missingClientId
    case missingIdToken

    var errorDescription: String? {
        switch self {
        case .missingClientId:
            return "Missing Firebase client id. Add GoogleService-Info.plist to the iOS target."
        case .missingIdToken:
            return "Google sign-in did not return an ID token."
        }
    }
}

extension UIApplication {
    var activeRootViewController: UIViewController? {
        connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }?
            .rootViewController
    }
}
