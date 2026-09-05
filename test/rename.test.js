const test = require('node:test');
const assert = require('node:assert/strict');

const {
  updatePackageLockName,
  updatePackageName,
  validateYesNo
} = require('../scripts/rename');

test('validateYesNo accepts supported answers', () => {
  assert.equal(validateYesNo('yes'), true);
  assert.equal(validateYesNo('No'), true);
});

test('validateYesNo rejects unsupported answers', () => {
  assert.match(validateYesNo('maybe'), /Please enter one of/);
});

test('updatePackageName updates the package name field', () => {
  const packageJson = { name: 'old-name' };

  updatePackageName(packageJson, 'new-name');

  assert.equal(packageJson.name, 'new-name');
});

test('updatePackageLockName updates v1-style lockfiles', () => {
  const packageLockJson = { name: 'old-name', lockfileVersion: 1 };

  updatePackageLockName(packageLockJson, 'new-name');

  assert.equal(packageLockJson.name, 'new-name');
});

test('updatePackageLockName updates v3 root package metadata', () => {
  const packageLockJson = {
    name: 'old-name',
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'old-name'
      }
    }
  };

  updatePackageLockName(packageLockJson, 'new-name');

  assert.equal(packageLockJson.name, 'new-name');
  assert.equal(packageLockJson.packages[''].name, 'new-name');
});
