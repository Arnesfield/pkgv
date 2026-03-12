import fs from 'fs';
import path from 'path';

// show help if no args
if (process.argv.length < 3) {
  console.error('error: missing arguments');
  process.exit(1);
}

interface DependencyMap {
  [name: string]: string;
}

interface PackageJson {
  name: string;
  version: string;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
}

async function loadPackageJson(filePath: string) {
  let resolvedPath = path.resolve(filePath);

  try {
    const stats = await fs.promises.stat(resolvedPath);
    if (stats.isDirectory()) {
      resolvedPath = path.resolve(resolvedPath, 'package.json');
    }

    const contents = await fs.promises.readFile(resolvedPath, 'utf8');
    const packageJson: PackageJson = JSON.parse(contents);

    if (
      packageJson &&
      typeof packageJson === 'object' &&
      !Array.isArray(packageJson) &&
      typeof packageJson.name === 'string' &&
      typeof packageJson.version === 'string'
    ) {
      return packageJson;
    }
  } catch (error) {
    console.error(Error.isError(error) ? error.message : error);
  }
}

(async () => {
  try {
    const cwdPackageJsonPath = path.resolve(process.cwd(), 'package.json');
    const cwdPackageJson = await loadPackageJson(cwdPackageJsonPath);
    if (!cwdPackageJson) {
      throw new Error('current working directory has no package.json');
    }

    const paths = process.argv.slice(2);
    const packageJsons: PackageJson[] = [];

    for (const filePath of paths) {
      const packageJson = await loadPackageJson(filePath);
      if (packageJson) {
        packageJsons.push(packageJson);
      }
    }

    if (packageJsons.length === 0) {
      throw new Error('no packages to apply');
    }

    let didUpdate = false;
    const types = ['dependencies', 'devDependencies'] as const;

    for (const type of types) {
      const updates: {
        name: string;
        currentVersion: string;
        newVersion: string;
      }[] = [];

      for (const packageJson of packageJsons) {
        const dependencies = cwdPackageJson[type];

        if (
          dependencies &&
          Object.prototype.hasOwnProperty.call(
            dependencies,
            packageJson.name
          ) &&
          typeof dependencies[packageJson.name] === 'string'
        ) {
          // NOTE: only handle ^ and ~ for now
          const currentVersion = dependencies[packageJson.name];
          const prefix =
            currentVersion.startsWith('^') || currentVersion.startsWith('~')
              ? currentVersion.slice(0, 1)
              : '';
          const newVersion = prefix + packageJson.version;

          if (currentVersion !== newVersion) {
            didUpdate = true;
            dependencies[packageJson.name] = newVersion;
            updates.push({
              name: packageJson.name,
              currentVersion,
              newVersion
            });
          }
        }
      }

      if (updates.length > 0) {
        console.log('%s:', type);

        for (const update of updates) {
          console.log(
            '  %s: %s -> %s',
            update.name,
            update.currentVersion,
            update.newVersion
          );
        }
      }
    }

    if (didUpdate) {
      await fs.promises.writeFile(
        cwdPackageJsonPath,
        JSON.stringify(cwdPackageJson, undefined, 2) + '\n'
      );
      console.log('\ndone: updated package.json');
    } else {
      console.log('done: no package version updates');
    }
  } catch (error) {
    process.exitCode = 1;
    console.error(Error.isError(error) ? error.message : error);
  }
})();
