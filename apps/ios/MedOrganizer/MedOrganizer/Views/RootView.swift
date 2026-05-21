import SwiftUI

struct RootView: View {
    @EnvironmentObject private var authService: AuthService
    @EnvironmentObject private var appModel: AppViewModel

    var body: some View {
        Group {
            if let user = authService.user {
                AppShellView(userName: user.displayName ?? "Med Organizer")
                    .onAppear { appModel.bind(userId: user.uid) }
                    .onChange(of: user.uid) { uid in
                        appModel.bind(userId: uid)
                    }
            } else {
                SignInView()
                    .onAppear { appModel.bind(userId: nil) }
            }
        }
        .background(AppTheme.background.ignoresSafeArea())
    }
}

struct AppShellView: View {
    @EnvironmentObject private var authService: AuthService
    @EnvironmentObject private var appModel: AppViewModel
    var userName: String

    var body: some View {
        TabView {
            NavigationStack {
                TodayView()
                    .navigationTitle("Today")
            }
            .tabItem {
                Label("Today", systemImage: "checklist")
            }

            NavigationStack {
                MedicationListView()
                    .navigationTitle("Medications")
            }
            .tabItem {
                Label("Medications", systemImage: "pills")
            }

            NavigationStack {
                RemindersView()
                    .navigationTitle("Reminders")
            }
            .tabItem {
                Label("Reminders", systemImage: "bell")
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Sign out") {
                    authService.signOut()
                }
            }
        }
        .alert("Something needs attention", isPresented: errorBinding) {
            Button("OK") {
                appModel.appError = nil
                authService.authError = nil
            }
        } message: {
            Text(appModel.appError ?? authService.authError ?? "")
        }
    }

    private var errorBinding: Binding<Bool> {
        Binding(
            get: { appModel.appError != nil || authService.authError != nil },
            set: { isPresented in
                if !isPresented {
                    appModel.appError = nil
                    authService.authError = nil
                }
            }
        )
    }
}
