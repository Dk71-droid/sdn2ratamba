// js/utils.js
// Fungsi-fungsi pembantu umum untuk aplikasi

const showMessage = (type, text, titleOverride = null) => {
  const globalMessage = document.getElementById("globalMessage");
  const messageTitle = document.getElementById("messageTitle");
  const messageText = document.getElementById("messageText");
  const messageCloseBtn = document.getElementById("messageCloseBtn");

  if (!globalMessage || !messageTitle || !messageText || !messageCloseBtn) {
    console.error("Global message elements not found.");
    return;
  }

  // Reset classes
  globalMessage.classList.remove(
    "hidden",
    "bg-blue-100",
    "border-blue-500",
    "text-blue-700",
    "bg-green-100",
    "border-green-500",
    "text-green-700",
    "bg-red-100",
    "border-red-500",
    "text-red-700",
    "bg-gray-100",
    "border-gray-500",
    "text-gray-700"
  );

  let bgColor, borderColor, textColor, title;
  let duration = 3000; // Default duration

  switch (type) {
    case "loading":
      bgColor = "bg-blue-100";
      borderColor = "border-blue-500";
      textColor = "text-blue-700";
      title = "Memuat...";
      break;
    case "success":
      bgColor = "bg-green-100";
      borderColor = "border-green-500";
      textColor = "text-green-700";
      title = "Berhasil!";
      break;
    case "error":
      bgColor = "bg-red-100";
      borderColor = "border-red-500";
      textColor = "text-red-700";
      title = "Terjadi Kesalahan!";
      duration = 5000;
      break;
    case "info":
      bgColor = "bg-blue-100";
      borderColor = "border-blue-500";
      textColor = "text-blue-700";
      title = "Informasi";
      break;
    default:
      bgColor = "bg-gray-100";
      borderColor = "border-gray-500";
      textColor = "text-gray-700";
      title = "";
  }

  messageTitle.innerText = titleOverride || title;
  globalMessage.classList.add(bgColor, `border-l-4`, borderColor, textColor);
  messageText.innerText = text;
  globalMessage.classList.remove("hidden");

  // Auto-hide message after duration, unless it's a loading message
  if (type !== "loading") {
    setTimeout(() => globalMessage.classList.add("hidden"), duration);
  }

  // Close button event listener
  messageCloseBtn.onclick = () => globalMessage.classList.add("hidden");
};

/**
 * Displays an inline error message next to a specific input field.
 * @param {string} elementId - The ID of the input element.
 * @param {string} message - The error message to display.
 */
const displayInlineError = (elementId, message) => {
  const errorElement = document.getElementById(`${elementId}-error`);
  if (errorElement) {
    errorElement.innerText = message;
    errorElement.classList.remove("hidden");
  }
};

/**
 * Clears an inline error message for a specific input field.
 * @param {string} elementId - The ID of the input element.
 */
const clearInlineError = (elementId) => {
  const errorElement = document.getElementById(`${elementId}-error`);
  if (errorElement) {
    errorElement.innerText = "";
    errorElement.classList.add("hidden");
  }
};

/**
 * Clears all inline error messages within a given form or container.
 * @param {HTMLElement} containerElement - The container element (e.g., form) to clear errors from.
 */
const clearAllInlineErrors = (containerElement) => {
  containerElement.querySelectorAll(".input-error-message").forEach((el) => {
    el.innerText = "";
    el.classList.add("hidden");
  });
};

async function hashString(str) {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hexHash;
}

export {
  showMessage,
  hashString,
  displayInlineError,
  clearInlineError,
  clearAllInlineErrors,
};
