import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var appModel: AppViewModel
    @State private var showingForm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(Date.now.formatted(date: .complete, time: .omitted).uppercased())
                            .font(.caption.bold())
                            .foregroundStyle(AppTheme.secondary)
                        Text("Today's schedule")
                            .font(.largeTitle.bold())
                    }
                    Spacer()
                    Button {
                        showingForm = true
                    } label: {
                        Label("Add", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }

                HStack(spacing: 12) {
                    StatCard(title: "Total doses", value: "\(appModel.todayDoses().count)")
                    StatCard(title: "Marked taken", value: "\(appModel.todayDoses().filter { $0.status == "taken" }.count)")
                }

                let doses = appModel.todayDoses()
                if doses.isEmpty {
                    EmptyStateView(title: "No doses yet", message: "Add a medication to build today's schedule.")
                } else {
                    ForEach(doses) { dose in
                        TodayDoseCard(dose: dose)
                    }
                }

                DisclaimerView()
            }
            .padding(18)
        }
        .background(AppTheme.background)
        .sheet(isPresented: $showingForm) {
            NavigationStack {
                MedicationFormView(medication: nil)
            }
        }
    }
}

struct StatCard: View {
    var title: String
    var value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(AppTheme.secondary)
            Text(value)
                .font(.title.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct TodayDoseCard: View {
    @EnvironmentObject private var appModel: AppViewModel
    var dose: TodayDose

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(DateHelpers.clockLabel(dose.slot.time))
                        .font(.title3.bold())
                    Text(dose.slot.label)
                        .font(.callout)
                }
                Spacer()
                Text(dose.medication.category.label)
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(AppTheme.accent.opacity(0.65))
                    .clipShape(Capsule())
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(dose.medication.name)
                    .font(.headline)
                Text("\(dose.medication.dosage) - \(dose.medication.purpose)")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                Text(dose.medication.intake.label)
                    .font(.caption.bold())
            }

            HStack {
                ForEach(PersistedDoseStatus.allCases) { status in
                    Button(status.label) {
                        Task {
                            await appModel.markDose(dose, status: status)
                        }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }
            }

            NavigationLink("Open details") {
                MedicationDetailView(medication: dose.medication)
            }
            .font(.callout.bold())
            .foregroundStyle(AppTheme.text)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(16)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct EmptyStateView: View {
    var title: String
    var message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            Text(message)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(AppTheme.pale)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
