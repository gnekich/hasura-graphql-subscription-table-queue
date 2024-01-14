// Create delay from promises
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default delay;
