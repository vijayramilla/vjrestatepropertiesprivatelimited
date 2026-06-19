import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoDir = join(projectRoot, '.tmp-ui-ux-skill');
const assetsDir = join(repoDir, 'cli', 'assets');
const skillDir = join(projectRoot, '.cursor', 'skills', 'ui-ux-pro-max');

const config = JSON.parse(
  await readFile(join(assetsDir, 'templates', 'platforms', 'cursor.json'), 'utf8'),
);
let content = await readFile(join(assetsDir, 'templates', 'base', 'skill-content.md'), 'utf8');

content = content
  .replace(/\{\{TITLE\}\}/g, config.title)
  .replace(/\{\{DESCRIPTION\}\}/g, config.description)
  .replace(/\{\{SCRIPT_PATH\}\}/g, config.scriptPath)
  .replace(/\{\{SKILL_OR_WORKFLOW\}\}/g, config.skillOrWorkflow)
  .replace(/\{\{QUICK_REFERENCE\}\}/g, '');

const fm = config.frontmatter;
const frontmatter = `---\nname: ${fm.name}\ndescription: "${fm.description.replace(/"/g, '\\"')}"\n---\n\n`;

await rm(skillDir, { recursive: true, force: true });
await mkdir(skillDir, { recursive: true });
await cp(join(assetsDir, 'data'), join(skillDir, 'data'), { recursive: true });
await cp(join(assetsDir, 'scripts'), join(skillDir, 'scripts'), { recursive: true });
await writeFile(join(skillDir, 'SKILL.md'), frontmatter + content, 'utf8');

console.log('Installed ui-ux-pro-max skill to', skillDir);
