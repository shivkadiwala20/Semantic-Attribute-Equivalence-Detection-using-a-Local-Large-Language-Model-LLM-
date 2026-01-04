import levenshtein from "fast-levenshtein";

export function baselineGrouping(attributes, threshold = 3) {
  const groups = [];

  for (const attr of attributes) {
    let added = false;

    for (const group of groups) {
      if (levenshtein.get(attr, group[0]) <= threshold) {
        group.push(attr);
        added = true;
        break;
      }
    }

    if (!added) {
      groups.push([attr]);
    }
  }

  return { groups };
}
