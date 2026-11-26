import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
    // Wiring only, no logic to unit test (covered by e2e instead)
    '!**/*.module.ts',
    '!src/main.ts',
    '!src/app.setup.ts',
    // TypeORM CLI entry point and generated SQL, run by the migration scripts
    '!src/configs/typeorm/data-source.ts',
    '!src/migrations/**',
    // Barrel files that only re-export
    '!**/index.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
