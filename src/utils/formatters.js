/**
 * formatters.js — Display & Time Utilities
 * ─────────────────────────────────────────
 * Pure helper functions for formatting dates, durations,
 * and countdowns used across the platform.
 */

/**
 * Returns a human-readable countdown string for a future unlock date.
 * e.g. "2d 4h 30m"
 */
export const getTimeRemaining = (unlockAt) => {
  const diff = new Date(unlockAt) - new Date();
  if (diff <= 0) return 'Unlocked';

  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs  = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0)  return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0)  return `${mins}m ${secs}s`;
  return `${secs}s`;  // Final countdown — seconds only
};

/**
 * Formats a Date object or ISO string into a short HH:MM time label.
 */
export const formatTime = (dateString) =>
  new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Formats a Date object or ISO string into a full locale date+time string.
 */
export const formatDateTime = (dateString) =>
  new Date(dateString).toLocaleString();
