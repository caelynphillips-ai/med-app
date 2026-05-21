import SwiftUI

struct MedicationDetailView: View {
    @EnvironmentObject private var appModel: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showingEdit = false
    var medication: Medication

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(medication.category.label.uppercased())
                            .font(.caption.bold())
                            .foregroundStyle(AppTheme.secondary)
                        Text(medication.name)
                            .font(.largeTitle.bold())
                    }
                    Spacer()
                    Text(medication.category.label)
                        .font(.caption.bold())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(AppTheme.accent.opacity(0.65))
                        .clipShape(Capsule())
                }

                DetailSection(title: "Purpose", value: medication.purpose)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    DetailTile(title: "Dosage", value: medication.dosage)
                    DetailTile(title: "Times per day", value: "\(medication.timesPerDay)")
                    DetailTile(title: "Instructions", value: medication.foodInstructions.isEmpty ? medication.intake.label : medication.foodInstructions)
                    DetailTile(title: "Reminder", value: medication.reminder.enabled ? "\(medication.reminder.leadMinutes) minutes before" : "Off")
                }

                DetailSection(title: "Schedule", value: medication.schedule.map { "\($0.label): \(DateHelpers.clockLabel($0.time))" }.joined(separator: "\n"))
                DetailSection(title: "Notes", value: medication.notes.isEmpty ? "No notes yet" : medication.notes)

                if let attachment = medication.attachment, let url = URL(string: attachment.url) {
                    Link("Open uploaded file", destination: url)
                        .font(.headline)
                } else {
                    Text("No label photo or instruction file uploaded yet.")
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Button("Edit") {
                        showingEdit = true
                    }
                    .buttonStyle(.borderedProminent)

                    Button("Delete", role: .destructive) {
                        Task {
                            await appModel.deleteMedication(medication)
                            dismiss()
                        }
                    }
                    .buttonStyle(.bordered)
                }
            }
            .padding(18)
        }
        .background(AppTheme.background)
        .navigationTitle("Details")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingEdit) {
            NavigationStack {
                MedicationFormView(medication: medication)
            }
        }
    }
}

struct DetailSection: View {
    var title: String
    var value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            Text(value)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct DetailTile: View {
    var title: String
    var value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(AppTheme.secondary)
            Text(value)
                .font(.headline)
        }
        .frame(maxWidth: .infinity, minHeight: 86, alignment: .leading)
        .padding(14)
        .background(AppTheme.pale)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
