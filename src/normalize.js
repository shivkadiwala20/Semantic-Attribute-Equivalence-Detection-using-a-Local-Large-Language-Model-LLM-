export function normalizeAttributes(attributes) {
  return attributes.map((attr) =>
    attr.toLowerCase().trim().replace(/[_\-]/g, "")
  );
}
