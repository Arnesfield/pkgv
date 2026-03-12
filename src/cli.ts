import fs from 'fs';
import path from 'path';

function help(): never {
  console.log(
    `Options
  -n, --dry-run  dry run
  -p, --prefix   set the version prefix`
  );
  process.exit(0);
}

// show help if no args
if (process.argv.length < 3) {
  help();
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

interface ParsedArgs {
  dryRun: boolean;
  prefix?: string | null;
  paths: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { dryRun: false, paths: [] };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        help();
        break;

      case '-n':
      case '--dry-run':
        parsed.dryRun = true;
        break;

      case '-p':
      case '--prefix':
        parsed.prefix = i + 1 < argv.length ? argv[++i] : null;
        break;

      default:
        parsed.paths.push(arg);
        break;
    }
  }

  if (parsed.prefix === null) {
    throw new Error("option '-p, --prefix' requires an argument");
  }

  return parsed;
}

(async () => {
  try {
    const cwdPackageJsonPath = path.resolve(process.cwd(), 'package.json');
    const cwdPackageJson = await loadPackageJson(cwdPackageJsonPath);
    if (!cwdPackageJson) {
      throw new Error('current working directory has no package.json');
    }

    const parsed = parseArgs(process.argv);
    const packageJsons: PackageJson[] = [];

    for (const filePath of parsed.paths) {
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
        changed: boolean;
        currentVersion: string;
        newVersion: string;
      }[] = [];
      let changeCount = 0;

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
            parsed.prefix ??
            (currentVersion.startsWith('^') || currentVersion.startsWith('~')
              ? currentVersion.slice(0, 1)
              : '');
          const newVersion = prefix + packageJson.version;
          const changed = currentVersion !== newVersion;

          if (changed) {
            changeCount++;
            didUpdate = true;
            dependencies[packageJson.name] = newVersion;
          }

          updates.push({
            name: packageJson.name,
            changed,
            currentVersion,
            newVersion
          });
        }
      }

      if (updates.length > 0) {
        console.log('%s (%d/%d):', type, changeCount, updates.length);

        for (const update of updates) {
          console.log(
            '  [%s] %s: %s -> %s',
            update.changed ? '✓' : ' ',
            update.name,
            update.currentVersion,
            update.newVersion
          );
        }
      }
    }

    if (!didUpdate) {
      console.log('\ndone: no package version updates');
    } else if (parsed.dryRun) {
      console.log('\ndone: skipping package.json update (dry run)');
    } else {
      await fs.promises.writeFile(
        cwdPackageJsonPath,
        JSON.stringify(cwdPackageJson, undefined, 2) + '\n'
      );
      console.log('\ndone: updated package.json');
    }
  } catch (error) {
    process.exitCode = 1;
    console.error(Error.isError(error) ? error.message : error);
  }
})();
