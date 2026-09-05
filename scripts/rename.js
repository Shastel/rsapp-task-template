const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readFile, writeFile, access } = require('node:fs/promises');
const { createInterface } = require('node:readline/promises');
const process = require('node:process');

const isValidNpmName = require('is-valid-npm-name');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(REPOSITORY_ROOT, 'README.md');
const PKG_JSON_PATH = path.join(REPOSITORY_ROOT, 'package.json');
const PKG_LOCK_PATH = path.join(REPOSITORY_ROOT, 'package-lock.json');

const equals = (a, b) => a === b;
const toLowerCase = (value) => value.trim().toLowerCase();
const isNoAnswer = (answer) => ['n', 'no'].some((value) => equals(value, answer));
const isYesAnswer = (answer) => ['y', 'yes'].some((value) => equals(value, answer));

function validateYesNo (answer) {
 const lowerCasedAnswer = toLowerCase(answer);

 return ['n', 'y', 'no', 'yes'].some((value) => equals(value, lowerCasedAnswer))
   || 'Please enter one of: \'y\', \'yes\', \'n\', \'no\'\n';
}

function commit (answer) {
 if (isNoAnswer(toLowerCase(answer))) {
   console.log('Done');
   return;
 }

 try {
   execFileSync(
     'git',
     ['-C', REPOSITORY_ROOT, 'add', README_PATH, PKG_JSON_PATH, PKG_LOCK_PATH],
     { stdio: 'inherit' }
   );
   execFileSync(
     'git',
     ['-C', REPOSITORY_ROOT, 'commit', '-m', 'Update task name'],
     { stdio: 'inherit' }
   );
 } catch (e) {
   console.error('Unexpected error');
   return;
 }

 console.log('Done');
}

async function ask (question, validityCheck) {
 const rl = createInterface({
   input: process.stdin,
   output: process.stdout
 });

 try {
   while (true) {
     const answer = await rl.question(question);
     const validationResult = validityCheck(answer);

     if (validationResult === true) {
       return answer;
     }

     console.error(validationResult);
   }
 } finally {
   rl.close();
 }
}

const taskNameRegExp = /<%TASK_NAME%>/g;

async function onName (taskName) {
 const readme = await readFile(README_PATH, 'utf8');
 const updatedReadme = readme.replace(taskNameRegExp, taskName);

 await writeFile(README_PATH, updatedReadme);

 const packageString = await readFile(PKG_JSON_PATH, 'utf8');
 const packageJson = JSON.parse(packageString);

 packageJson.name = taskName;

 await writeFile(PKG_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);

 try {
   await access(PKG_LOCK_PATH);

   const packageLockString = await readFile(PKG_LOCK_PATH, 'utf8');
   const packageLockJson = JSON.parse(packageLockString);

   packageLockJson.name = taskName;

   await writeFile(PKG_LOCK_PATH, `${JSON.stringify(packageLockJson, null, 2)}\n`);
 } catch (error) {
   console.warn('WARN: package-lock.json was not updated');
 }

 console.log(`Success, task name updated to: ${taskName}`);

 const commitAnswer = await ask('Would you like to commit the changes? (yes/no)\n', validateYesNo);

 if (isYesAnswer(toLowerCase(commitAnswer)) || isNoAnswer(toLowerCase(commitAnswer))) {
   commit(commitAnswer);
 }
}

async function main () {
 const taskName = await ask(
   'Enter the task name. It should be a valid npm package name.\n',
   isValidNpmName
 );

 await onName(taskName);
}

main().catch((error) => {
 console.error(error);
 process.exitCode = 1;
});
