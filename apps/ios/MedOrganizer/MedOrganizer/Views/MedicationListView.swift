import SwiftUI

struct MedicationListView: View {
    @EnvironmentObject private var appModel: AppViewModel
    @State private var showingForm = false

    var body: some View {
        List {
            if appModel.medications.isEmpty {
                EmptyStateView(title: "No medications yet", message: "Add your first medication, vitamin, or supplement.")
                    .listRowBackground(Color.clear)
            } else {
                ForEach(appModel.medications) { medication in
                    NavigationLink {
                        MedicationDetailView(medication: medication)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(medication.name)
                                .font(.headline)
                            Text("\(medication.dosage) - \(medication.purpose)")
                                .font(.callout)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(AppTheme.background)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingForm = true
                } label: {
                    Label("Add medication", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $showingForm) {
            NavigationStack {
                MedicationFormView(medication: nil)
            }
        }
    }
}
