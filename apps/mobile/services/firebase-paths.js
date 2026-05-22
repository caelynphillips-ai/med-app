export function userPath(uid) {
  return `users/${uid}`;
}

export function medicationsPath(uid) {
  return `${userPath(uid)}/medications`;
}

export function medicationPath(uid, medicationId) {
  return `${medicationsPath(uid)}/${medicationId}`;
}

export function doseStatusPath(uid, dateKey) {
  return `${userPath(uid)}/doseStatus/${dateKey}`;
}

export function appSettingsPath(uid) {
  return `${userPath(uid)}/appMeta/settings`;
}

export function medicationAttachmentPath(uid, medicationId, fileName) {
  return `${medicationPath(uid, medicationId)}/${fileName}`;
}
