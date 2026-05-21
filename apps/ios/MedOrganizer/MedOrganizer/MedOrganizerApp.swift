import FirebaseCore
import GoogleSignIn
import SwiftUI

@main
struct MedOrganizerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var authService = AuthService()
    @StateObject private var appModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authService)
                .environmentObject(appModel)
                .tint(AppTheme.primary)
                .onAppear {
                    authService.start()
                }
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
