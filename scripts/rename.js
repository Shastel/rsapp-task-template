const readline = require('readline');
const { promisify } = require('util');
const fs = require('fs');
const cp = require('child_process');

const colors = require('colors');
const isValidNpmName = require('is-valid-npm-name');

const README_PATH = './README.md';
const PCG_JSON_PATH = './package.json';
const PCG_LOCK_PATH = './package-lock.json';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const equals = (a, b) => a === b;

function validateYesNo (answer) {
  const lowerCasedAnswer = answer.toLowerCase();

  return ['n', 'y', 'no', 'yes'].some((v => v === lowerCasedAnswer)) || 'Please enter one of: \'y\', \'yes\', \'n\', \'no\'\n';
}

function commit (answer) {
  if (['n', 'no'].some((v => v === answer))) {
    console.log('Done'.underline.green);
    return;
  }

  try {
    cp.execSync(`git add '${README_PATH}' '${PCG_JSON_PATH}' '${PCG_LOCK_PATH}'`, { stdio: 'inherit' });
    cp.execSync("git commit -m 'Update task name'", { stdio: 'inherit' });

  } catch (e) {
    return console.log('unexpected error'.underline.red);
  }

  console.log('Done'.underline.green);
}

function ask (question, validityCheck, onSuccess) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });


  rl.question(question, async (answer) => {
    rl.close();

    const validationResult = validityCheck(answer);

    if (true !== validationResult) {
      console.log(validationResult.underline.red);
      return ask(question, validityCheck, onSuccess);
    }

    onSuccess(answer);
  });
}

const taskNameRegExp = /<%TASK_NAME%>/g;

async function onName (taskName) {
    /* Update README.md */
    const readme = await readFile(README_PATH, 'utf8');

    const newReadMe = readme.replace(taskNameRegExp, taskName);

    await writeFile(README_PATH, newReadMe);

    /* Update package.json */
    const packageString = await readFile(PCG_JSON_PATH, 'utf8');
    const package = JSON.parse(packageString);

    package.name = taskName;

    await writeFile(PCG_JSON_PATH, JSON.stringify(package, null, 2));

    /* Update package-lock.json */
    /* 📓 For some reason lock file may not exist, but it is kind of ok */
    try {
      const packageString = await readFile(PCG_LOCK_PATH, 'utf8');
      const package = JSON.parse(packageString);

      package.name = taskName;

      await writeFile(PCG_LOCK_PATH, JSON.stringify(package, null, 2));
    } catch (e) {
      console.log('WARN: update of package-lock is failed'.yellow);
    }

    console.log(`Success, name of the task updated to: ${taskName}`.green);

    ask('Whould you like to commit the changes? (yes/no)\n', validateYesNo, commit);
}

ask('Entet name of the task, it should be a valid npm package name\n', isValidNpmName, onName);
