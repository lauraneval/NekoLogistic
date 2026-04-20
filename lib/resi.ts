import { randomBytes } from "node:crypto";

function randomCode(length = 4) {
  return randomBytes(length).toString("hex").slice(0, length).toUpperCase();
}

export function makeResi() {
  const year = new Date().getFullYear();
  return `NEKO-${year}-${randomCode(4)}`;
}

export function makeBagCode() {
  const year = new Date().getFullYear();
  return `BAG-${year}-${randomCode(4)}`;
}
