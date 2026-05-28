import {
  fetchRxTermsSuggestions,
  mergeMedicationEntries,
  normalizeCategory,
} from "./rxterms.js";
import { categories, CLIENT_NAME, intakeLabels, MEDICATION_SCHEMA_VERSION, slotDefinitions } from "./config/constants.js";
import { deleteCurrentAccount } from "./services/accountDeletionService.js";
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
import { findMedicationRecordByName as findMedicationRecordInSources, getMedicationSuggestions as searchMedicationSuggestions, loadMedicationDatabase as fetchMedicationDatabase } from "./services/suggestionService.js";
import { deleteAttachmentPath, uploadMedicationAttachment } from "./services/storageService.js";
import { commonUseLabel, commonUseValue, parseCommonUses } from "./utils/commonUses.js";
import { currentMinutes, formatClock, formatMinutes, fullDateLabel, minutesFromTime, normalizeTimeInput, todayKey } from "./utils/dateTime.js";
import { messageFromError } from "./utils/errors.js";
import { intakeFromFoodInstructions } from "./utils/medicationFields.js";
import {
  getRefillInfo,
  normalizeQuantityPerDose,
  refillQuantityLabel,
  refillQuantityPerDoseLabel,
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
  formatMissedDoseTitle,
  getRecentDateKeys,
  hasDeletedMedicationHistory,
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
  accountDeleteConfirmation: "",
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
  state.accountDeleteConfirmation = "";
  state.selectedMedId = null;
  state.editMode = false;
  render();

  if (!user) {
    return;
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

  if (action === "delete-account") {
    await deleteAccount();
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

  if (event.target.matches("#account-delete-confirm")) {
    state.accountDeleteConfirmation = event.target.value;
    const deleteButton = root.querySelector('[data-action="delete-account"]');
    if (deleteButton) {
      deleteButton.disabled = state.busy || state.accountDeleteConfirmation !== "DELETE";
    }
  }
});

root.addEventListener("pointerdown", (event) => {
  const intakeCard = event.target.closest(".radio-card");
  const intakeInput = intakeCard?.querySelector('input[name="intake"]');
  if (intakeInput) {
    intakeInput.dataset.wasChecked = intakeInput.checked ? "true" : "false";
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
  if (event.target.matches('input[name="intake"]') && (event.key === " " || event.key === "Enter") && event.target.checked) {
    event.preventDefault();
    event.target.checked = false;
    event.target.dataset.wasChecked = "false";
    return;
  }

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

  const intakeInput = event.target.closest('input[name="intake"]');
  if (intakeInput?.dataset.wasChecked === "true") {
    intakeInput.checked = false;
    intakeInput.dataset.wasChecked = "false";
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
  const selectedSchedule = [];
  for (const slot of slotDefinitions) {
    if (formData.get(`slot-${slot.id}`) !== "on") {
      continue;
    }
    const rawTime = formData.get(`time-${slot.id}`) || slot.time;
    const normalizedTime = normalizeTimeInput(rawTime);
    if (!normalizedTime) {
      showToast(`Enter a valid time for ${slot.label}, such as 8 AM or 18:00.`, "error");
      return;
    }
    selectedSchedule.push({
      displayTime: String(rawTime || "").trim(),
      id: slot.id,
      label: slot.label,
      time: normalizedTime,
    });
  }
  selectedSchedule.sort((a, b) => minutesFromTime(a.time) - minutesFromTime(b.time));

  if (selectedSchedule.length === 0) {
    showToast("Choose at least one time of day.", "error");
    return;
  }

  const timesPerDay = Number(formData.get("timesPerDay")) || selectedSchedule.length;
  const quantityRemaining = normalizeRefillNumber(formData.get("quantityRemaining"));
  const quantityPerDose = normalizeQuantityPerDose(formData.get("quantityPerDose"));
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
    intake: formData.get("intake") || "",
    foodInstructions: cleanText(formData.get("foodInstructions")),
    notes: cleanText(formData.get("notes")),
    quantityRemaining,
    quantityPerDose,
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

  if (!payload.name) {
    showToast("Medication name is required.", "error");
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

async function deleteAccount() {
  if (!state.user) {
    showToast("Please sign in before deleting your account.", "error");
    return;
  }

  if (state.accountDeleteConfirmation !== "DELETE") {
    showToast("Type DELETE before deleting your account.", "error");
    return;
  }

  const confirmed = window.confirm(
    "Permanently delete your Azur Well account? This deletes your medications, dose history, settings, and uploaded attachments.",
  );
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await deleteCurrentAccount(state.user);
    cleanupSubscriptions();
    state.accountDeleteConfirmation = "";
    showToast("Account deleted.");
  } catch (error) {
    const message =
      error?.dataDeleted && error?.code === "auth/requires-recent-login"
        ? "Your account data was deleted, but Firebase needs a fresh sign-in to delete the sign-in account. Sign out, sign back in, then try deleting the account again."
        : messageFromError(error);
    showToast(message, "error");
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
        <div class="boot-mark" aria-hidden="true">
          <img src="/assets/brand/azur-well-mark.png" alt="" />
        </div>
        <p>Loading Azur Well...</p>
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
        <div class="brand-mark" aria-hidden="true">
          <img src="/assets/brand/azur-well-mark.png" alt="" />
        </div>
        <div>
          <h1>Azur Well</h1>
          <p>Medication and supplement tracker</p>
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
            : ""
        }
      </div>
    </header>
  `;
}

function renderSignedOutApp() {
  return `
    <main class="auth-page">
      <section class="auth-hero">
        <div class="auth-logo-lockup" aria-label="Azur Well">
          <img src="/assets/brand/azur-well-mark.png" alt="" />
          <span>Azur Well</span>
        </div>
        <p class="eyebrow">Personal organizer</p>
        <h2>Organize your daily care.</h2>
        <p>Keep track of medications, vitamins, supplements, reminders, and refills in one organized place.</p>
        <div class="welcome-start-card">
          <strong>Build your schedule</strong>
          <span>Add your medications, vitamins, and supplements to get started.</span>
        </div>
      </section>
      <aside class="auth-panel">
        <p class="eyebrow">Welcome</p>
        <h2>Sign in to begin</h2>
        <p class="subtle">Save your organizer to your account and keep it with you.</p>
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
  const remainingCount = Math.max(0, doses.length - takenCount);
  const hasDoses = doses.length > 0;
  const heroLabel = nextDose ? "Next dose" : hasDoses ? "Today's progress" : "Start today";
  const heroTitle = nextDose ? formatClock(nextDose.time) : hasDoses ? "All set" : "No doses yet";
  const heroDetail = nextDose ? renderNextDoseHeroDetail(nextDose) : escapeHtml(hasDoses ? "No open doses left for today." : "Add your first medication to build today's schedule.");
  const progressCopy = hasDoses ? `${takenCount} of ${doses.length} taken today` : "Add a medication to begin";

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

      <article class="next-dose-hero">
        <div>
          <span class="hero-label">${escapeHtml(heroLabel)}</span>
          <strong>${escapeHtml(heroTitle)}</strong>
          <p>${heroDetail}</p>
        </div>
        <span class="progress-pill">${escapeHtml(progressCopy)}</span>
      </article>

      ${
        hasDoses
          ? `<div class="grid stats-grid">
              <article class="stat-card">
                <span>Total doses</span>
                <strong>${doses.length}</strong>
              </article>
              <article class="stat-card">
                <span>Marked taken</span>
                <strong>${takenCount}</strong>
              </article>
              <article class="stat-card">
                <span>Remaining</span>
                <strong>${remainingCount}</strong>
              </article>
            </div>`
          : ""
      }

      <div class="grid dashboard-grid">
        <section class="grid" aria-label="Dose schedule">
          ${renderSectionHeading("Dose schedule", "Sorted by time for today.")}
          ${
            doses.length
              ? `<div class="schedule-list">${doses.map(renderDoseCard).join("")}</div>`
              : renderEmptyState("No doses scheduled yet", "Add a medication with at least one time of day to build today's schedule.", "Add your first medication")
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

function renderNextDoseHeroDetail(dose) {
  const dosage = cleanText(dose.med.dosage);
  return `
    ${escapeHtml(dose.med.name)}
    ${
      dosage
        ? `<span aria-hidden="true"> - </span>${escapeHtml(dosage)}`
        : renderEmptyActionChip(dose.med.id, "Add dosage")
    }
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
  const adherenceValue = summary.adherencePercentage === null ? "No marked doses" : `${summary.adherencePercentage}%`;
  const hasDeletedHistory = hasDeletedMedicationHistory(summary.missedDoses);

  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Last 7 days</p>
          <h2 class="page-title">History</h2>
          ${renderPageIntro("History only includes doses you marked as taken, skipped, or missed.")}
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
          <span>Skipped</span>
          <strong>${summary.totals.skipped}</strong>
        </article>
        <article class="stat-card">
          <span>Missed</span>
          <strong>${summary.totals.missed}</strong>
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
                  ${
                    hasDeletedHistory
                      ? `<p class="subtle history-note">Some history may reference medications that were later deleted.</p>`
                      : ""
                  }
                </div>
                <div class="notice">
                  <strong>How this is calculated</strong>
                  <span>Adherence only uses saved statuses. It is taken doses divided by doses you marked taken, skipped, or missed.</span>
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
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Account and privacy</p>
          <h2 class="page-title">Privacy</h2>
          ${renderPageIntro("Download your medication list and review important privacy information.")}
        </div>
        <button class="button text" type="button" data-action="sign-out" ${state.busy ? "disabled" : ""}>Sign out</button>
      </div>

      <div class="settings-layout">
        <article class="card">
          <h3 class="section-title">Medical disclaimer</h3>
          <p class="subtle">This app is for personal organization only and does not provide medical advice. Confirm medication details with the prescription label, doctor, or pharmacist.</p>
        </article>

        <article class="card">
          <h3 class="section-title">Export readable list</h3>
          <p class="subtle">Download a readable summary of your saved medications and schedules.</p>
          <ul class="export-checklist" aria-label="Export includes">
            <li>Medication names, categories, purpose, and dosage</li>
            <li>Schedule times and instructions</li>
            <li>A simple text format for sharing or saving</li>
          </ul>
          <div class="toolbar" style="margin-top: 14px;">
            <button class="button primary" type="button" data-action="export-medication-text" ${state.busy ? "disabled" : ""}>Export readable list</button>
          </div>
        </article>

        <article class="notice">
          <strong>Export note</strong>
          <span>The readable list is designed for sharing or printing. It does not replace medical advice.</span>
        </article>

        <article class="card danger-zone">
          <h3 class="section-title">Delete your account</h3>
          <p class="subtle">This permanently deletes your medications, dose history, settings, and uploaded attachments.</p>
          <div class="field">
            <label for="account-delete-confirm">Type DELETE to confirm</label>
            <input
              id="account-delete-confirm"
              value="${escapeAttribute(state.accountDeleteConfirmation)}"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="DELETE"
              ${state.busy ? "disabled" : ""}
            />
          </div>
          <button
            class="button danger"
            type="button"
            data-action="delete-account"
            ${state.busy || state.accountDeleteConfirmation !== "DELETE" ? "disabled" : ""}
          >${state.busy ? "Deleting..." : "Delete account"}</button>
        </article>
      </div>
    </section>
  `;
}

function renderHistoryDay(day) {
  const percent = day.adherencePercentage === null ? "No marked doses" : `${day.adherencePercentage}%`;
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
      <strong>${escapeHtml(formatMissedDoseTitle(dose))}</strong>
    </div>
  `;
}

function renderDoseCard(dose) {
  const status = dose.status;
  const displayStatus = status === "auto-missed" ? "missed" : status;
  const intakeText = intakeLabels[dose.med.intake] || "Add intake note";
  const filledDoseDetails = [cleanText(dose.med.dosage), cleanText(dose.med.purpose)].filter(Boolean).join(" - ");
  const missingDoseActions = [
    cleanText(dose.med.dosage) ? "" : renderEmptyActionChip(dose.med.id, "Add dosage"),
    cleanText(dose.med.purpose) ? "" : renderEmptyActionChip(dose.med.id, "Add purpose"),
  ].join("");
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
            ${filledDoseDetails ? `<p class="subtle">${escapeHtml(filledDoseDetails)}</p>` : ""}
            ${missingDoseActions ? `<div class="empty-action-row">${missingDoseActions}</div>` : ""}
          </div>
          <span class="chip ${escapeHtml(dose.med.category)}">${escapeHtml(categories[dose.med.category] || dose.med.category)}</span>
        </div>
        <div class="chip-row">
          <span class="status-pill ${displayStatus}">${escapeHtml(statusLabel(status))}</span>
          ${
            cleanText(intakeLabels[dose.med.intake])
              ? `<span class="chip">${escapeHtml(intakeText)}</span>`
              : renderEmptyActionChip(dose.med.id, "Add intake note")
          }
          ${
            dose.med.reminder?.enabled
              ? `<span class="chip">Reminder ${Number(dose.med.reminder.leadMinutes) || 15} min before</span>`
              : ""
          }
        </div>
        <div class="dose-action-row">
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
          ${renderPageIntro("Search, filter, and manage each saved medication.")}
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
    return renderEmptyState("No medications saved", "Add a prescription, over-the-counter medicine, vitamin, or supplement.", "Add your first medication");
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
  const schedule = normalizedSchedule(med);
  const nextSlot = schedule[0];
  const times = schedule.map((slot) => `${slot.label} ${formatClock(slot.time)}`).join(", ");
  const refillInfo = getRefillInfo(med);
  const hasPurpose = Boolean(cleanText(med.purpose));
  const hasDosage = Boolean(cleanText(med.dosage));
  const hasNotes = Boolean(cleanText(med.notes));
  return `
    <article class="card med-card">
      <div class="med-card-header">
        <div class="med-card-title">
          <h3>${escapeHtml(med.name)}</h3>
          ${
            hasPurpose
              ? `<p class="subtle med-purpose">${escapeHtml(med.purpose)}</p>`
              : `<div class="empty-action-row">${renderEmptyActionChip(med.id, "Add purpose")}</div>`
          }
        </div>
        <span class="chip ${escapeHtml(med.category)}">${escapeHtml(categories[med.category] || med.category)}</span>
      </div>
      <div class="med-scan">
        <span>
          <strong>Dosage</strong>
          ${hasDosage ? escapeHtml(med.dosage) : renderEmptyActionChip(med.id, "Add dosage")}
        </span>
        <span>
          <strong>Next scheduled</strong>
          ${nextSlot ? `${escapeHtml(nextSlot.label)} ${escapeHtml(formatClock(nextSlot.time))}` : "No schedule times"}
        </span>
      </div>
      <div class="med-card-actions">
        <div class="med-status-row">
          <span class="status-pill ${med.reminder?.enabled ? "taken" : ""}">${med.reminder?.enabled ? "Reminder on" : "Reminder off"}</span>
          ${
            refillInfo.isTracking
              ? `<span class="status-pill ${refillInfo.isLowSupply ? "missed low-supply" : "skipped"}">${escapeHtml(refillStatusLabel(med))}</span>`
              : ""
          }
        </div>
        ${
          times
            ? `<p class="subtle med-schedule-summary" title="${escapeAttribute(times)}">${escapeHtml(times)}</p>`
            : ""
        }
        ${hasNotes ? "" : `<div class="empty-note-action">${renderEmptyActionChip(med.id, "Add notes")}</div>`}
        <div class="med-quick-actions" aria-label="Actions for ${escapeAttribute(med.name)}">
          <button class="button tonal med-details-button" type="button" data-action="view-medication" data-id="${escapeHtml(med.id)}">Details</button>
          <button class="button med-card-action-button" type="button" data-action="edit-medication" data-id="${escapeHtml(med.id)}">Edit</button>
          <button class="button med-card-action-button danger" type="button" data-action="delete-medication" data-id="${escapeHtml(med.id)}" ${state.busy ? "disabled" : ""}>${state.busy ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </article>
  `;
}

function renderMedicationDetail(med) {
  const schedule = normalizedSchedule(med);
  const refillInfo = getRefillInfo(med);
  const instructions = cleanText(med.foodInstructions || intakeLabels[med.intake] || "");
  const hasAttachment = Boolean(med.attachment?.url || med.attachment?.name || med.attachment?.path);
  const detailItems = [
    renderOptionalDetailItem("Dosage", med.dosage),
    renderOptionalDetailItem("Times per day", String(Number(med.timesPerDay) || schedule.length || "")),
    renderOptionalDetailItem("Instructions", instructions),
    med.reminder?.enabled ? renderOptionalDetailItem("Reminder", `${Number(med.reminder.leadMinutes) || 15} minutes before`) : "",
    refillInfo.estimatedDaysRemaining !== null || refillInfo.isLowSupply ? renderOptionalDetailItem("Estimated supply", refillStatusLabel(med)) : "",
    refillInfo.quantityRemaining !== null ? renderOptionalDetailItem("Quantity remaining", refillQuantityLabel(refillInfo.quantityRemaining)) : "",
    refillInfo.quantityPerDose !== null ? renderOptionalDetailItem("Quantity per dose", refillQuantityPerDoseLabel(refillInfo.quantityPerDose)) : "",
    refillInfo.refillThreshold !== null ? renderOptionalDetailItem("Low supply threshold", refillThresholdLabel(refillInfo.refillThreshold)) : "",
    refillInfo.refillReminderEnabled ? renderOptionalDetailItem("Refill reminder", "On") : "",
    renderOptionalDetailItem("Last refill", refillInfo.lastRefillDate),
    cleanText(med.notes) ? renderOptionalDetailItem("Notes", med.notes) : "",
  ].join("");
  const notesAction = cleanText(med.notes)
    ? ""
    : `<div class="detail-note-action">
        <button class="button tonal" type="button" data-action="edit-medication" data-id="${escapeHtml(med.id)}">Add notes</button>
      </div>`;
  const attachmentCard = hasAttachment
    ? `
      <div class="card">
        <h3 class="section-title">Attachment</h3>
        <div class="attachment-preview" style="margin-top: 12px;">
          <strong>${escapeHtml(med.attachment.name || "Uploaded file")}</strong>
          ${
            med.attachment.url
              ? `<a href="${escapeHtml(med.attachment.url)}" target="_blank" rel="noreferrer">Open uploaded file</a>`
              : ""
          }
          <button class="button text" type="button" data-action="remove-attachment" data-id="${escapeHtml(med.id)}" ${state.busy ? "disabled" : ""}>Remove attachment</button>
        </div>
      </div>
    `
    : "";
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">${escapeHtml(categories[med.category] || med.category)}</p>
          <h2 class="page-title">${escapeHtml(med.name)}</h2>
          ${renderPageIntro("Review the details saved for this medication.")}
        </div>
        <div class="detail-actions">
          <button class="button tonal" type="button" data-action="navigate" data-view="medications">Back to medications</button>
          <button class="button tonal" type="button" data-action="edit-medication" data-id="${escapeHtml(med.id)}">Edit</button>
          <button class="button danger" type="button" data-action="delete-medication" data-id="${escapeHtml(med.id)}" ${state.busy ? "disabled" : ""}>${state.busy ? "Deleting..." : "Delete"}</button>
        </div>
      </div>

      <div class="detail-layout">
        <article class="detail-card grid">
          <div class="detail-header">
            <div>
              <h3>${cleanText(med.purpose) ? "Purpose" : "Medication details"}</h3>
              ${cleanText(med.purpose) ? `<p class="subtle">${escapeHtml(med.purpose)}</p>` : ""}
            </div>
            <span class="chip ${escapeHtml(med.category)}">${escapeHtml(categories[med.category] || med.category)}</span>
          </div>
          <div class="detail-grid">
            ${detailItems}
          </div>
          ${notesAction}
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
          ${attachmentCard}
        </aside>
      </div>
    </section>
  `;
}

function renderOptionalDetailItem(label, value) {
  const text = cleanText(value);
  if (!text) {
    return "";
  }
  return `
    <div class="detail-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(text)}</strong>
    </div>
  `;
}

function renderEmptyActionChip(medId, label) {
  return `
    <button class="empty-action-chip" type="button" data-action="edit-medication" data-id="${escapeHtml(medId)}">
      ${escapeHtml(label)}
    </button>
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
              <label for="name">Name <span class="required-mark" aria-hidden="true">*</span></label>
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
                placeholder="Add a purpose or select common uses"
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
            <input id="dosage" name="dosage" value="${escapeAttribute(med?.dosage || "")}" placeholder="eg. 10 mg Tab" />
            <div id="dosage-suggestions" class="inline-suggestion-panel" aria-live="polite" ${suggestionRecord?.strengthsAndForms?.length ? "" : "hidden"}>
              ${suggestionRecord?.strengthsAndForms?.length ? renderDosageSuggestions(suggestionRecord) : ""}
            </div>
          </div>
          <div class="form-section-label full">
            <h3>Schedule</h3>
            <p>Choose when this medication appears in the daily schedule. Times per day should match the time slots you turn on.</p>
          </div>
          <div class="field">
            <label for="timesPerDay">Times per day</label>
            <input id="timesPerDay" name="timesPerDay" type="number" min="1" max="12" value="${escapeAttribute(String(timesPerDay))}" required />
            <span class="helper">Use the number of daily doses on the label, then turn on the matching time slots below.</span>
          </div>
          <fieldset class="field full">
            <legend class="fieldset-label">Specific times of day <span class="required-mark" aria-hidden="true">*</span></legend>
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
                      <input class="time-entry" type="text" name="time-${slot.id}" value="${escapeAttribute(value.displayTime || value.time || slot.time)}" placeholder="8 AM or 18:00" aria-label="${slot.label} time" />
                    </div>
                  `;
                })
                .join("")}
            </div>
          </fieldset>
          <div class="form-section-label full">
            <h3>Instructions</h3>
            <p>Add practical notes about how this medication should be taken.</p>
          </div>
          <fieldset class="field full">
            <legend class="fieldset-label">How it should be taken</legend>
            <div class="radio-grid">
              ${Object.entries(intakeLabels)
                .map(
                  ([value, label]) => `
                    <label class="radio-card">
                      <input type="radio" name="intake" value="${value}" ${med?.intake === value ? "checked" : ""} />
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
          <div class="form-section-label full">
            <h3>Reminders</h3>
            <p>Reminder cards appear in this organizer. Browser notifications are not active on the web app.</p>
          </div>
          <label class="checkbox-row field full">
            <input type="checkbox" name="reminderEnabled" ${med?.reminder?.enabled ? "checked" : ""} />
            Show reminder-style cards in the app
          </label>
          <div class="field reminder-lead-field ${med?.reminder?.enabled ? "" : "is-muted"}">
            <label for="leadMinutes">Reminder lead time</label>
            <select id="leadMinutes" name="leadMinutes">
              ${[5, 10, 15, 30, 60]
                .map(
                  (minutes) =>
                    `<option value="${minutes}" ${(Number(med?.reminder?.leadMinutes) || 15) === minutes ? "selected" : ""}>${minutes} minutes before</option>`,
                )
                .join("")}
            </select>
            <span class="helper">Only used when reminder cards are turned on.</span>
          </div>
          <div class="form-section-label full">
            <h3>Refill tracking</h3>
            <p>Optional supply details stay with this medication and can power low-supply reminders.</p>
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
                <label for="quantityPerDose">Quantity per dose</label>
                <input
                  id="quantityPerDose"
                  name="quantityPerDose"
                  type="number"
                  min="0"
                  step="0.5"
                  value="${escapeAttribute(med?.quantityPerDose ?? "")}"
                  placeholder="e.g. 1"
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
          <div class="form-section-label full">
            <h3>Notes</h3>
            <p>Keep doctor instructions, refill notes, side effects, or attachment details here.</p>
          </div>
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
      <span class="smart-chip-label">Optional strength/form options</span>
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
      <span class="smart-chip-label">Optional common use options</span>
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
    form.querySelectorAll('input[name="intake"]').forEach((input) => {
      input.checked = input.value === intake;
      input.dataset.wasChecked = "false";
    });
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
  if (!reminders.length) {
    return "";
  }
  return `
    <div class="card">
      <div class="med-card-footer">
        <h3 class="section-title">Reminders</h3>
        <button class="button text" type="button" data-action="navigate" data-view="reminders">Open</button>
      </div>
      <div class="reminder-list" style="margin-top: 12px;">${reminders.map(renderReminderSummaryItem).join("")}</div>
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
  if (!noted.length) {
    return "";
  }
  return `
    <div class="card">
      <h3 class="section-title">Recent notes</h3>
      <div class="reminder-list" style="margin-top: 12px;">
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
            </div>
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
