export function isValid(value) {
  return (
    value !== null &&
    value !== undefined &&
    !Number.isNaN(value) &&
    value !== "" &&
    (typeof value !== "number" || isFinite(value))
  );
}

export function sanitizeNumeric(value, fallback = 0) {
  if (typeof value === "number" && isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function sanitizeDate(
  dateValue,
  fallback = new Date().toISOString().split("T")[0],
) {
  if (!dateValue) return fallback;

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.warn("Invalid date value:", dateValue, error);
    return fallback;
  }
}

export function sanitizeDataPoint(dataPoint) {
  if (!dataPoint || typeof dataPoint !== "object") {
    return {
      date: sanitizeDate(null),
      studyMinutes: 0,
      breakMinutes: 0,
      completedSessions: 0,
    };
  }

  return {
    date: sanitizeDate(dataPoint.date),
    studyMinutes: sanitizeNumeric(dataPoint.studyMinutes),
    breakMinutes: sanitizeNumeric(dataPoint.breakMinutes),
    completedSessions: sanitizeNumeric(dataPoint.completedSessions),
  };
}

export function sanitizeStatisticsData(dataArray) {
  if (!Array.isArray(dataArray)) {
    console.warn(
      "sanitizeStatisticsData: Expected array, got:",
      typeof dataArray,
    );
    return [];
  }

  return dataArray
    .filter((item) => item && typeof item === "object")
    .map(sanitizeDataPoint)
    .filter((item) => {
      // Filter out items that would cause issues in charts
      const hasValidDate = item.date && item.date !== "Invalid Date";
      const hasSomeData =
        item.studyMinutes > 0 ||
        item.breakMinutes > 0 ||
        item.completedSessions > 0;
      return hasValidDate && hasSomeData;
    })
    .sort((a, b) => {
      // Sort by date to ensure proper chart rendering
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (error) {
        return 0;
      }
    });
}

export function validateDimensions(width, height) {
  return {
    width: sanitizeNumeric(width, 400),
    height: sanitizeNumeric(height, 300),
  };
}

export function createSafeAccessor(accessor, fallback = 0) {
  return (data) => {
    try {
      const value = accessor(data);
      return sanitizeNumeric(value, fallback);
    } catch (error) {
      console.warn("Accessor error:", error);
      return fallback;
    }
  };
}

export function createSafeDateAccessor(
  accessor,
  fallback = new Date().toISOString().split("T")[0],
) {
  return (data) => {
    try {
      const value = accessor(data);
      return sanitizeDate(value, fallback);
    } catch (error) {
      console.warn("Date accessor error:", error);
      return fallback;
    }
  };
}
