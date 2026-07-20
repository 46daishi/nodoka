/**
 * dataBackup.js
 * Export / import the entire app state (all of localStorage) as a single
 * JSON file — statistics, theme settings, and anything else stored there.
 */

/**
 * Snapshot every key in localStorage and trigger a JSON file download.
 * @param {string} filenamePrefix - prefix used for the downloaded filename
 * @returns {string} the filename that was downloaded
 */
export function exportAllData(filenamePrefix = "nodoka-backup") {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}-${timestamp}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return filename;
}

/**
 * Read and parse a backup file selected by the user.
 * Does NOT touch localStorage — call applyBackupData() with the result
 * once the caller has confirmed the overwrite with the user.
 * @param {File} file
 * @returns {Promise<Record<string, string>>}
 */
export function readBackupFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (
                    typeof data !== "object" ||
                    data === null ||
                    Array.isArray(data)
                ) {
                    throw new Error("Invalid backup file format");
                }
                resolve(data);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

/**
 * Overwrite localStorage with the given key/value map.
 * Caller is responsible for confirming with the user first, since this
 * is destructive and irreversible.
 * @param {Record<string, string>} data
 */
export function applyBackupData(data) {
    localStorage.clear();
    for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
    }
}