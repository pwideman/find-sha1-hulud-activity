import * as fs from 'fs';
import * as path from 'path';

const CSV_FILE_NAME = 'suspicious-activity.csv';

export function writeCsvToFile(csvContent: string, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const csvPath = path.join(outputDir, CSV_FILE_NAME);
  fs.writeFileSync(csvPath, csvContent);

  return csvPath;
}
