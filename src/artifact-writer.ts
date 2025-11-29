import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ARTIFACT_DIR_NAME = 'sha1-hulud-artifacts';
const ARTIFACT_FILE_NAME = 'suspicious-activity.csv';

export function writeCsvToFile(csvContent: string): string {
  const artifactDir = path.join(process.env.RUNNER_TEMP || os.tmpdir(), ARTIFACT_DIR_NAME);
  fs.mkdirSync(artifactDir, { recursive: true });

  const csvPath = path.join(artifactDir, ARTIFACT_FILE_NAME);
  fs.writeFileSync(csvPath, csvContent);

  return csvPath;
}
