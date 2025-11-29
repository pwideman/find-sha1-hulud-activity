import * as fs from 'fs';
import * as path from 'path';

export function writeCsvToFile(csvContent: string, outputDir: string, org: string): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const csvFileName = `suspicious-activity-${org}.csv`;
  const csvPath = path.join(outputDir, csvFileName);
  fs.writeFileSync(csvPath, csvContent);

  return csvPath;
}
