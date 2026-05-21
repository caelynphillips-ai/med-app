import PhotosUI
import SwiftUI

struct MedicationFormView: View {
    @EnvironmentObject private var appModel: AppViewModel
    @EnvironmentObject private var authService: AuthService
    @Environment(\.dismiss) private var dismiss

    @State private var medication: Medication
    @State private var nameQuery: String
    @State private var nameSuggestions: [MedicationSuggestion] = []
    @State private var dosageOptions: [String] = []
    @State private var useOptions: [String] = []
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedPhotoData: Data?

    private let defaultSlots = [
        MedicationScheduleSlot(id: "morning", label: "Morning", time: "08:00"),
        MedicationScheduleSlot(id: "lunch", label: "Lunch", time: "12:30"),
        MedicationScheduleSlot(id: "evening", label: "Evening", time: "18:00"),
        MedicationScheduleSlot(id: "bedtime", label: "Bedtime", time: "21:30")
    ]

    init(medication: Medication?) {
        let value = medication ?? Medication.empty()
        _medication = State(initialValue: value)
        _nameQuery = State(initialValue: value.name)
    }

    var body: some View {
        Form {
            Section {
                TextField("Name", text: $nameQuery)
                    .textContentType(.name)
                    .onChange(of: nameQuery) { value in
                        medication.name = value
                        nameSuggestions = appModel.suggestions.search(value)
                    }

                if !nameSuggestions.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(nameSuggestions) { suggestion in
                                Button(suggestion.name) {
                                    applySuggestion(suggestion)
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }

                TextField("Add a purpose or select common uses, e.g. blood pressure", text: $medication.purpose, axis: .vertical)

                if !selectedUses.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(selectedUses, id: \.self) { selectedUse in
                                Button {
                                    removeUse(selectedUse)
                                } label: {
                                    Label(selectedUse, systemImage: "xmark.circle.fill")
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }

                if !useOptions.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(useOptions, id: \.self) { use in
                                Button(use) {
                                    appendUse(use)
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }

                Picker("Category", selection: $medication.category) {
                    ForEach(MedicationCategory.allCases) { category in
                        Text(category.label).tag(category)
                    }
                }
            } header: {
                Text("Medication")
            }

            Section {
                TextField("eg. 10 mg Tab", text: $medication.dosage)

                if !dosageOptions.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(dosageOptions, id: \.self) { dosage in
                                Button(dosage) {
                                    medication.dosage = dosage
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }
            } header: {
                Text("Dosage")
            } footer: {
                Text("Dosage entries are for personal organization only. Confirm details with the prescription label, doctor, or pharmacist.")
            }

            Section("Schedule") {
                Stepper("Times per day: \(medication.timesPerDay)", value: $medication.timesPerDay, in: 1...12)

                ForEach(defaultSlots) { slot in
                    ScheduleSlotRow(
                        slot: slot,
                        isSelected: Binding(
                            get: { medication.schedule.contains(where: { $0.id == slot.id }) },
                            set: { isOn in
                                setSlot(slot, isOn: isOn)
                            }
                        ),
                        time: Binding(
                            get: { DateHelpers.date(from: medication.schedule.first(where: { $0.id == slot.id })?.time ?? slot.time) },
                            set: { date in
                                updateSlotTime(slot, time: DateHelpers.time(from: date))
                            }
                        )
                    )
                }
            }

            Section("How it should be taken") {
                Picker("How it should be taken", selection: $medication.intake) {
                    ForEach(IntakeInstruction.allCases) { intake in
                        Text(intake.label).tag(intake)
                    }
                }

                TextField("Add instructions, e.g. take with food, before bed, avoid alcohol", text: $medication.foodInstructions, axis: .vertical)
            }

            Section("Reminders") {
                Toggle("Show reminder-style cards in the app", isOn: $medication.reminder.enabled)
                Picker("Reminder lead time", selection: $medication.reminder.leadMinutes) {
                    ForEach([5, 10, 15, 30, 60], id: \.self) { minutes in
                        Text("\(minutes) minutes before").tag(minutes)
                    }
                }
            }

            Section("Notes") {
                TextField("Side effects, doctor instructions, refill info, or reminders", text: $medication.notes, axis: .vertical)
                    .lineLimit(4...8)
            }

            Section("Label photo") {
                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    Label(selectedPhotoData == nil ? "Choose photo" : "Photo selected", systemImage: "photo")
                }
                .onChange(of: selectedPhoto) { item in
                    Task {
                        selectedPhotoData = try? await item?.loadTransferable(type: Data.self)
                    }
                }

                if medication.attachment != nil {
                    Text("Existing attachment stays in place unless you choose a new photo.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                DisclaimerView()
                    .listRowInsets(EdgeInsets())
            }
        }
        .navigationTitle(medication.id == nil ? "Add medication" : "Edit medication")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task {
                        await save()
                    }
                }
                .disabled(!canSave)
            }
        }
        .onAppear {
            if let record = appModel.suggestions.findByName(medication.name) {
                dosageOptions = record.strengthsAndForms
                useOptions = record.commonUses
            }
        }
    }

    private var canSave: Bool {
        !medication.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            !medication.purpose.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            !medication.dosage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            !medication.schedule.isEmpty
    }

    private var selectedUses: [String] {
        medication.purpose
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private func applySuggestion(_ suggestion: MedicationSuggestion) {
        medication.name = suggestion.name
        medication.genericName = suggestion.genericName ?? suggestion.name
        medication.category = suggestion.normalizedCategory
        medication.foodInstructions = suggestion.foodInstructions
        dosageOptions = suggestion.strengthsAndForms
        useOptions = suggestion.commonUses

        if let firstUse = suggestion.commonUses.first, medication.purpose.isEmpty {
            medication.purpose = firstUse
        }

        nameQuery = suggestion.name
        nameSuggestions = []
    }

    private func appendUse(_ use: String) {
        let normalized = use.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else { return }

        let existing = selectedUses.map { $0.lowercased() }
        guard !existing.contains(normalized.lowercased()) else { return }
        medication.purpose = (selectedUses + [normalized]).joined(separator: ", ")
    }

    private func removeUse(_ use: String) {
        medication.purpose = selectedUses
            .filter { $0.lowercased() != use.lowercased() }
            .joined(separator: ", ")
    }

    private func setSlot(_ slot: MedicationScheduleSlot, isOn: Bool) {
        if isOn {
            if !medication.schedule.contains(where: { $0.id == slot.id }) {
                medication.schedule.append(slot)
            }
        } else {
            medication.schedule.removeAll { $0.id == slot.id }
        }
        medication.schedule.sort { DateHelpers.minutes(from: $0.time) < DateHelpers.minutes(from: $1.time) }
    }

    private func updateSlotTime(_ slot: MedicationScheduleSlot, time: String) {
        if let index = medication.schedule.firstIndex(where: { $0.id == slot.id }) {
            medication.schedule[index].time = time
        } else {
            var next = slot
            next.time = time
            medication.schedule.append(next)
        }
        medication.schedule.sort { DateHelpers.minutes(from: $0.time) < DateHelpers.minutes(from: $1.time) }
    }

    private func save() async {
        guard let userId = authService.user?.uid else { return }

        var next = medication
        next.ownerId = userId
        next.schemaVersion = 1
        next.timesPerDay = max(1, next.timesPerDay)

        await appModel.saveMedication(
            next,
            attachmentData: selectedPhotoData,
            attachmentFileName: selectedPhotoData == nil ? nil : "label-photo.jpg"
        )
        dismiss()
    }
}

struct ScheduleSlotRow: View {
    var slot: MedicationScheduleSlot
    @Binding var isSelected: Bool
    @Binding var time: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle(slot.label, isOn: $isSelected)
            if isSelected {
                DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
            }
        }
    }
}
