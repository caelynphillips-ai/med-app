import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var authService: AuthService

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack(spacing: 14) {
                Text("M")
                    .font(.headline.bold())
                    .frame(width: 48, height: 48)
                    .background(AppTheme.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Med Organizer")
                        .font(.title2.bold())
                    Text("Medication and vitamin schedule")
                        .foregroundStyle(.secondary)
                }
            }

            VStack(alignment: .leading, spacing: 14) {
                Text("Use Google sign-in")
                    .font(.title2.bold())
                Text("Your organizer is saved in Firebase for your account. New accounts start with sample data so the dashboard is useful right away.")
                    .foregroundStyle(AppTheme.text)

                Button {
                    guard let controller = UIApplication.shared.activeRootViewController else { return }
                    Task {
                        await authService.signIn(presenting: controller)
                    }
                } label: {
                    Label("Continue with Google", systemImage: "person.crop.circle.badge.plus")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding(20)
            .background(AppTheme.pale)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            DisclaimerView()

            Spacer()
        }
        .padding(24)
        .background(AppTheme.background)
    }
}

struct DisclaimerView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Medical disclaimer")
                .font(.headline)
            Text("This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.")
                .font(.callout)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppTheme.card.opacity(0.35))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
