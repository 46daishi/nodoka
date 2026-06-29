// ─── Primitive validators ─────────────────────────────────────────────────────

/** @param {unknown} value */
export function isValid(value) {
	return (
		value !== null &&
		value !== undefined &&
		!Number.isNaN(value) &&
		value !== "" &&
		(typeof value !== "number" || isFinite(value))
	);
}

/** @param {unknown} value @param {number} [fallback] */
export function sanitizeNumeric(value, fallback = 0) {
	if (typeof value === "number" && isFinite(value)) return value;
	if (typeof value === "string") {
		const n = parseFloat(value);
		if (!isNaN(n) && isFinite(n)) return n;
	}
	return fallback;
}

/** @param {unknown} dateValue @param {string} [fallback] */
export function sanitizeDate(dateValue, fallback = new Date().toISOString().split("T")[0]) {
	if (!dateValue) return fallback;
	try {
		const d = new Date(/** @type {string} */ (dateValue));
		if (isNaN(d.getTime())) return fallback;
		return d.toISOString().split("T")[0];
	} catch {
		return fallback;
	}
}

// ─── Data-point sanitizer ─────────────────────────────────────────────────────

/**
 * Coerce a raw data-point object into a valid shape.
 * @param {unknown} point
 */
export function sanitizeDataPoint(point) {
	if (!point || typeof point !== "object") {
		return { date: sanitizeDate(null), studyMinutes: 0, breakMinutes: 0, completedSessions: 0 };
	}
	const p = /** @type {Record<string, unknown>} */ (point);
	return {
		date:               sanitizeDate(p.date),
		studyMinutes:       sanitizeNumeric(p.studyMinutes),
		breakMinutes:       sanitizeNumeric(p.breakMinutes),
		completedSessions:  sanitizeNumeric(p.completedSessions),
	};
}

/**
 * Sanitize, filter empty days, and sort an array of raw stats data points.
 * @param {unknown[]} dataArray
 */
export function sanitizeStatisticsData(dataArray) {
	if (!Array.isArray(dataArray)) return [];

	return dataArray
		.filter(item => item && typeof item === "object")
		.map(sanitizeDataPoint)
		.filter(item => {
			const hasValidDate = item.date && item.date !== "Invalid Date";
			const hasData = item.studyMinutes > 0 || item.breakMinutes > 0 || item.completedSessions > 0;
			return hasValidDate && hasData;
		})
		.sort((a, b) => {
			try { return new Date(a.date).getTime() - new Date(b.date).getTime(); }
			catch { return 0; }
		});
}

// ─── Safe accessor factories (for charting libraries) ────────────────────────

/**
 * Wrap a data accessor so it never throws and always returns a finite number.
 * @template T
 * @param {(d: T) => unknown} accessor
 * @param {number} [fallback]
 * @returns {(d: T) => number}
 */
export function createSafeAccessor(accessor, fallback = 0) {
	return (data) => {
		try { return sanitizeNumeric(accessor(data), fallback); }
		catch { return fallback; }
	};
}
