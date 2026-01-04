import fs from "fs";
import csv from "csv-parser";

export function extractAttributesFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers) => {
        resolve(headers);
      })
      .on("error", (err) => reject(err));
  });
}
