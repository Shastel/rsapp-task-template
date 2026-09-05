const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { readFile, writeFile } = require('node:fs/promises');
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
   const filesToCommit = [README_PATH, PKG_JSON_PATH];

   if (existsSync(PKG_LOCK_PATH)) {
     filesToCommit.push(PKG_LOCK_PATH);
   }

   execFileSync(
     'git',
     ['-C', REPOSITORY_ROOT, 'add', ...filesToCommit],
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

function updatePackageName (packageJson, taskName) {
  packageJson.name = taskName;
}

function updatePackageLockName (packageLockJson, taskName) {
  if ('name' in packageLockJson) {
    packageLockJson.name = taskName;
  }

  if (packageLockJson.packages && packageLockJson.packages[''] && 'name' in packageLockJson.packages['']) {
    packageLockJson.packages[''].name = taskName;
  }
}

async function onName (taskName) {
 const readme = await readFile(README_PATH, 'utf8');
 const updatedReadme = readme.replace(taskNameRegExp, taskName);

 await writeFile(README_PATH, updatedReadme);

 const packageString = await readFile(PKG_JSON_PATH, 'utf8');
 const packageJson = JSON.parse(packageString);

 updatePackageName(packageJson, taskName);

 await writeFile(PKG_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);

 try {
   const packageLockString = await readFile(PKG_LOCK_PATH, 'utf8');
   const packageLockJson = JSON.parse(packageLockString);

   updatePackageLockName(packageLockJson, taskName);

   await writeFile(PKG_LOCK_PATH, `${JSON.stringify(packageLockJson, null, 2)}\n`);
 } catch (error) {
   if (error.code !== 'ENOENT') {
     throw error;
   }

   console.warn('WARN: package-lock.json was not updated');
 }

 console.log(`Success, task name updated to: ${taskName}`);

 const commitAnswer = await ask('Would you like to commit the changes? (yes/no)\n', validateYesNo);

 commit(commitAnswer);
}

async function main () {
 const taskName = await ask(
   'Enter the task name. It should be a valid npm package name.\n',
   isValidNpmName
 );

 await onName(taskName);
}

module.exports = {
 updatePackageLockName,
 updatePackageName,
 validateYesNo
};

if (require.main === module) {
 main().catch((error) => {
   console.error(error);
   process.exitCode = 1;
 });
}
