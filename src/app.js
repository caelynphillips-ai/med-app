import {
  fetchRxTermsSuggestions,
  mergeMedicationEntries,
  normalizeCategory,
} from "./rxterms.js";
import { categories, CLIENT_NAME, intakeLabels, MEDICATION_SCHEMA_VERSION, slotDefinitions } from "./config/constants.js";
import { sampleMedications } from "./data/sampleMedications.js";
import { observeAuthState, signInWithGoogle, signOutUser } from "./services/authService.js";
import {
  getDoseStatusHistoryRecords,
  subscribeToDoseStatusRecord,
  saveDoseStatusRecord,
} from "./services/doseStatusRepository.js";
import {
  clearMedicationAttachment,
  deleteMedicationRecord,
  saveMedicationRecord,
  subscribeToMedicationRecords,
  updateMedicationAttachment,
} from "./services/medicationRepository.js";
import { ensureSampleData } from "./services/sampleDataService.js";
import { findMedicationRecordByName as findMedicationRecordInSources, getMedicationSuggestions as searchMedicationSuggestions, loadMedicationDatabase as fetchMedicationDatabase } from "./services/suggestionService.js";
import { deleteAttachmentPath, uploadMedicationAttachment } from "./services/storageService.js";
import { commonUseLabel, commonUseValue, parseCommonUses } from "./utils/commonUses.js";
import { currentMinutes, formatClock, formatMinutes, fullDateLabel, minutesFromTime, todayKey } from "./utils/dateTime.js";
import { messageFromError } from "./utils/errors.js";
import { intakeFromFoodInstructions } from "./utils/medicationFields.js";
import {
  getRefillInfo,
  refillQuantityLabel,
  refillStatusLabel,
  refillThresholdLabel,
  normalizeRefillNumber,
} from "../shared/refill.js";
import {
  defaultMedicationListControls,
  filterAndSortMedications,
  hasActiveMedicationListControls,
  medicationCategoryFilterOptions,
  medicationSortOptions,
  medicationUtilityFilterOptions,
} from "../shared/medicationList.js";
import {
  buildAdherenceSummary,
  formatHistoryDateLabel,
  getRecentDateKeys,
} from "../shared/adherence.js";
import {
  buildMedicationDataExport,
  buildMedicationExportJson,
  buildMedicationListTextExport,
  exportFileName,
} from "../shared/dataExport.js";
import { doseKey, normalizedSchedule, scheduleMapForForm, statusLabel } from "./utils/schedule.js";
import { cleanText, escapeAttribute, escapeHtml, initialsForUser, normalizeSearch, titleCase } from "./utils/text.js";
const root = document.querySelector("#app");
const liveRxTermsCache = new Map();
let liveRxTermsTimer = null;
let liveRxTermsRequestId = 0;

const state = {
  user: null,
  booting: true,
  loadingMeds: false,
  busy: false,
  isOnline: navigator.onLine,
  view: localStorage.getItem("medOrganizerView") || "dashboard",
  selectedMedId: null,
  editMode: false,
  meds: [],
  statuses: {},
  historyStatuses: {},
  historyLoading: false,
  historyLoaded: false,
  toast: null,
  toastType: "info",
  unsubscribeMeds: null,
  unsubscribeStatus: null,
  authReadyToken: 0,
  medicationDatabase: [],
  formSuggestions: [],
  activeSuggestionIndex: -1,
  liveSuggestions: [],
  liveSuggestionStatus: "idle",
  medicationListControls: defaultMedicationListControls(),
};

void loadMedicationDatabase();

observeAuthState(async (user) => {
  state.authReadyToken += 1;
  const token = state.authReadyToken;
  cleanupSubscriptions();
  state.user = user;
  state.booting = false;
  state.loadingMeds = Boolean(user);
  state.meds = [];
  state.statuses = {};
  state.historyStatuses = {};
  state.historyLoading = false;
  state.historyLoaded = false;
  state.selectedMedId = null;
  state.editMode = false;
  render();

  if (!user) {
    return;
  }

  try {
    await ensureSampleData(user);
  } catch (error) {
    showToast(messageFromError(error), "error");
  }

  if (token !== state.authReadyToken) {
    return;
  }

  subscribeToMedications(user.uid);
  subscribeToDoseStatus(user.uid);
  if (state.view === "history") {
    void loadDoseHistory();
  }
});

window.addEventListener("beforeunload", cleanupSubscriptions);
window.addEventListener("online", () => {
  state.isOnline = true;
  showToast("Connection restored.");
});
window.addEventListener("offline", () => {
  state.isOnline = false;
  showToast("You appear to be offline. Saved information will stay visible when available, but changes may not save until you reconnect.", "error");
});

root.addEventListener("click", async (event) => {
  const control = event.target.closest("[data-action]");
  if (!control) {
    return;
  }

  const { action } = control.dataset;

  if (action === "sign-in") {
    await handleSignIn();
  }

  if (action === "sign-out") {
    await handleSignOut();
  }

  if (action === "navigate") {
    setView(control.dataset.view);
  }

  if (action === "add-medication") {
    state.selectedMedId = null;
    state.editMode = true;
    setView("add");
  }

  if (action === "view-medication") {
    state.selectedMedId = control.dataset.id;
    state.editMode = false;
    setView("detail");
  }

  if (action === "edit-medication") {
    state.selectedMedId = control.dataset.id;
    state.editMode = true;
    setView("detail");
  }

  if (action === "cancel-form") {
    if (state.selectedMedId) {
      state.editMode = false;
      setView("detail");
    } else {
      setView("medications");
    }
  }

  if (action === "mark-dose") {
    await markDose(control.dataset.key, control.dataset.status);
  }

  if (action === "delete-medication") {
    await deleteMedication(control.dataset.id);
  }

  if (action === "remove-attachment") {
    await removeAttachment(control.dataset.id);
  }

  if (action === "select-medication-suggestion") {
    selectMedicationSuggestion(control.dataset.medication);
  }

  if (action === "apply-dosage") {
    applySmartValue("dosage", control.dataset.value);
  }

  if (action === "apply-use") {
    applyCommonUseValue(control.dataset.value);
  }

  if (action === "remove-use") {
    removeCommonUseValue(control.dataset.value);
  }

  if (action === "clear-medication-list-filters") {
    resetMedicationListControls();
  }

  if (action === "export-data-json") {
    await exportAccountData("json");
  }

  if (action === "export-medication-text") {
    await exportAccountData("text");
  }
});

root.addEventListener("input", (event) => {
  if (event.target.matches("#name")) {
    updateMedicationSuggestions(event.target.value, { nameChanged: true });
  }

  if (event.target.matches("#purpose")) {
    updateSelectedUseChips();
  }

  if (event.target.matches("#med-list-search")) {
    state.medicationListControls.query = event.target.value;
    updateMedicationListResults();
  }
});

root.addEventListener("change", (event) => {
  const control = event.target.closest("[data-med-list-control]");
  if (!control) {
    return;
  }

  state.medicationListControls[control.dataset.medListControl] = control.value;
  updateMedicationListResults();
});

root.addEventListener("focusin", (event) => {
  if (event.target.matches("#name")) {
    updateMedicationSuggestions(event.target.value);
  }
});

root.addEventListener("keydown", (event) => {
  if (!event.target.matches("#name")) {
    return;
  }

  handleAutocompleteKeys(event);
});

root.addEventListener("submit", async (event) => {
  const form = event.target.closest("#medication-form");
  if (!form) {
    return;
  }
  event.preventDefault();
  await saveMedication(form);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".autocomplete-field")) {
    closeMedicationSuggestions();
  }
});

async function loadMedicationDatabase() {
  try {
    state.medicationDatabase = await fetchMedicationDatabase();
    hydrateSmartFillForCurrentForm();
  } catch (error) {
    console.warn(error);
    state.medicationDatabase = [];
  }
}

function cleanupSubscriptions() {
  if (state.unsubscribeMeds) {
    state.unsubscribeMeds();
    state.unsubscribeMeds = null;
  }

  if (state.unsubscribeStatus) {
    state.unsubscribeStatus();
    state.unsubscribeStatus = null;
  }
}

function subscribeToMedications(uid) {
  state.unsubscribeMeds = subscribeToMedicationRecords(
    uid,
    (medications) => {
      state.meds = medications;
      state.loadingMeds = false;
      render();
    },
    (error) => {
      state.loadingMeds = false;
      showToast(messageFromError(error), "error");
      render();
    },
  );
}

function subscribeToDoseStatus(uid) {
  state.unsubscribeStatus = subscribeToDoseStatusRecord(
    uid,
    todayKey(),
    (statuses) => {
      state.statuses = statuses;
      state.historyStatuses = {
        ...state.historyStatuses,
        [todayKey()]: statuses,
      };
      render();
    },
    (error) => {
      showToast(messageFromError(error), "error");
    },
  );
}

async function handleSignIn() {
  setBusy(true);
  try {
    await signInWithGoogle();
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function handleSignOut() {
  setBusy(true);
  try {
    await signOutUser();
    setView("dashboard");
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function saveMedication(form) {
  if (!state.user) {
    showToast("Please sign in before saving medications.", "error");
    return;
  }

  const formData = new FormData(form);
  const selectedSchedule = slotDefinitions
    .filter((slot) => formData.get(`slot-${slot.id}`) === "on")
    .map((slot) => ({
      id: slot.id,
      label: slot.label,
      time: formData.get(`time-${slot.id}`) || slot.time,
    }))
    .sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time));

  if (selectedSchedule.length === 0) {
    showToast("Choose at least one time of day.", "error");
    return;
  }

  const timesPerDay = Number(formData.get("timesPerDay")) || selectedSchedule.length;
  const quantityRemaining = normalizeRefillNumber(formData.get("quantityRemaining"));
  const refillThreshold = normalizeRefillNumber(formData.get("refillThreshold"));
  const payload = {
    schemaVersion: MEDICATION_SCHEMA_VERSION,
    name: cleanText(formData.get("name")),
    genericName: cleanText(formData.get("genericName")),
    category: formData.get("category"),
    purpose: cleanText(formData.get("purpose")),
    dosage: cleanText(formData.get("dosage")),
    timesPerDay,
    schedule: selectedSchedule,
    intake: formData.get("intake"),
    foodInstructions: cleanText(formData.get("foodInstructions")),
    notes: cleanText(formData.get("notes")),
    quantityRemaining,
    refillThreshold,
    refillReminderEnabled: formData.get("refillReminderEnabled") === "on",
    lastRefillDate: cleanText(formData.get("lastRefillDate")),
    reminder: {
      enabled: formData.get("reminderEnabled") === "on",
      leadMinutes: Number(formData.get("leadMinutes")) || 15,
    },
    ownerId: state.user.uid,
    updatedBy: state.user.uid,
    updatedFrom: CLIENT_NAME,
  };

  if (!payload.name || !payload.purpose || !payload.dosage) {
    showToast("Name, purpose, and dosage are required.", "error");
    return;
  }

  if (payload.refillReminderEnabled && (quantityRemaining === null || refillThreshold === null)) {
    showToast("Add quantity remaining and a low supply threshold to turn on refill reminders.", "error");
    return;
  }

  setBusy(true);
  try {
    let medId = state.selectedMedId;
    const saved = await saveMedicationRecord(state.user.uid, medId, payload);
    medId = saved.medId;

    const file = form.querySelector('input[name="attachment"]').files[0];
    if (file) {
      const attachment = await uploadAttachment(medId, file);
      await updateMedicationAttachment(state.user.uid, medId, attachment, {
        updatedBy: state.user.uid,
        updatedFrom: CLIENT_NAME,
      });
    }

    state.selectedMedId = medId;
    state.editMode = false;
    setView("detail");
    showToast("Medication saved.");
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function uploadAttachment(medId, file) {
  return uploadMedicationAttachment(state.user.uid, medId, file);
}

async function removeAttachment(medId) {
  const med = getMedication(medId);
  if (!state.user || !med?.attachment?.path) {
    return;
  }

  setBusy(true);
  let attachmentDeleteFailed = false;
  try {
    await deleteAttachmentPath(med.attachment.path).catch((error) => {
      attachmentDeleteFailed = true;
      console.warn("Attachment file delete failed.", error);
    });
    await clearMedicationAttachment(state.user.uid, medId);
    showToast(
      attachmentDeleteFailed
        ? "Attachment was removed from the medication. The stored file could not be deleted right now."
        : "Attachment removed.",
      attachmentDeleteFailed ? "error" : "info",
    );
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function deleteMedication(medId) {
  const med = getMedication(medId);
  if (!state.user || !med) {
    return;
  }

  const confirmed = window.confirm(`Delete ${med.name}? This removes the medication from your organizer.`);
  if (!confirmed) {
    return;
  }

  setBusy(true);
  let attachmentDeleteFailed = false;
  try {
    if (med.attachment?.path) {
      await deleteAttachmentPath(med.attachment.path).catch((error) => {
        attachmentDeleteFailed = true;
        console.warn("Attachment file delete failed before medication delete.", error);
      });
    }
    await deleteMedicationRecord(state.user.uid, medId);
    state.selectedMedId = null;
    state.editMode = false;
    setView("medications");
    showToast(
      attachmentDeleteFailed
        ? "Medication deleted. Its stored attachment could not be deleted right now."
        : "Medication deleted.",
      attachmentDeleteFailed ? "error" : "info",
    );
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function markDose(doseKey, status) {
  if (!state.user) {
    showToast("Please sign in before updating your schedule.", "error");
    return;
  }

  setBusy(true);
  try {
    await saveDoseStatusRecord(state.user.uid, todayKey(), doseKey, status, CLIENT_NAME);
    state.historyStatuses = {
      ...state.historyStatuses,
      [todayKey()]: {
        ...(state.historyStatuses[todayKey()] || state.statuses),
        [doseKey]: {
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: state.user.uid,
          updatedFrom: CLIENT_NAME,
        },
      },
    };
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function exportAccountData(format) {
  if (!state.user) {
    showToast("Please sign in before exporting data.", "error");
    return;
  }

  setBusy(true);
  try {
    const generatedAt = new Date().toISOString();
    const dateKeys = getRecentDateKeys(7);
    const records = await getDoseStatusHistoryRecords(state.user.uid, dateKeys);
    const todayStatuses = Object.keys(state.statuses).length ? state.statuses : records[todayKey()] || {};
    const history = {
      ...records,
      [todayKey()]: todayStatuses,
    };
    state.historyStatuses = history;

    if (format === "text") {
      downloadTextFile(
        exportFileName("med-organizer-medication-list", "txt"),
        buildMedicationListTextExport({ generatedAt, medications: state.meds }),
        "text/plain",
      );
      showToast("Medication list export downloaded.");
      return;
    }

    const exportData = buildMedicationDataExport({
      doseStatusHistory: history,
      generatedAt,
      medications: state.meds,
      source: "web",
      user: state.user,
    });
    downloadTextFile(exportFileName("med-organizer-data", "json"), buildMedicationExportJson(exportData), "application/json");
    showToast("Data export downloaded.");
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    setBusy(false);
  }
}

function downloadTextFile(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setView(view) {
  state.view = view;
  localStorage.setItem("medOrganizerView", view);
  if (view === "history" && state.user) {
    void loadDoseHistory();
  }
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadDoseHistory() {
  if (!state.user || state.historyLoading) {
    return;
  }

  state.historyLoading = true;
  render();
  try {
    const dateKeys = getRecentDateKeys(7);
    const records = await getDoseStatusHistoryRecords(state.user.uid, dateKeys);
    const todayStatuses = Object.keys(state.statuses).length ? state.statuses : records[todayKey()] || {};
    state.historyStatuses = {
      ...records,
      [todayKey()]: todayStatuses,
    };
    state.historyLoaded = true;
  } catch (error) {
    showToast(messageFromError(error), "error");
  } finally {
    state.historyLoading = false;
    render();
  }
}

function setBusy(value) {
  state.busy = value;
  render();
}

function showToast(message, type = "info") {
  state.toast = message;
  state.toastType = type;
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = null;
    state.toastType = "info";
    render();
  }, 4200);
}

function render() {
  if (state.booting) {
    root.innerHTML = `
      <div class="boot-screen" role="status" aria-live="polite">
        <div class="boot-mark">M</div>
        <p>Loading your organizer...</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    ${renderTopBar()}
    ${state.isOnline ? "" : renderConnectionBanner()}
    ${state.user ? renderSignedInApp() : renderSignedOutApp()}
    ${state.toast ? `<div class="toast ${state.toastType === "error" ? "error" : ""}" role="status">${escapeHtml(state.toast)}</div>` : ""}
  `;
}

function renderConnectionBanner() {
  return `
    <div class="connection-banner" role="status">
      You appear to be offline. Your current organizer stays visible, but new changes may not save until the connection returns.
    </div>
  `;
}

function renderTopBar() {
  const user = state.user;
  return `
    <header class="top-app-bar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">M</div>
        <div>
          <h1>Med Organizer</h1>
          <p>Medication and vitamin schedule</p>
        </div>
      </div>
      <div class="top-actions">
        ${
          user
            ? `
              <div class="user-pill" title="${escapeHtml(user.email || user.displayName || "Signed in")}">
                <div class="avatar" aria-hidden="true">${escapeHtml(initialsForUser(user))}</div>
                <div>
                  <strong>${escapeHtml(user.displayName || "Signed in")}</strong>
                  <span>${escapeHtml(user.email || "")}</span>
                </div>
              </div>
              <button class="button text" type="button" data-action="sign-out" ${state.busy ? "disabled" : ""}>Sign out</button>
            `
            : `<button class="button primary" type="button" data-action="sign-in" ${state.busy ? "disabled" : ""}>Sign in with Google</button>`
        }
      </div>
    </header>
  `;
}

function renderSignedOutApp() {
  const previewDoses = sampleMedications
    .flatMap((med) => med.schedule.map((slot) => ({ med, slot })))
    .sort((a, b) => minutesFromTime(a.slot.time) - minutesFromTime(b.slot.time));

  return `
    <main class="auth-page">
      <section class="auth-hero">
        <p class="eyebrow">Personal organizer</p>
        <h2>Keep daily medications, vitamins, and supplements in one calm place.</h2>
        <p>Sign in to save your list, track today's doses, upload label photos, and keep notes with each item.</p>
        <div class="preview-stack" aria-label="Sample schedule preview">
          ${previewDoses
            .map(
              ({ med, slot }) => `
                <article class="mini-dose">
                  <span>${escapeHtml(formatClock(slot.time))}</span>
                  <div>
                    <strong>${escapeHtml(med.name)}</strong>
                    <small>${escapeHtml(med.dosage)} - ${escapeHtml(med.purpose)}</small>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
      <aside class="auth-panel">
        <h2>Use Google sign-in</h2>
        <p class="subtle">Your organizer is saved in Firebase for your account. New accounts start with sample data so the dashboard is useful right away.</p>
        <button class="button primary full" type="button" data-action="sign-in" ${state.busy ? "disabled" : ""}>Continue with Google</button>
        <div class="notice">
          <strong>Medical disclaimer</strong>
          <span>This app is for personal organization only and does not provide medical advice.</span>
        </div>
      </aside>
    </main>
  `;
}

function renderSignedInApp() {
  return `
    <div class="app-shell">
      ${renderNavigation()}
      <main class="content" id="main-content">
        ${
          state.loadingMeds
            ? `
              <section class="page">
                <div class="page-header">
                  <div>
                    <p class="eyebrow">Loading</p>
                    <h2 class="page-title">Getting your organizer ready</h2>
                  </div>
                </div>
                <div class="loading-bar" aria-label="Loading medication list"></div>
              </section>
            `
            : renderActiveView()
        }
      </main>
    </div>
  `;
}

function renderNavigation() {
  const links = [
    { view: "dashboard", label: "Today", icon: "T" },
    { view: "medications", label: "Medications", icon: "M" },
    { view: "history", label: "History", icon: "H" },
    { view: "reminders", label: "Reminders", icon: "R" },
    { view: "privacy", label: "Privacy", icon: "P" },
  ];
  return `
    <nav class="nav-rail" aria-label="Main navigation">
      ${links
        .map(
          (link) => `
            <button class="nav-button" type="button" data-action="navigate" data-view="${link.view}" aria-current="${state.view === link.view ? "page" : "false"}">
              <span class="nav-icon" aria-hidden="true">${link.icon}</span>
              <span class="nav-label">${link.label}</span>
            </button>
          `,
        )
        .join("")}
    </nav>
  `;
}

function renderActiveView() {
  if (state.view === "medications") {
    return renderMedicationList();
  }

  if (state.view === "reminders") {
    return renderReminders();
  }

  if (state.view === "history") {
    return renderHistory();
  }

  if (state.view === "privacy") {
    return renderPrivacy();
  }

  if (state.view === "add") {
    return renderMedicationForm();
  }

  if (state.view === "detail") {
    const med = getMedication(state.selectedMedId);
    if (!med) {
      return renderMedicationList();
    }
    return state.editMode ? renderMedicationForm(med) : renderMedicationDetail(med);
  }

  return renderDashboard();
}

function renderPageIntro(text) {
  return `<p class="page-intro">${escapeHtml(text)}</p>`;
}

function renderSectionHeading(title, body = "") {
  return `
    <div class="section-heading">
      <h3 class="section-title">${escapeHtml(title)}</h3>
      ${body ? `<p class="subtle">${escapeHtml(body)}</p>` : ""}
    </div>
  `;
}

function renderDashboard() {
  const doses = getTodayDoses();
  const takenCount = doses.filter((dose) => dose.status === "taken").length;
  const openDoses = doses.filter((dose) => dose.status === "due" || dose.status === "auto-missed");
  const nextDose = openDoses.find((dose) => dose.sortMinutes >= currentMinutes()) || openDoses[0];

  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">${escapeHtml(fullDateLabel())}</p>
          <h2 class="page-title">Today's schedule</h2>
          ${renderPageIntro("Review today's doses and mark each one as taken, skipped, or missed.")}
        </div>
        <div class="toolbar">
          <button class="button primary" type="button" data-action="add-medication">Add medication</button>
          <button class="button tonal" type="button" data-action="navigate" data-view="medications">View list</button>
        </div>
      </div>

      <div class="grid stats-grid">
        <article class="stat-card">
          <span>Total doses</span>
          <strong>${doses.length}</strong>
        </article>
        <article class="stat-card">
          <span>Marked taken</span>
          <strong>${takenCount}</strong>
        </article>
        <article class="stat-card">
          <span>Next dose</span>
          <strong>${nextDose ? escapeHtml(formatClock(nextDose.time)) : "Done"}</strong>
        </article>
      </div>

      <div class="grid dashboard-grid">
        <section class="grid" aria-label="Dose schedule">
          ${renderSectionHeading("Dose schedule", "Sorted by time for today.")}
          ${
            doses.length
              ? `<div class="schedule-list">${doses.map(renderDoseCard).join("")}</div>`
              : renderEmptyState("No doses scheduled yet", "Add a medication with at least one time of day to build today's schedule.", "Add medication")
          }
        </section>

        <aside class="side-stack">
          <div class="notice">
            <strong>Medical disclaimer</strong>
            <span>This app is for personal organization only and does not provide medical advice.</span>
          </div>
          ${renderReminderSummary()}
          ${renderNotesSummary()}
        </aside>
      </div>
    </section>
  `;
}

function renderHistory() {
  const dateKeys = getRecentDateKeys(7);
  const todayStatuses = Object.keys(state.statuses).length ? state.statuses : state.historyStatuses[todayKey()] || {};
  const summary = buildAdherenceSummary(
    dateKeys,
    {
      ...state.historyStatuses,
      [todayKey()]: todayStatuses,
    },
    state.meds,
  );
  const adherenceValue = summary.adherencePercentage === null ? "No data" : `${summary.adherencePercentage}%`;

  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Last 7 days</p>
          <h2 class="page-title">History</h2>
          ${renderPageIntro("A simple view of the dose statuses you have marked recently.")}
        </div>
        <button class="button tonal" type="button" data-action="navigate" data-view="dashboard">Today</button>
      </div>

      ${state.historyLoading ? `<div class="loading-bar" aria-label="Loading dose history"></div>` : ""}

      <div class="grid stats-grid">
        <article class="stat-card">
          <span>Adherence</span>
          <strong>${escapeHtml(adherenceValue)}</strong>
        </article>
        <article class="stat-card">
          <span>Taken</span>
          <strong>${summary.totals.taken}</strong>
        </article>
        <article class="stat-card">
          <span>Missed or skipped</span>
          <strong>${summary.totals.missed + summary.totals.skipped}</strong>
        </article>
      </div>

      ${
        summary.hasHistory
          ? `
            <div class="history-layout">
              <section class="card">
                <h3 class="section-title">Day-by-day</h3>
                <div class="history-day-list">
                  ${[...summary.days]
                    .reverse()
                    .map(renderHistoryDay)
                    .join("")}
                </div>
              </section>

              <aside class="side-stack">
                <div class="card">
                  <h3 class="section-title">Recent missed doses</h3>
                  <div class="missed-dose-list">
                    ${
                      summary.missedDoses.length
                        ? summary.missedDoses.map(renderMissedDose).join("")
                        : `<p class="subtle">No missed doses recorded in the last 7 days.</p>`
                    }
                  </div>
                </div>
                <div class="notice">
                  <strong>How this is calculated</strong>
                  <span>Adherence is taken doses divided by doses you marked taken, skipped, or missed.</span>
                </div>
              </aside>
            </div>
          `
          : `
            <div class="empty-state">
              <h3>No dose history yet</h3>
              <p class="subtle">Mark doses as taken, skipped, or missed to build your history.</p>
              <button class="button primary" type="button" data-action="navigate" data-view="dashboard">Go to today</button>
            </div>
          `
      }
    </section>
  `;
}

function renderPrivacy() {
  const userLabel = state.user?.email || state.user?.displayName || "Signed in";
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Account and privacy</p>
          <h2 class="page-title">Privacy</h2>
          ${renderPageIntro("Export your information and review how this organizer stores data.")}
        </div>
        <button class="button text" type="button" data-action="sign-out" ${state.busy ? "disabled" : ""}>Sign out</button>
      </div>

      <div class="settings-layout">
        <article class="card">
          <h3 class="section-title">Medical disclaimer</h3>
          <p class="subtle">This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.</p>
        </article>

        <article class="card">
          <h3 class="section-title">How your data is stored</h3>
          <div class="reminder-list" style="margin-top: 12px;">
            <div class="detail-item">
              <span>Account</span>
              <strong>${escapeHtml(userLabel)}</strong>
            </div>
            <div class="detail-item">
              <span>Storage</span>
              <strong>Medication records and dose statuses are saved in Firebase for your signed-in account.</strong>
            </div>
            <div class="detail-item">
              <span>Attachments</span>
              <strong>Label photos or files are saved in Firebase Storage. Exports include attachment metadata, not the actual files.</strong>
            </div>
          </div>
        </article>

        <article class="card">
          <h3 class="section-title">Export data</h3>
          <p class="subtle">Download your medications, schedules, notes, instructions, refill tracking, reminder settings, attachment metadata, and the last 7 days of dose status history.</p>
          <div class="toolbar" style="margin-top: 14px;">
            <button class="button primary" type="button" data-action="export-data-json" ${state.busy ? "disabled" : ""}>Export JSON</button>
            <button class="button tonal" type="button" data-action="export-medication-text" ${state.busy ? "disabled" : ""}>Export readable list</button>
          </div>
        </article>

        <article class="notice">
          <strong>Export note</strong>
          <span>The readable list is a medication summary only. Use JSON when you want the fuller account data export.</span>
        </article>

        <!-- TODO: Replace this copy with a reauthenticated, irreversible account deletion flow before public launch. -->
        <article class="card">
          <h3 class="section-title">Account deletion</h3>
          <p class="subtle">Secure account deletion is not active yet. Before public launch, this flow should delete the signed-in user's medications, dose statuses, app settings, and Storage attachments after a clear confirmation step.</p>
        </article>
      </div>
    </section>
  `;
}

function renderHistoryDay(day) {
  const percent = day.adherencePercentage === null ? "No data" : `${day.adherencePercentage}%`;
  return `
    <article class="history-day-card">
      <div>
        <strong>${escapeHtml(formatHistoryDateLabel(day.dateKey))}</strong>
        <span>${escapeHtml(percent)}</span>
      </div>
      <div class="history-count-row" aria-label="Dose counts for ${escapeHtml(day.dateKey)}">
        <span class="status-pill taken">${day.counts.taken} taken</span>
        <span class="status-pill skipped">${day.counts.skipped} skipped</span>
        <span class="status-pill missed">${day.counts.missed} missed</span>
      </div>
    </article>
  `;
}

function renderMissedDose(dose) {
  const time = dose.time ? ` at ${formatClock(dose.time)}` : "";
  return `
    <div class="detail-item">
      <span>${escapeHtml(formatHistoryDateLabel(dose.dateKey))}${escapeHtml(time)}</span>
      <strong>${escapeHtml(dose.medicationName)} - ${escapeHtml(dose.slotLabel)}</strong>
    </div>
  `;
}

function renderDoseCard(dose) {
  const status = dose.status;
  const displayStatus = status === "auto-missed" ? "missed" : status;
  return `
    <article class="schedule-card">
      <div class="dose-time">
        <strong>${escapeHtml(formatClock(dose.time))}</strong>
        <span class="subtle">${escapeHtml(dose.label)}</span>
      </div>
      <div class="dose-body">
        <div class="dose-heading">
          <div>
            <h3>${escapeHtml(dose.med.name)}</h3>
            <p class="subtle">${escapeHtml(dose.med.dosage)} - ${escapeHtml(dose.med.purpose)}</p>
          </div>
          <span class="chip ${escapeHtml(dose.med.category)}">${escapeHtml(categories[dose.med.category] || dose.med.category)}</span>
        </div>
        <div class="chip-row">
          <span class="status-pill ${displayStatus}">${escapeHtml(statusLabel(status))}</span>
          <span class="chip">${escapeHtml(intakeLabels[dose.med.intake] || "No intake note")}</span>
          ${
            dose.med.reminder?.enabled
              ? `<span class="chip">Reminder ${Number(dose.med.reminder.leadMinutes) || 15} min before</span>`
              : ""
          }
        </div>
        <div class="segmented-control" aria-label="Dose status for ${escapeHtml(dose.med.name)} at ${escapeHtml(dose.label)}">
          ${["taken", "skipped", "missed"]
            .map(
              (item) => `
                <button
                  class="segmented-button ${item} ${displayStatus === item ? "active" : ""}"
                  type="button"
                  data-action="mark-dose"
                  data-key="${escapeHtml(dose.key)}"
                  data-status="${item}"
                  ${state.busy ? "disabled" : ""}
                >${titleCase(item)}</button>
              `,
            )
            .join("")}
        </div>
        <button class="button detail-button" type="button" data-action="view-medication" data-id="${escapeHtml(dose.med.id)}">Open details</button>
      </div>
    </article>
  `;
}

function renderMedicationList() {
  const visibleMeds = getVisibleMedications();
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow" id="med-list-count-label">${escapeHtml(renderMedicationListCount(visibleMeds.length))}</p>
          <h2 class="page-title">Medication list</h2>
          ${renderPageIntro("Search, filter, and open details without changing saved data.")}
        </div>
        <button class="button primary" type="button" data-action="add-medication">Add medication</button>
      </div>
      ${state.meds.length ? renderMedicationListControls() : ""}
      <div id="med-list-results" aria-live="polite">
        ${renderMedicationListResults(visibleMeds)}
      </div>
    </section>
  `;
}

function renderMedicationListControls() {
  const controls = state.medicationListControls;
  return `
    <section class="list-controls" aria-label="Medication list controls">
      <div class="field list-search-field">
        <label for="med-list-search">Search medications</label>
        <input
          id="med-list-search"
          type="search"
          value="${escapeAttribute(controls.query)}"
          placeholder="Search name, purpose, dosage, instructions, notes"
        />
      </div>
      <div class="list-control-row">
        ${renderMedicationListSelect("Category", "category", controls.category, medicationCategoryFilterOptions)}
        ${renderMedicationListSelect("Status", "utility", controls.utility, medicationUtilityFilterOptions)}
        ${renderMedicationListSelect("Sort by", "sort", controls.sort, medicationSortOptions)}
        <button class="button tonal" type="button" data-action="clear-medication-list-filters">Clear filters</button>
      </div>
    </section>
  `;
}

function renderMedicationListSelect(label, key, value, options) {
  return `
    <label class="field list-select-field">
      <span>${escapeHtml(label)}</span>
      <select data-med-list-control="${escapeAttribute(key)}">
        ${options
          .map(
            (option) => `
              <option value="${escapeAttribute(option.value)}" ${option.value === value ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `,
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderMedicationListResults(visibleMeds = getVisibleMedications()) {
  if (state.meds.length === 0) {
    return renderEmptyState("No medications saved", "Add a prescription, over-the-counter medicine, vitamin, or supplement.", "Add medication");
  }

  if (visibleMeds.length === 0) {
    return `
      <div class="empty-state">
        <h3>No medications match</h3>
        <p class="subtle">Try a different search, category, status, or sort option.</p>
        <button class="button primary" type="button" data-action="clear-medication-list-filters">Clear filters</button>
      </div>
    `;
  }

  return `<div class="grid med-grid">${visibleMeds.map(renderMedicationCard).join("")}</div>`;
}

function updateMedicationListResults() {
  if (state.view !== "medications") {
    return;
  }

  const visibleMeds = getVisibleMedications();
  const countLabel = document.querySelector("#med-list-count-label");
  const results = document.querySelector("#med-list-results");
  if (countLabel) {
    countLabel.textContent = renderMedicationListCount(visibleMeds.length);
  }
  if (results) {
    results.innerHTML = renderMedicationListResults(visibleMeds);
  }
}

function resetMedicationListControls() {
  state.medicationListControls = defaultMedicationListControls();
  const search = document.querySelector("#med-list-search");
  const category = document.querySelector('[data-med-list-control="category"]');
  const utility = document.querySelector('[data-med-list-control="utility"]');
  const sort = document.querySelector('[data-med-list-control="sort"]');
  if (search) {
    search.value = state.medicationListControls.query;
  }
  if (category) {
    category.value = state.medicationListControls.category;
  }
  if (utility) {
    utility.value = state.medicationListControls.utility;
  }
  if (sort) {
    sort.value = state.medicationListControls.sort;
  }
  updateMedicationListResults();
}

function getVisibleMedications() {
  return filterAndSortMedications(state.meds, state.medicationListControls);
}

function renderMedicationListCount(visibleCount) {
  const active = hasActiveMedicationListControls(state.medicationListControls);
  if (state.meds.length === 0) {
    return "0 saved";
  }
  return active ? `${visibleCount} of ${state.meds.length} shown` : `${state.meds.length} saved`;
}

function renderMedicationCard(med) {
  const times = normalizedSchedule(med)
    .map((slot) => `${slot.label} ${formatClock(slot.time)}`)
    .join(", ");
  const refillInfo = getRefillInfo(med);
  return `
    <article class="card med-card">
      <div class="med-card-footer">
        <div>
          <h3>${escapeHtml(med.name)}</h3>
          <p class="subtle">${escapeHtml(med.purpose)}</p>
        </div>
        <span class="chip ${escapeHtml(med.category)}">${escapeHtml(categories[med.category] || med.category)}</span>
      </div>
      <div class="med-meta">
        <span class="chip">${escapeHtml(med.dosage)}</span>
        <span class="chip">${Number(med.timesPerDay) || normalizedSchedule(med).length}x daily</span>
        <span class="chip">${escapeHtml(intakeLabels[med.intake] || "No intake note")}</span>
      </div>
      <p class="subtle">${escapeHtml(times || "No schedule times")}</p>
      <div class="med-card-footer">
        <span class="status-pill ${med.reminder?.enabled ? "taken" : ""}">${med.reminder?.enabled ? "Reminder on" : "Reminder off"}</span>
        ${
          refillInfo.isTracking
            ? `<span class="status-pill ${refillInfo.isLowSupply ? "missed" : "skipped"}">${escapeHtml(refillStatusLabel(med))}</span>`
            : ""
        }
        <button class="button tonal" type="button" data-action="view-medication" data-id="${escapeHtml(med.id)}">Details</button>
      </div>
    </article>
  `;
}

function renderMedicationDetail(med) {
  const schedule = normalizedSchedule(med);
  const refillInfo = getRefillInfo(med);
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">${escapeHtml(categories[med.category] || med.category)}</p>
          <h2 class="page-title">${escapeHtml(med.name)}</h2>
          ${renderPageIntro("Purpose, schedule, refill details, and notes in one place.")}
        </div>
        <div class="detail-actions">
          <button class="button tonal" type="button" data-action="navigate" data-view="dashboard">Back</button>
          <button class="button tonal" type="button" data-action="edit-medication" data-id="${escapeHtml(med.id)}">Edit</button>
          <button class="button danger" type="button" data-action="delete-medication" data-id="${escapeHtml(med.id)}" ${state.busy ? "disabled" : ""}>${state.busy ? "Deleting..." : "Delete"}</button>
        </div>
      </div>

      <div class="detail-layout">
        <article class="detail-card grid">
          <div class="detail-header">
            <div>
              <h3>Purpose</h3>
              <p class="subtle">${escapeHtml(med.purpose)}</p>
            </div>
            <span class="chip ${escapeHtml(med.category)}">${escapeHtml(categories[med.category] || med.category)}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span>Dosage</span>
              <strong>${escapeHtml(med.dosage)}</strong>
            </div>
            <div class="detail-item">
              <span>Times per day</span>
              <strong>${Number(med.timesPerDay) || schedule.length}</strong>
            </div>
            <div class="detail-item">
              <span>Instructions</span>
              <strong>${escapeHtml(med.foodInstructions || intakeLabels[med.intake] || "Not specified")}</strong>
            </div>
            <div class="detail-item">
              <span>Reminder</span>
              <strong>${med.reminder?.enabled ? `${Number(med.reminder.leadMinutes) || 15} minutes before` : "Off"}</strong>
            </div>
            <div class="detail-item">
              <span>Estimated supply</span>
              <strong>${escapeHtml(refillStatusLabel(med))}</strong>
            </div>
            <div class="detail-item">
              <span>Quantity remaining</span>
              <strong>${escapeHtml(refillQuantityLabel(refillInfo.quantityRemaining))}</strong>
            </div>
            <div class="detail-item">
              <span>Low supply threshold</span>
              <strong>${escapeHtml(refillThresholdLabel(refillInfo.refillThreshold))}</strong>
            </div>
            <div class="detail-item">
              <span>Refill reminder</span>
              <strong>${refillInfo.refillReminderEnabled ? "On" : "Off"}</strong>
            </div>
            <div class="detail-item">
              <span>Last refill</span>
              <strong>${escapeHtml(refillInfo.lastRefillDate || "Not set")}</strong>
            </div>
          </div>
          <div class="detail-item">
            <span>Notes</span>
            <strong>${escapeHtml(med.notes || "No notes yet")}</strong>
          </div>
        </article>

        <aside class="side-stack">
          <div class="card">
            <h3 class="section-title">Schedule</h3>
            <div class="reminder-list" style="margin-top: 12px;">
              ${schedule
                .map(
                  (slot) => `
                    <div class="detail-item">
                      <span>${escapeHtml(slot.label)}</span>
                      <strong>${escapeHtml(formatClock(slot.time))}</strong>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </div>
          <div class="card">
            <h3 class="section-title">Attachment</h3>
            ${
              med.attachment?.url
                ? `
                  <div class="attachment-preview" style="margin-top: 12px;">
                    <strong>${escapeHtml(med.attachment.name || "Uploaded file")}</strong>
                    <a href="${escapeHtml(med.attachment.url)}" target="_blank" rel="noreferrer">Open uploaded file</a>
                    <button class="button text" type="button" data-action="remove-attachment" data-id="${escapeHtml(med.id)}" ${state.busy ? "disabled" : ""}>Remove attachment</button>
                  </div>
                `
                : `<p class="subtle">No label photo or instruction file uploaded yet.</p>`
            }
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderMedicationForm(med = null) {
  const isEditing = Boolean(med);
  const schedule = scheduleMapForForm(med);
  const selectedCount = Object.values(schedule).filter((slot) => slot.checked).length || 1;
  const timesPerDay = med?.timesPerDay || selectedCount;
  const suggestionRecord = findMedicationRecordByName(med?.name || "");
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">${isEditing ? "Edit medication" : "New medication"}</p>
          <h2 class="page-title">${isEditing ? escapeHtml(med.name) : "Add medication"}</h2>
          ${renderPageIntro("Use the label as the source of truth. Every suggestion stays editable before saving.")}
        </div>
      </div>

      <form id="medication-form" class="form-card">
        <div class="form-grid">
          <div class="form-section-label full">
            <h3>Medication basics</h3>
            <p>Start with the name, purpose, category, and dosage you want to see later.</p>
          </div>
          <div class="top-form-stack full">
            <div class="field autocomplete-field">
              <label for="name">Name</label>
              <input
                id="name"
                name="name"
                value="${escapeAttribute(med?.name || "")}"
                required
                autocomplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="false"
                aria-controls="name-suggestions"
                aria-describedby="name-autocomplete-help"
              />
              <span id="name-autocomplete-help" class="helper">Start typing to search the local medication list.</span>
              <div id="name-suggestions" class="autocomplete-list" role="listbox" hidden></div>
            </div>
            <div class="field">
              <label for="purpose">Common uses / purpose</label>
              <input
                id="purpose"
                name="purpose"
                value="${escapeAttribute(med?.purpose || "")}"
                placeholder="Add a purpose or select common uses, e.g. blood pressure"
                required
              />
              <div id="selected-use-chips" class="selected-use-row" aria-label="Selected common uses">
                ${renderSelectedUseChips(med?.purpose || "")}
              </div>
              <div id="use-suggestions" class="inline-suggestion-panel" ${suggestionRecord?.commonUses?.length ? "" : "hidden"}>
                ${suggestionRecord?.commonUses?.length ? renderUseSuggestions(suggestionRecord) : ""}
              </div>
            </div>
            <div class="field">
              <label for="category">Category</label>
              <select id="category" name="category" required>
                ${Object.entries(categories)
                  .map(
                    ([value, label]) => `<option value="${value}" ${normalizeCategory(med?.category) === value ? "selected" : ""}>${label}</option>`,
                  )
                  .join("")}
              </select>
            </div>
          </div>
          <input type="hidden" id="genericName" name="genericName" value="${escapeAttribute(med?.genericName || "")}" />
          <div class="field full dosage-field">
            <label for="dosage">Dosage</label>
            <input id="dosage" name="dosage" value="${escapeAttribute(med?.dosage || "")}" placeholder="eg. 10 mg Tab" required />
            <div id="dosage-suggestions" class="inline-suggestion-panel" aria-live="polite" ${suggestionRecord?.strengthsAndForms?.length ? "" : "hidden"}>
              ${suggestionRecord?.strengthsAndForms?.length ? renderDosageSuggestions(suggestionRecord) : ""}
            </div>
          </div>
          <div class="form-section-label full">
            <h3>Schedule and reminders</h3>
            <p>Choose when this medication appears in the daily schedule.</p>
          </div>
          <div class="field">
            <label for="timesPerDay">Times per day</label>
            <input id="timesPerDay" name="timesPerDay" type="number" min="1" max="12" value="${escapeAttribute(String(timesPerDay))}" required />
          </div>
          <div class="field">
            <label for="leadMinutes">Reminder lead time</label>
            <select id="leadMinutes" name="leadMinutes">
              ${[5, 10, 15, 30, 60]
                .map(
                  (minutes) =>
                    `<option value="${minutes}" ${(Number(med?.reminder?.leadMinutes) || 15) === minutes ? "selected" : ""}>${minutes} minutes before</option>`,
                )
                .join("")}
            </select>
          </div>
          <fieldset class="field full">
            <legend class="fieldset-label">Specific times of day</legend>
            <div class="slot-grid">
              ${slotDefinitions
                .map((slot) => {
                  const value = schedule[slot.id] || { checked: false, time: slot.time };
                  return `
                    <div class="slot-card">
                      <label>
                        <input type="checkbox" name="slot-${slot.id}" ${value.checked ? "checked" : ""} />
                        ${slot.label}
                      </label>
                      <input type="time" name="time-${slot.id}" value="${escapeAttribute(value.time || slot.time)}" aria-label="${slot.label} time" />
                    </div>
                  `;
                })
                .join("")}
            </div>
          </fieldset>
          <fieldset class="field full">
            <legend class="fieldset-label">How it should be taken</legend>
            <div class="radio-grid">
              ${Object.entries(intakeLabels)
                .map(
                  ([value, label]) => `
                    <label class="radio-card">
                      <input type="radio" name="intake" value="${value}" ${(med?.intake || "water") === value ? "checked" : ""} />
                      ${label}
                    </label>
                  `,
                )
                .join("")}
            </div>
          </fieldset>
          <div class="field full">
            <label for="foodInstructions">Instructions</label>
            <input id="foodInstructions" name="foodInstructions" value="${escapeAttribute(med?.foodInstructions || "")}" placeholder="Add instructions, e.g. take with food, before bed, avoid alcohol" />
          </div>
          <label class="checkbox-row field full">
            <input type="checkbox" name="reminderEnabled" ${med?.reminder?.enabled ? "checked" : ""} />
            Show reminder-style cards in the app
          </label>
          <div class="form-section-label full">
            <h3>Refill and notes</h3>
            <p>Optional supply details, notes, and label attachments stay with this medication.</p>
          </div>
          <fieldset class="field full">
            <legend class="fieldset-label">Refill tracking</legend>
            <div class="form-grid compact-grid">
              <div class="field">
                <label for="quantityRemaining">Quantity remaining</label>
                <input
                  id="quantityRemaining"
                  name="quantityRemaining"
                  type="number"
                  min="0"
                  step="0.5"
                  value="${escapeAttribute(med?.quantityRemaining ?? "")}"
                  placeholder="e.g. 14"
                />
              </div>
              <div class="field">
                <label for="refillThreshold">Low supply threshold</label>
                <input
                  id="refillThreshold"
                  name="refillThreshold"
                  type="number"
                  min="0"
                  step="0.5"
                  value="${escapeAttribute(med?.refillThreshold ?? "")}"
                  placeholder="e.g. 7"
                />
              </div>
              <div class="field">
                <label for="lastRefillDate">Last refill date</label>
                <input
                  id="lastRefillDate"
                  name="lastRefillDate"
                  type="date"
                  value="${escapeAttribute(med?.lastRefillDate || "")}"
                />
              </div>
              <label class="checkbox-row field">
                <input type="checkbox" name="refillReminderEnabled" ${med?.refillReminderEnabled ? "checked" : ""} />
                Remind me when supply is low
              </label>
            </div>
            <span class="helper">Optional. Use the same unit you count at home, such as tablets, capsules, patches, or doses.</span>
          </fieldset>
          <div class="field full">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" placeholder="Side effects, doctor instructions, refill info, or reminders">${escapeHtml(med?.notes || "")}</textarea>
          </div>
          <div class="field full">
            <label for="attachment">Label photo or instruction file</label>
            <input id="attachment" name="attachment" type="file" accept="image/*,.pdf" />
            <span class="helper">Saved to Firebase Storage. Existing attachments stay in place unless you remove or replace them.</span>
          </div>
          <div class="smart-safety-note field full">
            <strong>Medical disclaimer</strong>
            <span>This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.</span>
          </div>
        </div>
        <div class="form-actions">
          <button class="button primary" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Saving..." : "Save medication"}</button>
          <button class="button secondary" type="button" data-action="cancel-form" ${state.busy ? "disabled" : ""}>Cancel</button>
        </div>
      </form>
    </section>
  `;
}

function renderDosageSuggestions(record) {
  return `
    <div class="smart-chip-group">
      <span class="smart-chip-label">Available strength/form options</span>
      <div class="suggestion-chip-row">
        ${(record.strengthsAndForms || [])
          .map(
            (strength) => `
              <button class="suggestion-chip" type="button" data-action="apply-dosage" data-value="${escapeAttribute(strength)}">
                ${escapeHtml(strength)}
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderUseSuggestions(record) {
  return `
    <div class="smart-chip-group">
      <span class="smart-chip-label">Common use options</span>
      <div class="suggestion-chip-row">
        ${(record.commonUses || [])
          .map(
            (use) => `
              <button class="suggestion-chip" type="button" data-action="apply-use" data-value="${escapeAttribute(commonUseValue(use))}">
                ${escapeHtml(commonUseLabel(use))}
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderSelectedUseChips(value) {
  const uses = parseCommonUses(value);
  if (uses.length === 0) {
    return "";
  }

  return uses
    .map(
      (use) => `
        <span class="selected-use-chip">
          <span>${escapeHtml(use)}</span>
          <button
            class="remove-use-button"
            type="button"
            data-action="remove-use"
            data-value="${escapeAttribute(use)}"
            aria-label="Remove ${escapeAttribute(use)}"
          >x</button>
        </span>
      `,
    )
    .join("");
}

function updateMedicationSuggestions(query, options = {}) {
  const input = document.querySelector("#name");
  const list = document.querySelector("#name-suggestions");
  const form = document.querySelector("#medication-form");
  if (!input || !list || !form) {
    return;
  }

  if (options.nameChanged) {
    delete form.dataset.selectedMedication;
    state.liveSuggestions = [];
    state.liveSuggestionStatus = "idle";
    updateMedicationHelperPanels(null);
  }

  const localSuggestions = getMedicationSuggestions(query);
  const suggestions = mergeMedicationEntries(localSuggestions, state.liveSuggestions).slice(0, 8);
  state.formSuggestions = suggestions;
  state.activeSuggestionIndex = -1;

  if (!cleanText(query)) {
    closeMedicationSuggestions();
    return;
  }

  scheduleLiveRxTermsSearch(query, localSuggestions.length);
  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
  list.innerHTML = renderSuggestionList(suggestions);
}

function closeMedicationSuggestions() {
  const input = document.querySelector("#name");
  const list = document.querySelector("#name-suggestions");
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  if (list) {
    list.hidden = true;
    list.innerHTML = "";
  }
  state.formSuggestions = [];
  state.activeSuggestionIndex = -1;
}

function renderSuggestionList(suggestions) {
  if (suggestions.length === 0) {
    if (state.liveSuggestionStatus === "loading") {
      return `<div class="autocomplete-status" role="status">Checking medication list...</div>`;
    }
    return `<div class="autocomplete-status">No matching medications found.</div>`;
  }

  const options = suggestions
    .map(
      (record, index) => `
        <button
          id="suggestion-${index}"
          class="autocomplete-option"
          type="button"
          role="option"
          data-action="select-medication-suggestion"
          data-medication="${escapeAttribute(record.name)}"
          aria-selected="false"
        >
          <span class="suggestion-main">
            <strong>${escapeHtml(record.name)}</strong>
          </span>
          ${
            record.strengthsAndForms?.length
              ? `<small>${escapeHtml(record.strengthsAndForms.slice(0, 2).join(" | "))}</small>`
              : `<small>${escapeHtml(categories[normalizeCategory(record.category)] || "Medication")}</small>`
          }
        </button>
      `,
    )
    .join("");

  const footer =
    state.liveSuggestionStatus === "loading"
      ? `<div class="autocomplete-status" role="status">Checking medication list...</div>`
      : "";

  return `${options}${footer}`;
}

function scheduleLiveRxTermsSearch(query, localCount) {
  const search = normalizeSearch(query);
  window.clearTimeout(liveRxTermsTimer);

  if (search.length < 2 || localCount >= 3) {
    state.liveSuggestionStatus = "idle";
    return;
  }

  if (liveRxTermsCache.has(search)) {
    state.liveSuggestions = liveRxTermsCache.get(search);
    state.liveSuggestionStatus = "loaded";
    return;
  }

  const requestId = ++liveRxTermsRequestId;
  state.liveSuggestionStatus = "loading";
  liveRxTermsTimer = window.setTimeout(async () => {
    try {
      const results = await fetchRxTermsSuggestions(search);
      if (requestId !== liveRxTermsRequestId) {
        return;
      }
      liveRxTermsCache.set(search, results);
      state.liveSuggestions = results;
      state.liveSuggestionStatus = "loaded";
      refreshOpenSuggestions(search);
    } catch (error) {
      console.warn(error);
      if (requestId === liveRxTermsRequestId) {
        state.liveSuggestionStatus = "error";
        refreshOpenSuggestions(search);
      }
    }
  }, 350);
}

function refreshOpenSuggestions(query) {
  const input = document.querySelector("#name");
  if (!input || normalizeSearch(input.value) !== normalizeSearch(query)) {
    return;
  }

  const localSuggestions = getMedicationSuggestions(input.value);
  state.formSuggestions = mergeMedicationEntries(localSuggestions, state.liveSuggestions).slice(0, 8);
  const list = document.querySelector("#name-suggestions");
  if (list && !list.hidden) {
    list.innerHTML = renderSuggestionList(state.formSuggestions);
  }
}

function handleAutocompleteKeys(event) {
  const list = document.querySelector("#name-suggestions");
  if (!list || list.hidden) {
    return;
  }

  if (event.key === "Escape") {
    closeMedicationSuggestions();
    return;
  }

  if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
    return;
  }

  event.preventDefault();

  if (event.key === "Enter") {
    const selected = state.formSuggestions[state.activeSuggestionIndex] || state.formSuggestions[0];
    if (selected) {
      selectMedicationSuggestion(selected.name);
    }
    return;
  }

  const direction = event.key === "ArrowDown" ? 1 : -1;
  const max = state.formSuggestions.length - 1;
  const nextIndex =
    state.activeSuggestionIndex < 0 ? (direction > 0 ? 0 : max) : Math.min(max, Math.max(0, state.activeSuggestionIndex + direction));
  highlightMedicationSuggestion(nextIndex);
}

function highlightMedicationSuggestion(index) {
  state.activeSuggestionIndex = index;
  const input = document.querySelector("#name");
  document.querySelectorAll(".autocomplete-option").forEach((option, optionIndex) => {
    const isActive = optionIndex === index;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-selected", String(isActive));
    if (isActive && input) {
      input.setAttribute("aria-activedescendant", option.id);
    }
  });
}

function selectMedicationSuggestion(name) {
  const record = findMedicationRecordByName(name);
  const form = document.querySelector("#medication-form");
  if (!record || !form) {
    return;
  }

  form.dataset.selectedMedication = record.name;
  setFieldValue("name", record.name);
  setFieldValue("genericName", record.genericName || record.name);
  setFieldValue("category", normalizeCategory(record.category));
  setFieldValue("purpose", record.commonUses?.[0] ? commonUseValue(record.commonUses[0]) : "");
  setFieldValue("foodInstructions", record.foodInstructions || "");

  if (record.foodInstructions) {
    const intake = intakeFromFoodInstructions(record.foodInstructions);
    const intakeInput = form.querySelector(`input[name="intake"][value="${intake}"]`);
    if (intakeInput) {
      intakeInput.checked = true;
    }
  }

  updateMedicationHelperPanels(record);
  closeMedicationSuggestions();
}

function applySmartValue(fieldId, value) {
  setFieldValue(fieldId, value);
}

function applyCommonUseValue(value) {
  const field = document.querySelector("#purpose");
  const nextValue = commonUseValue(value);
  if (!field || !nextValue) {
    return;
  }

  const current = cleanText(field.value);
  const normalizedCurrent = normalizeSearch(current);
  if (!current) {
    setFieldValue("purpose", nextValue);
    updateSelectedUseChips();
    return;
  }

  if (parseCommonUses(current).map(normalizeSearch).includes(normalizeSearch(nextValue))) {
    field.focus();
    return;
  }

  setFieldValue("purpose", `${current}, ${nextValue}`);
  updateSelectedUseChips();
  field.focus();
}

function removeCommonUseValue(value) {
  const field = document.querySelector("#purpose");
  if (!field) {
    return;
  }

  const removeValue = normalizeSearch(value);
  const nextUses = parseCommonUses(field.value).filter((use) => normalizeSearch(use) !== removeValue);
  setFieldValue("purpose", nextUses.join(", "));
  updateSelectedUseChips();
  field.focus();
}

function setFieldValue(fieldId, value) {
  const field = document.querySelector(`#${fieldId}`);
  if (!field || value === undefined) {
    return;
  }
  field.value = value;
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function updateMedicationHelperPanels(record) {
  updateInlineSuggestionPanel("#dosage-suggestions", record?.strengthsAndForms?.length ? renderDosageSuggestions(record) : "");
  updateInlineSuggestionPanel("#use-suggestions", record?.commonUses?.length ? renderUseSuggestions(record) : "");
  updateSelectedUseChips();
}

function updateInlineSuggestionPanel(selector, content) {
  const panel = document.querySelector(selector);
  if (!panel) {
    return;
  }

  if (!content) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  panel.hidden = false;
  panel.innerHTML = content;
}

function updateSelectedUseChips() {
  const field = document.querySelector("#purpose");
  const container = document.querySelector("#selected-use-chips");
  if (!field || !container) {
    return;
  }
  container.innerHTML = renderSelectedUseChips(field.value);
}

function hydrateSmartFillForCurrentForm() {
  const nameInput = document.querySelector("#name");
  if (!nameInput) {
    return;
  }
  const record = findMedicationRecordByName(nameInput.value);
  if (record) {
    updateMedicationHelperPanels(record);
  }
}

function renderReminders() {
  const reminders = getTodayDoses().filter((dose) => dose.med.reminder?.enabled);
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">In-app reminders</p>
          <h2 class="page-title">Reminder cards</h2>
          ${renderPageIntro("Reminder cards follow the schedules and lead times you already set.")}
        </div>
        <button class="button primary" type="button" data-action="add-medication">Add medication</button>
      </div>
      <div class="notice">
        <strong>Notification status</strong>
        <span>These are reminder-style cards inside the app. Browser or phone notifications are not turned on.</span>
      </div>
      ${
        reminders.length
          ? `<div class="reminder-list">${reminders.map(renderReminderCard).join("")}</div>`
          : renderEmptyState("No reminder cards yet", "Turn on reminders while adding or editing a medication.", "Add medication")
      }
    </section>
  `;
}

function renderReminderCard(dose) {
  const lead = Number(dose.med.reminder?.leadMinutes) || 15;
  const reminderMinutes = Math.max(0, dose.sortMinutes - lead);
  return `
    <article class="card">
      <div class="med-card-footer">
        <div>
          <h3>${escapeHtml(dose.med.name)}</h3>
          <p class="subtle">Reminder at ${escapeHtml(formatMinutes(reminderMinutes))} for the ${escapeHtml(formatClock(dose.time))} dose.</p>
        </div>
        <span class="chip ${escapeHtml(dose.med.category)}">${escapeHtml(categories[dose.med.category] || dose.med.category)}</span>
      </div>
    </article>
  `;
}

function renderReminderSummary() {
  const reminders = getTodayDoses().filter((dose) => dose.med.reminder?.enabled).slice(0, 3);
  return `
    <div class="card">
      <div class="med-card-footer">
        <h3 class="section-title">Reminders</h3>
        <button class="button text" type="button" data-action="navigate" data-view="reminders">Open</button>
      </div>
      ${
        reminders.length
          ? `<div class="reminder-list" style="margin-top: 12px;">${reminders.map(renderReminderSummaryItem).join("")}</div>`
          : `<p class="subtle">No in-app reminder cards are turned on yet.</p>`
      }
    </div>
  `;
}

function renderReminderSummaryItem(dose) {
  const lead = Number(dose.med.reminder?.leadMinutes) || 15;
  return `
    <button class="detail-item" type="button" data-action="view-medication" data-id="${escapeHtml(dose.med.id)}">
      <span>${escapeHtml(formatClock(dose.time))} dose</span>
      <strong>${escapeHtml(dose.med.name)} - ${lead} min before</strong>
    </button>
  `;
}

function renderNotesSummary() {
  const noted = state.meds.filter((med) => med.notes).slice(0, 3);
  return `
    <div class="card">
      <h3 class="section-title">Recent notes</h3>
      ${
        noted.length
          ? `<div class="reminder-list" style="margin-top: 12px;">
              ${noted
                .map(
                  (med) => `
                    <button class="detail-item" type="button" data-action="view-medication" data-id="${escapeHtml(med.id)}">
                      <span>${escapeHtml(med.name)}</span>
                      <strong>${escapeHtml(med.notes)}</strong>
                    </button>
                  `,
                )
                .join("")}
            </div>`
          : `<p class="subtle">Medication notes will show up here after you add them.</p>`
      }
    </div>
  `;
}

function renderEmptyState(title, body, buttonText) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p class="subtle">${escapeHtml(body)}</p>
      <button class="button primary" type="button" data-action="add-medication">${escapeHtml(buttonText)}</button>
    </div>
  `;
}

function getMedication(id) {
  return state.meds.find((med) => med.id === id);
}

function getTodayDoses() {
  return state.meds
    .flatMap((med) =>
      normalizedSchedule(med).map((slot) => {
        const key = doseKey(med.id, slot.id);
        const savedStatus = state.statuses[key]?.status;
        const autoMissed = !savedStatus && minutesFromTime(slot.time) + 30 < currentMinutes();
        return {
          key,
          med,
          label: slot.label,
          time: slot.time,
          sortMinutes: minutesFromTime(slot.time),
          status: savedStatus || (autoMissed ? "auto-missed" : "due"),
        };
      }),
    )
    .sort((a, b) => a.sortMinutes - b.sortMinutes || a.med.name.localeCompare(b.med.name));
}

function getMedicationSuggestions(query) {
  return searchMedicationSuggestions(state.medicationDatabase, query);
}

function findMedicationRecordByName(name) {
  return findMedicationRecordInSources(name, state.medicationDatabase, state.liveSuggestions);
}
