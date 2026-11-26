import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Same as jest.config.ts: path aliases (@config/*, @modules/*, ...) are read
// from tsconfig.json so they are not duplicated here. Run from the project root.
interface TsConfigFile {
	compilerOptions?: { paths?: Record<string, string[]> };
}

const { config } = ts.readConfigFile('./tsconfig.json', ts.sys.readFile) as {
	config?: TsConfigFile;
};
const paths = config?.compilerOptions?.paths ?? {};

const jestConfig: Config = {
	moduleFileExtensions: ['js', 'json', 'ts'],
	rootDir: '..',
	roots: ['<rootDir>/test'],
	testRegex: '.e2e-spec.ts$',
	transform: {
		'^.+\\.(t|j)s$': 'ts-jest',
	},
	moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
	testEnvironment: 'node',
};

export default jestConfig;
