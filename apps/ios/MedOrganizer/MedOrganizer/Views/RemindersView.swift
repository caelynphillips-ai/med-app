import SwiftUI

struct RemindersView: View {
    @EnvironmentObject private var appModel: AppViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Reminder cards")
                    .font(.largeTitle.bold())

                Text("These are reminder-style cards inside the app. Phone notifications are not turned on yet.")
                    .foregroundStyle(.secondary)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.pale)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                let reminders = appModel.todayDoses().filter { $0.medication.reminder.enabled }
                if reminders.isEmpty {
                    EmptyStateView(title: "No reminder cards yet", message: "Turn on reminders while adding or editing a medication.")
                } else {
                    ForEach(reminders) { dose in
                        ReminderCard(dose: dose)
                    }
                }
            }
            .padding(18)
        }
        .background(AppTheme.background)
    }
}

struct ReminderCard: View {
    var dose: TodayDose

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(DateHelpers.clockLabel(dose.slot.time)) dose")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.secondary)
            Text(dose.medication.name)
                .font(.headline)
            Text("\(dose.medication.reminder.leadMinutes) minutes before")
                .font(.callout)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
